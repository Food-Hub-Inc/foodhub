import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import type { Mensaje } from '@foodhub/shared';
import { listarMensajes } from '../api/mensajeria';
import {
  agregar,
  aplanar,
  cursorAnterior,
  reemplazar,
  type HistorialEnCache,
} from './historialEnCache';
import { useCanalDeChat } from './useCanalDeChat';
import { useEnvioDeMensajes, type Borrador } from './useEnvioDeMensajes';
import {
  claveMensajes,
  invalidarListados,
  useMarcarLeidos,
} from './useMensajeria';

/**
 * US-MSG-05 · "Marque automáticamente todos los mensajes recibidos como leídos
 * al momento de ingresar y actualice el contador del listado a 0."
 *
 * Se dispara UNA vez por conversación, al entrar. Que no dependa de si hay no
 * leídos es deliberado: el contador puede estar desactualizado en la caché, y el
 * endpoint es idempotente —sobre una conversación ya leída no toca nada.
 */
function useMarcarAlEntrar(
  conversacionId: string,
  marcar: (conversacionId: string) => void,
): void {
  const yaMarcada = useRef<string | null>(null);

  useEffect(() => {
    if (yaMarcada.current === conversacionId) return;
    yaMarcada.current = conversacionId;
    marcar(conversacionId);
  }, [conversacionId, marcar]);
}

/**
 * Escribe en la caché del historial un mensaje que llegó por fuera de la
 * consulta: por Realtime, o como respuesta del POST de envío.
 *
 * La transformación en sí es pura y vive en `historialEnCache`; esto sólo la
 * ata a la clave de esta conversación.
 */
function useEscrituraEnCache(conversacionId: string) {
  const cliente = useQueryClient();

  return useCallback(
    (mensaje: Mensaje, como: 'nuevo' | 'actualizado') => {
      cliente.setQueryData<HistorialEnCache>(
        claveMensajes(conversacionId),
        (viejo) =>
          como === 'nuevo'
            ? agregar(viejo, mensaje)
            : reemplazar(viejo, mensaje),
      );
    },
    [cliente, conversacionId],
  );
}

/**
 * Todo lo que necesita PAN-MSG-02 (US-MSG-02, US-MSG-03 y US-MSG-05).
 *
 * Compone tres piezas que se escribieron por separado a propósito, porque
 * resuelven problemas distintos y ninguna necesita conocer a las otras:
 *
 *   `useInfiniteQuery`   el historial paginado hacia atrás (US-MSG-05).
 *   `useCanalDeChat`     lo que llega en tiempo real (US-MSG-02, US-MSG-05).
 *   `useEnvioDeMensajes` la cola de salida con "Enviando" y reintento
 *                        (US-MSG-02, US-MSG-03).
 *
 * Lo que este hook agrega es el PEGAMENTO: escribir en la caché lo que trae
 * Realtime, y marcar como leído lo que llega mientras la pantalla está abierta.
 */
export function useChat(entrada: {
  conversacionId: string;
  miId: string;
  interlocutorId: string;
}) {
  const { conversacionId, miId, interlocutorId } = entrada;
  const cliente = useQueryClient();
  const marcarLeidos = useMarcarLeidos();

  const historial = useInfiniteQuery({
    queryKey: claveMensajes(conversacionId),
    queryFn: ({ pageParam }) =>
      listarMensajes({ conversacionId, antesDe: pageParam ?? undefined }),
    initialPageParam: null as string | null,
    getNextPageParam: cursorAnterior,
  });

  const escribirEnCache = useEscrituraEnCache(conversacionId);

  /**
   * `mutate` de React Query es estable entre renders, pero el objeto que lo
   * contiene no: se guarda la función suelta para que los callbacks de Realtime
   * no cambien de identidad en cada render.
   */
  const marcar = marcarLeidos.mutate;

  const onMensajeNuevo = useCallback(
    (mensaje: Mensaje) => {
      escribirEnCache(mensaje, 'nuevo');
      invalidarListados(cliente);

      /**
       * US-MSG-05: los mensajes recibidos se marcan como leídos "al momento de
       * ingresar" a la conversación. Si llega uno mientras la pantalla sigue
       * abierta, el criterio vale igual: el usuario lo está viendo.
       */
      if (mensaje.remitenteId !== miId) marcar(conversacionId);
    },
    [cliente, conversacionId, escribirEnCache, marcar, miId],
  );

  const onMensajeActualizado = useCallback(
    (mensaje: Mensaje) => {
      escribirEnCache(mensaje, 'actualizado');
    },
    [escribirEnCache],
  );

  const canal = useCanalDeChat({
    conversacionId,
    miId,
    interlocutorId,
    onMensajeNuevo,
    onMensajeActualizado,
  });

  const envio = useEnvioDeMensajes({
    conversacionId,
    /**
     * El mensaje propio también se escribe en la caché desde acá y no sólo
     * desde Realtime: la respuesta del POST llega antes que la réplica del
     * INSERT, y esperar la segunda dejaría la burbuja en "Enviando" durante
     * ese hueco. `agregar` descarta el duplicado cuando llega la réplica.
     */
    onConfirmado: (mensaje) => {
      escribirEnCache(mensaje, 'nuevo');
      invalidarListados(cliente);
    },
  });

  useMarcarAlEntrar(conversacionId, marcar);

  const mensajes = useMemo(() => aplanar(historial.data), [historial.data]);

  return {
    mensajes,
    pendientes: envio.pendientes,
    enviar: (borrador: Borrador) => {
      envio.enviar(borrador);
    },
    reintentar: envio.reintentar,

    cargando: historial.isPending,
    error: historial.error,
    reintentarCarga: () => {
      void historial.refetch();
    },

    /** US-MSG-05 · scroll hacia arriba: bloques adicionales de 50 en 50. */
    hayMasAntiguos: historial.hasNextPage,
    cargandoAntiguos: historial.isFetchingNextPage,
    cargarMasAntiguos: () => {
      if (historial.hasNextPage && !historial.isFetchingNextPage) {
        void historial.fetchNextPage();
      }
    },

    interlocutorEnLinea: canal.interlocutorEnLinea,
    interlocutorEscribiendo: canal.interlocutorEscribiendo,
    avisarQueEscribo: canal.avisarQueEscribo,
  };
}

export type { Borrador, MensajePendiente } from './useEnvioDeMensajes';
