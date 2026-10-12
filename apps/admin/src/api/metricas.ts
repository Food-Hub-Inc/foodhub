import type { MetricasAdmin } from '@foodhub/shared';
import { api } from '../lib/api.js';

/**
 * Superficie de `/metricas` — US-ADM-05, PAN-ADM-03. El rango ya viene
 * calculado por la pantalla, en UTC; la zona horaria es la del navegador para
 * que la serie se agrupe por día local.
 */
export const CLAVE_METRICAS = ['metricas'] as const;

export function obtenerMetricas(rango: {
  desde: Date;
  hasta: Date;
}): Promise<MetricasAdmin> {
  return api.obtener<MetricasAdmin>('/metricas', {
    desde: rango.desde.toISOString(),
    hasta: rango.hasta.toISOString(),
    zonaHoraria: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
}
