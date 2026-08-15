import type { UsuarioListado } from '@foodhub/shared';

/**
 * Qué diálogo de PAN-ADM-01 está abierto y sobre qué fila.
 *
 * Uno solo a la vez: es la definición de un modal. Se modela como un único
 * objeto y no como cinco booleanos sueltos porque así el estado inconsistente
 * —dos diálogos abiertos— no se puede representar.
 */
export interface DialogosAbiertos {
  alta: boolean;
  edicion: UsuarioListado | null;
  suspension: UsuarioListado | null;
  rehabilitacion: UsuarioListado | null;
  baja: UsuarioListado | null;
}

export const SIN_DIALOGOS: DialogosAbiertos = {
  alta: false,
  edicion: null,
  suspension: null,
  rehabilitacion: null,
  baja: null,
};
