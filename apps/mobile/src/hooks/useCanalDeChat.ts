import { useCallback, useEffect, useRef, useState } from 'react';
import {
  REALTIME_SUBSCRIBE_STATES,
  type RealtimeChannel,
} from '@supabase/supabase-js';
import {
  MILISEGUNDOS_INDICADOR_ESCRIBIENDO,
  type EstadoMensaje,
  type Mensaje,
  type TipoMensaje,
} from '@foodhub/shared';
import { obtenerToken, supabase } from '../lib/supabase';

/**
 * Tiempo real de una conversación (US-MSG-02 y US-MSG-05).
 *
 * POR QUÉ ESTE MÓDULO USA REALTIME Y EL DE PEDIDOS NO
 *
 * El seguimiento del pedido se resolvió con revalidación periódica de React
 * Query (ver `usePedidos`), para no abrir políticas de lectura directa sobre la
 * base. Un pedido cambia de estado cuatro veces en veinte minutos y diez
 * segundos de retraso no cambian ninguna decisión del usuario.
 *
 * El chat es lo contrario: tres criterios de aceptación exigen "en tiempo real"
 * y uno de ellos —"Escribiendo..."— es irrealizable con polling, porque tiene
 * que aparecer y desaparecer en menos de tres segundos. Por eso el equipo
 * decidió (2026-08-21) habilitar Realtime sólo para las dos tablas de
 * mensajería, con las políticas RLS de la migración 0011.
 *
 * DOS CANALES Y NO UNO, A PROPÓSITO
 *
 *   `mensajes:<id>`  canal normal. Sólo `postgres_changes`, que se autoriza con
 *                    la política RLS de la tabla `mensaje`: cada suscriptor
 *                    recibe únicamente las filas de sus propias conversaciones.
 *   `chat:<id>`      canal PRIVADO. Presencia y "Escribiendo...", que no tocan
 *                    ninguna tabla: son efímeros por definición y persistirlos
 *                    ensuciaría la base con estado que caduca en tres segundos.
 *
 * Separarlos es lo que hace que el chat siga funcionando si las políticas sobre
 * `realtime.messages` no llegaron a aplicarse (la migración 0011 lo contempla y
 * avisa): se pierden el "en línea" y el "Escribiendo...", pero los mensajes y
 * el "Leído" siguen llegando al instante. En un solo canal privado, un fallo de
 * autorización tumbaría también los mensajes.
 */

/** Nombre de la fila tal como llega de Postgres: snake_case, sin traducir. */
interface FilaCruda {
  id: string;
  conversacion_id: string;
  remitente_id: string;
  tipo: TipoMensaje;
  estado_mensaje: EstadoMensaje;
  contenido: string | null;
  imagen_url: string | null;
  pie_de_imagen: string | null;
  fecha_envio: string;
}

/**
 * Traduce la fila de la base al contrato de `@foodhub/shared`.
 *
 * Realtime entrega la fila CRUDA, con los nombres de columna de PostgreSQL: no
 * pasa por Drizzle ni por la API, que son los que hacen el mapeo a camelCase en
 * el resto de la app. La fecha se normaliza a ISO con `Z` porque Postgres la
 * emite con offset (`+00:00`) y el contrato la declara en UTC.
 */
function aMensaje(fila: FilaCruda): Mensaje {
  return {
    id: fila.id,
    conversacionId: fila.conversacion_id,
    remitenteId: fila.remitente_id,
    tipo: fila.tipo,
    estado: fila.estado_mensaje,
    contenido: fila.contenido,
    imagenUrl: fila.imagen_url,
    pieDeImagen: fila.pie_de_imagen,
    fechaEnvio: new Date(fila.fecha_envio).toISOString(),
  };
}

/**
 * Realtime evalúa las políticas RLS con el JWT del usuario, no con la clave
 * anónima: sin este token, la suscripción se conecta pero no recibe ninguna
 * fila. supabase-js lo propaga solo al cambiar la sesión, y acá la sesión ya
 * estaba abierta desde antes de montar la pantalla.
 */
