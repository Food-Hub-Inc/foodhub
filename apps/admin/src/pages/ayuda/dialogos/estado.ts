import type { FaqAdminListado } from '@foodhub/shared';

/**
 * Qué diálogo de "Gestión de ayuda" (US-AYU-05) está abierto y sobre qué fila.
 * Mismo patrón que `configuracion/motivos/dialogos/estado.ts`: no hay estado
 * para "habilitar" porque esa mutación se dispara directo desde la tabla.
 *
 * El manual no tiene estado de diálogo de alta/edición: ambas navegan a
 * `PaginaDeCapitulo`. Solo conserva el de baja lógica, que vive en el propio
 * `PanelDelManual`.
 */
export interface DialogosDeFaqs {
  alta: boolean;
  edicion: FaqAdminListado | null;
  deshabilitacion: FaqAdminListado | null;
}

export const SIN_DIALOGOS_FAQ: DialogosDeFaqs = {
  alta: false,
  edicion: null,
  deshabilitacion: null,
};
