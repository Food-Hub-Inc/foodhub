import {
  MENSAJES_METRICAS,
  rangoDePeriodo,
  type PeriodoMetricas,
} from '@foodhub/shared';
import { finDelDiaISO, inicioDelDiaISO } from '../../lib/formato.js';

/**
 * Estado del selector de período de PAN-ADM-03 y su traducción a un rango.
 *
 * Semana, mes y año salen de `rangoDePeriodo` del dashboard del cocinero:
 * mismo cálculo, mismo inicio de semana (lunes) y mismo "hasta ahora".
 */
export interface SeleccionDePeriodo {
  periodo: PeriodoMetricas;
  /** `YYYY-MM-DD` de los campos "Desde" y "Hasta" del personalizado. */
  desde: string;
  hasta: string;
}

export type RangoResuelto =
  | { valido: true; desde: Date; hasta: Date }
  | { valido: false; error: string | null };

/** Hoy en `YYYY-MM-DD` local: el `max` de los dos campos de fecha. */
export function hoyISO(): string {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${String(hoy.getFullYear())}-${mes}-${dia}`;
}

/**
 * Tercer criterio de US-ADM-05: el personalizado se valida y solo actualiza si
 * "Desde" no es posterior a "Hasta" y "Hasta" no supera la fecha actual.
 * Mientras falte alguna de las dos fechas no hay error que mostrar, solo nada
 * que consultar todavía.
 */
export function resolverRango(seleccion: SeleccionDePeriodo): RangoResuelto {
  if (seleccion.periodo !== 'PERSONALIZADO') {
    return { valido: true, ...rangoDePeriodo(seleccion.periodo) };
  }

  const desde = inicioDelDiaISO(seleccion.desde);
  const hasta = finDelDiaISO(seleccion.hasta);
  if (!desde || !hasta) return { valido: false, error: null };

  if (seleccion.hasta > hoyISO()) {
    return { valido: false, error: MENSAJES_METRICAS.hastaFutura };
  }
  if (seleccion.desde > seleccion.hasta) {
    return { valido: false, error: MENSAJES_METRICAS.rangoInvertido };
  }

  // El fin del día de hoy es futuro: se recorta a "ahora", como los otros tres.
  const ahora = new Date();
  const fin = new Date(hasta);
  return {
    valido: true,
    desde: new Date(desde),
    hasta: fin > ahora ? ahora : fin,
  };
}
