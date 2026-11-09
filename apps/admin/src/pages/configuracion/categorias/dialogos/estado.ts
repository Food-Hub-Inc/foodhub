import type { CategoriaListado } from '@foodhub/shared';

/**
 * Qué diálogo de PAN-ADM-04 (categorías) está abierto y sobre qué fila.
 *
 * Mismo patrón que `dialogos/estado.ts` del módulo de usuarios: un único
 * objeto en lugar de booleanos sueltos, para que no se pueda representar más
 * de un diálogo abierto a la vez.
 *
 * NO HAY estado para "habilitar": el criterio de aceptación de US-CFG-01 pide
 * que habilitar una categoría se aplique "de forma inmediata... sin solicitar
 * confirmación". Es la única de las cinco operaciones sin diálogo.
 */
export interface DialogosAbiertos {
  alta: boolean;
  edicion: CategoriaListado | null;
  deshabilitacion: CategoriaListado | null;
  eliminacion: CategoriaListado | null;
}

export const SIN_DIALOGOS: DialogosAbiertos = {
  alta: false,
  edicion: null,
  deshabilitacion: null,
  eliminacion: null,
};
