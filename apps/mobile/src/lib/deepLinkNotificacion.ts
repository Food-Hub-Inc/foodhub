import type { Href } from 'expo-router';
import type { TipoNotificacion } from '@foodhub/shared';

/**
 * US-NOT-01/02/06/07 - A qué pantalla lleva tocar una notificación.
 *
 * El servidor manda `tipoNotificacion` + `objetoAfectadoId` (un pedido, una
 * conversación o una publicación, según el tipo); acá se traduce a una ruta de
 * expo-router. Se usa al tocar una tarjeta de PAN-NOT-01 y al tocar el push
 * desde la bandeja del sistema (`useNotificacionesPush`).
 *
 * US-NOT-03 (eliminación por admin) y US-NOT-04 (aviso del sistema) todavía no
 * se emiten y caen al historial, igual que cualquier notificación sin
 * `objetoAfectadoId`.
 */
export function deepLinkDeNotificacion(
  tipo: TipoNotificacion,
  objetoAfectadoId: string | null,
): Href {
  // US-NOT-05: a "Mis reseñas" (PAN-RES-02). No lleva `objetoAfectadoId` en la
  // ruta: la pantalla resuelve el cocinero de la sesión y todavía no admite
  // posicionarse en una reseña puntual.
  if (tipo === 'RESENA_RECIBIDA') return '/resenas/mis-resenas';

  if (!objetoAfectadoId) return '/notificaciones';

  if (tipo === 'MENSAJE_NUEVO') {
    return {
      pathname: '/mensajes/[conversacionId]',
      params: { conversacionId: objetoAfectadoId },
    };
  }

  if (tipo === 'PUBLICACION_COCINERO_FAVORITO') {
    return { pathname: '/platos/[id]', params: { id: objetoAfectadoId } };
  }

  if (tipo.startsWith('PEDIDO_')) {
    return {
      pathname: '/pedidos/[id]/detalle',
      params: { id: objetoAfectadoId },
    };
  }

  // PUBLICACION_ELIMINADA_ADMIN, AVISO_SISTEMA (US-NOT-03/04).
  return '/notificaciones';
}
