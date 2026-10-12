import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { acusarEntrega } from '../api/mensajeria';
import { obtenerToken, supabase } from '../lib/supabase';
import { invalidarListados } from './useMensajeria';
import { useSesion } from './useSesion';

/**
 * US-MSG-02 · Acuse de entrega global: ENVIADO → ENTREGADO.
 *
 * POR QUÉ ESTO NO VIVE EN LA PANTALLA DE CONVERSACIÓN
 *
 * "Entregado" significa que el mensaje llegó al dispositivo del destinatario. Si
 * el acuse lo mandara la pantalla del chat, el estado no existiría nunca: quien
 * tiene esa pantalla abierta marca el mensaje como LEÍDO en el mismo instante,
 * que es un estado posterior. El único momento en que "entregado" es la verdad
 * es cuando la app está abierta pero el usuario NO está en esa conversación.
 *
 * Por eso se monta en el layout de pestañas: una suscripción por sesión, viva
 * mientras la app lo esté, escuchando la tabla `mensaje` SIN filtro. No hace
 * falta acotar por conversación porque la política RLS de la migración 0011 ya
 * lo hace: cada suscriptor sólo recibe las filas de sus propios hilos.
 *
 * De paso resuelve la insignia de no leídos de la pestaña "Mensajes", que se
 * refresca sin que ninguna pantalla del módulo esté montada.
 */

/**
 * Cuánto se esperan más mensajes antes de mandar el acuse.
 *
 * Al volver de un rato sin conexión pueden llegar varios INSERT casi juntos. Con
 * esta pausa salen en un solo POST en lugar de uno por mensaje, que es
 * exactamente lo que el endpoint en lote está para evitar.
 */
const PAUSA_DE_AGRUPADO_MS = 800;

interface FilaCruda {
  id: string;
  remitente_id: string;
  estado_mensaje: string;
}

export function useAcuseDeEntrega(): void {
  const sesion = useSesion((estado) => estado.sesion);
  const cliente = useQueryClient();
  const miId = sesion?.user.id;

  const porAcusar = useRef<string[]>([]);
  const envioPendiente = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!miId) return;

    let cancelado = false;
    let canal: RealtimeChannel | null = null;

    const despachar = () => {
      envioPendiente.current = null;
      const ids = porAcusar.current;
      porAcusar.current = [];
      if (ids.length === 0) return;

      /**
       * Un acuse que falla no se reintenta ni se le muestra al usuario: es
       * información accesoria sobre el estado de UN mensaje del OTRO lado. El
       * mensaje ya está en la base y se va a marcar como leído en cuanto abran
       * la conversación, que es el estado que de verdad importa.
       */
      void acusarEntrega(ids).catch(() => undefined);
    };

    const encolar = (mensajeId: string) => {
      porAcusar.current.push(mensajeId);
      if (envioPendiente.current) return;
      envioPendiente.current = setTimeout(despachar, PAUSA_DE_AGRUPADO_MS);
    };

    const suscribir = async () => {
      const token = await obtenerToken();
      if (cancelado || !token) return;
      await supabase.realtime.setAuth(token);
      if (cancelado) return;

      const topic = `mensajes-entrantes-${miId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      canal = supabase
        .channel(topic)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'mensaje' },
          ({ new: fila }) => {
            const mensaje = fila as FilaCruda;
            if (mensaje.remitente_id === miId) return;

            invalidarListados(cliente);
            if (mensaje.estado_mensaje === 'ENVIADO') encolar(mensaje.id);
          },
        );

      canal.subscribe();
    };

    void suscribir();

    return () => {
      cancelado = true;
      if (envioPendiente.current) clearTimeout(envioPendiente.current);
      envioPendiente.current = null;
      if (canal) void supabase.removeChannel(canal);
    };
  }, [cliente, miId]);
}
