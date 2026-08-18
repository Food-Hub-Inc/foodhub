import type {
  ActualizarPreferenciaNotificacionInput,
  GrupoPreferenciaNotificacion,
  PreferenciaNotificacionGrupo,
  PreferenciasNotificacion,
} from '@foodhub/shared';
import { api } from '../lib/api';

/** Preferencias de notificación push — US-CFG-05 (RF059), PAN-CFG-01. */

/** Los switches que le corresponden al rol del usuario autenticado, ya agrupados. */
export function obtenerPreferenciasNotificacion(): Promise<PreferenciasNotificacion> {
  return api.obtener<PreferenciasNotificacion>(
    '/usuarios/yo/preferencias-notificacion',
  );
}

/** Prende o apaga un grupo de switches. Se persiste de inmediato, sin botón "Guardar". */
export function actualizarPreferenciaNotificacion(
  grupo: GrupoPreferenciaNotificacion,
  activa: boolean,
): Promise<PreferenciaNotificacionGrupo> {
  const datos: ActualizarPreferenciaNotificacionInput = { activa };
  return api.modificar<PreferenciaNotificacionGrupo>(
    `/usuarios/yo/preferencias-notificacion/${grupo}`,
    datos,
  );
}
