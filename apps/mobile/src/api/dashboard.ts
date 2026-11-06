import type {
  ActividadCocinero,
  EvolucionPlato,
  RangoDashboard,
} from '@foodhub/shared';
import { api } from '../lib/api';

/**
 * Dashboard del cocinero — US-DASH-01 a US-DASH-05 · PAN-DASH-01.
 *
 * UNA SOLA FUNCIÓN PARA LAS CUATRO SECCIONES. Comparten el período, y US-DASH-05
 * exige que se actualicen "de forma inmediata" al cambiarlo: cuatro requests
 * darían cuatro estados de carga desincronizados sobre una pantalla que para el
 * cocinero es una sola.
 *
 * La ruta no recibe ningún identificador: el único cocinero consultable es el de
 * la sesión, y eso lo resuelve la API. Acá tampoco hay nada que pasarle.
 */

/** Las cuatro secciones de "Mi actividad" para un rango de fechas. */
export function obtenerActividad(
  rango: RangoDashboard,
): Promise<ActividadCocinero> {
  const parametros = new URLSearchParams(rango);
  return api.obtener<ActividadCocinero>(
    `/dashboard/actividad?${parametros.toString()}`,
  );
}

/**
 * Evolución de un plato en el período (corrección del 20/10/2026). El id es de
 * una publicación; la API solo la encuentra si es del cocinero de la sesión.
 */
export function obtenerEvolucionDePlato(
  publicacionId: string,
  rango: RangoDashboard,
): Promise<EvolucionPlato> {
  const parametros = new URLSearchParams(rango);
  return api.obtener<EvolucionPlato>(
    `/dashboard/platos/${encodeURIComponent(publicacionId)}/evolucion?${parametros.toString()}`,
  );
}