async function autenticarRealtime(): Promise<boolean> {
  const token = await obtenerToken();
  if (!token) return false;
  await supabase.realtime.setAuth(token);
  return true;
}

/**
 * Cada cuánto, como máximo, se avisa que el usuario está escribiendo.
 *
 * Sin esta pausa se emitiría un evento por tecla: treinta mensajes de broadcast
 * para escribir una frase, todos con el mismo contenido. Es más corto que los
 * tres segundos del indicador para que, mientras alguien escribe sin parar, el
 * aviso siguiente llegue siempre antes de que el anterior expire.
 */
const PAUSA_ENTRE_AVISOS_MS = 1500;

const EVENTO_ESCRIBIENDO = 'escribiendo';

interface Manejadores {
  /** Un mensaje nuevo entró en la conversación (propio o del interlocutor). */
  onMensajeNuevo: (mensaje: Mensaje) => void;
  /** Un mensaje cambió de estado: ENVIADO → ENTREGADO → LEIDO. */
  onMensajeActualizado: (mensaje: Mensaje) => void;
}

/**
 * Guarda la versión vigente de unos callbacks sin que el efecto que los usa
 * dependa de ellos.
 *
 * La pantalla los redefine en cada render —cierran sobre el estado del
 * historial—, y si los efectos dependieran de ellos se desuscribirían y
 * volverían a suscribirse al canal en cada tecla que el usuario escribe.
 */
function useUltimos<T>(valor: T) {
  const referencia = useRef(valor);
  useEffect(() => {
    referencia.current = valor;
  });
  return referencia;
}

