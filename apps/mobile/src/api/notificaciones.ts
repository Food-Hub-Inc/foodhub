import type {
  BajaDispositivoInput,
  ConteoNoLeidas,
  MarcarLeidasInput,
  MarcarPresenciaInput,
  Notificacion,
  PaginaNotificaciones,
  RegistrarDispositivoInput,
} from '@foodhub/shared';
import { api } from '../lib/api';

/**
 * Cliente de la API del módulo de Notificaciones y Alertas (US-NOT-01 a
 * US-NOT-08). Prefijo `/notificaciones`.
 */

/** US-NOT-07 - Una página del historial in-app (PAN-NOT-01). */
export function obtenerNotificaciones(
  pagina: number,
): Promise<PaginaNotificaciones> {
  return api.obtener<PaginaNotificaciones>(
    `/notificaciones?pagina=${String(pagina)}`,
  );
}

/** PAN-NOT-03 - Una notificación propia: el detalle de un aviso (US-NOT-04). */
export function obtenerNotificacion(id: string): Promise<Notificacion> {
  return api.obtener<Notificacion>(`/notificaciones/${id}`);
}

/** US-NOT-07 - Contador para el globo de la campana del encabezado. */
export function obtenerNoLeidas(): Promise<ConteoNoLeidas> {
  return api.obtener<ConteoNoLeidas>('/notificaciones/no-leidas');
}

/** US-NOT-07 - Marcar como leídas: sin `ids` = todas; con `ids` = solo esas. */
export function marcarNotificacionesLeidas(ids?: string[]): Promise<void> {
  const datos: MarcarLeidasInput = ids ? { ids } : {};
  return api.enviar<void>('/notificaciones/marcar-leidas', datos);
}

/** Registro / renovación del Expo Push Token (punto 1.3.1.11). */
export function registrarDispositivo(
  datos: RegistrarDispositivoInput,
): Promise<void> {
  return api.enviar<void>('/notificaciones/dispositivos', datos);
}

/** Baja del token al cerrar sesión. */
export function darDeBajaDispositivo(expoPushToken: string): Promise<void> {
  const datos: BajaDispositivoInput = { expoPushToken };
  return api.eliminar<void>('/notificaciones/dispositivos', datos);
}

/** US-NOT-02 - Declara qué conversación está mirando el usuario (o `null`). */
export function marcarPresencia(conversacionId: string | null): Promise<void> {
  const datos: MarcarPresenciaInput = { conversacionId };
  return api.reemplazar<void>('/notificaciones/presencia', datos);
}
