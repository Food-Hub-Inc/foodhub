import type { Href } from 'expo-router';
import type { TipoNotificacion } from '@foodhub/shared';

/**
 * US-NOT-01 a US-NOT-07 - A qué pantalla lleva tocar una notificación.
 *
 * El servidor manda `tipoNotificacion` + `objetoAfectadoId` (un pedido, una
 * conversación o una publicación, según el tipo) y el id de la propia
 * notificación; acá se traduce a una ruta de expo-router. Se usa al tocar una
 * tarjeta de PAN-NOT-01 y al tocar el push desde la bandeja del sistema
 * (`useNotificacionesPush`).
 */
export function deepLinkDeNotificacion(
  tipo: TipoNotificacion,
  objetoAfectadoId: string | null,
  notificacionId: string | null,
): Href {
  // US-NOT-04: "a la pantalla de detalle del aviso" (PAN-NOT-03). También los
  // avisos de la moderación de reseñas (RF086), que viajan con este tipo.
  if (tipo === 'AVISO_SISTEMA') {
    return notificacionId
      ? { pathname: '/notificaciones/[id]', params: { id: notificacionId } }
      : '/notificaciones';
  }

  // US-NOT-03: "a su listado de publicaciones propias, donde la publicación
  // eliminada ya no aparece". No abre la publicación: ya no existe para nadie.
  if (tipo === 'PUBLICACION_ELIMINADA_ADMIN') return '/(cocinero)/platos';

  // US-NOT-05: a "Mis reseñas" (PAN-RES-02). No lleva `objetoAfectadoId` en la
  // ruta: la pantalla resuelve el cocinero de la sesión.
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

  // PEDIDO_* (US-NOT-01).
  return {
    pathname: '/pedidos/[id]/detalle',
    params: { id: objetoAfectadoId },
  };
}