/** Mensajes nuevos y cambios de estado, por `postgres_changes`. */
function useMensajesEnVivo(entrada: {
  conversacionId: string;
  miId: string;
  manejadores: Manejadores;
  onDejaDeEscribir: () => void;
}) {
  const { conversacionId, miId } = entrada;
  const manejadores = useUltimos(entrada.manejadores);
  const dejaDeEscribir = useUltimos(entrada.onDejaDeEscribir);

  useEffect(() => {
    let cancelado = false;
    let canal: RealtimeChannel | null = null;

    const suscribir = async () => {
      if (!(await autenticarRealtime()) || cancelado) return;

      /**
       * El `filter` acota del lado del servidor: sin él, Realtime evaluaría la
       * política RLS contra CADA mensaje de la plataforma para decidir si este
       * suscriptor puede verlo. La política sigue siendo la que decide —el
       * filtro no es el control de acceso—, pero le ahorra el trabajo.
       */
      const filtro = `conversacion_id=eq.${conversacionId}`;
      const tabla = { schema: 'public', table: 'mensaje', filter: filtro };

      canal = supabase
        .channel(`mensajes:${conversacionId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', ...tabla },
          ({ new: fila }) => {
            const cruda = fila as FilaCruda;
            manejadores.current.onMensajeNuevo(aMensaje(cruda));
            /**
             * US-MSG-05: el indicador desaparece "cuando el interlocutor envíe el
             * mensaje", sin esperar los tres segundos.
             */
            if (cruda.remitente_id !== miId) dejaDeEscribir.current();
          },
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', ...tabla },
          ({ new: fila }) => {
            manejadores.current.onMensajeActualizado(
              aMensaje(fila as FilaCruda),
            );
          },
        );

      canal.subscribe();
    };

    void suscribir();

    return () => {
      cancelado = true;
      if (canal) void supabase.removeChannel(canal);
    };
  }, [conversacionId, dejaDeEscribir, manejadores, miId]);
}

/** Presencia y "Escribiendo...", por canal privado de broadcast. */
function usePresenciaYEscritura(entrada: {
  conversacionId: string;
  miId: string;
  interlocutorId: string;
}) {
  const { conversacionId, miId, interlocutorId } = entrada;
  const [enLinea, setEnLinea] = useState(false);
  const [escribiendo, setEscribiendo] = useState(false);

  const canalPrivado = useRef<RealtimeChannel | null>(null);
  const ultimoAviso = useRef(0);
  const apagar = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelado = false;
    let canal: RealtimeChannel | null = null;

    const suscribir = async () => {
      if (!(await autenticarRealtime()) || cancelado) return;

      canal = supabase.channel(`chat:${conversacionId}`, {
        config: {
          private: true,
          // La clave de presencia es el id del usuario: así el estado del canal
          // tiene una entrada por persona y no una por reconexión.
          presence: { key: miId },
          // Sin esto el propio aviso de "escribiendo" volvería de rebote y la
          // pantalla se mostraría a sí misma el indicador.
          broadcast: { self: false },
        },
      });

      canal
        .on('presence', { event: 'sync' }, () => {
          const estado = canal?.presenceState() ?? {};
          setEnLinea(Object.keys(estado).includes(interlocutorId));
        })
        .on('broadcast', { event: EVENTO_ESCRIBIENDO }, () => {
          setEscribiendo(true);
          if (apagar.current) clearTimeout(apagar.current);
          apagar.current = setTimeout(() => {
            setEscribiendo(false);
          }, MILISEGUNDOS_INDICADOR_ESCRIBIENDO);
        })
        .subscribe((estado) => {
          /**
           * `track` sólo vale una vez suscrito. Un fallo de autorización
           * —políticas de `realtime.messages` sin aplicar— deja este canal caído
           * y la cabecera sin "en línea", pero no afecta a los mensajes: viajan
           * por el otro canal.
           */
          if (estado === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
            void canal?.track({ usuarioId: miId });
          }
        });

      canalPrivado.current = canal;
    };

    void suscribir();

    return () => {
      cancelado = true;
      canalPrivado.current = null;
      if (apagar.current) clearTimeout(apagar.current);
      setEnLinea(false);
      setEscribiendo(false);
      if (canal) void supabase.removeChannel(canal);
    };
  }, [conversacionId, interlocutorId, miId]);

  const avisarQueEscribo = useCallback(() => {
    const ahora = Date.now();
    if (ahora - ultimoAviso.current < PAUSA_ENTRE_AVISOS_MS) return;
    ultimoAviso.current = ahora;

    void canalPrivado.current?.send({
      type: 'broadcast',
      event: EVENTO_ESCRIBIENDO,
      payload: { usuarioId: miId },
    });
  }, [miId]);

  const dejarDeEscribir = useCallback(() => {
    setEscribiendo(false);
  }, []);

  return { enLinea, escribiendo, avisarQueEscribo, dejarDeEscribir };
}

interface Canal {
  /** US-MSG-01 · "en línea" de la cabecera, mientras el otro tenga el chat abierto. */
  interlocutorEnLinea: boolean;
  /** US-MSG-05 · "Escribiendo...", que se apaga solo a los tres segundos. */
  interlocutorEscribiendo: boolean;
  /** La llama el campo de entrada en cada pulsación. Ya viene con pausa. */
  avisarQueEscribo: () => void;
}

export function useCanalDeChat(
  entrada: {
    conversacionId: string;
    /** Id del usuario de la sesión, para no reaccionar a los eventos propios. */
    miId: string;
    interlocutorId: string;
  } & Manejadores,
): Canal {
  const { conversacionId, miId, interlocutorId } = entrada;

  const presencia = usePresenciaYEscritura({
    conversacionId,
    miId,
    interlocutorId,
  });

  useMensajesEnVivo({
    conversacionId,
    miId,
    manejadores: {
      onMensajeNuevo: entrada.onMensajeNuevo,
      onMensajeActualizado: entrada.onMensajeActualizado,
    },
    onDejaDeEscribir: presencia.dejarDeEscribir,
  });

  return {
    interlocutorEnLinea: presencia.enLinea,
    interlocutorEscribiendo: presencia.escribiendo,
    avisarQueEscribo: presencia.avisarQueEscribo,
  };
}
