import type { MotivoCancelacionListado } from '@foodhub/shared';

/**
 * Qué diálogo de PAN-ADM-04 (motivos de cancelación) está abierto y sobre
 * qué fila. Mismo patrón que `categorias/dialogos/estado.ts`: no hay estado
 * para "habilitar" porque, siguiendo el mismo criterio "sin solicitar
 * confirmación" de US-CFG-01, esa mutación se dispara directo desde la
 * tabla.
 */
export interface DialogosAbiertos {
  alta: boolean;
  edicion: MotivoCancelacionListado | null;
  deshabilitacion: MotivoCancelacionListado | null;
}

export const SIN_DIALOGOS: DialogosAbiertos = {
  alta: false,
  edicion: null,
  deshabilitacion: null,
};
