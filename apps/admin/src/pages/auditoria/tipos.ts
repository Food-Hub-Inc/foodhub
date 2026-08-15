import type { useTablaDeAuditoria } from '../../hooks/useTablaDeAuditoria.js';

/**
 * Estado de una de las dos solapas de PAN-AUD-01, tal como lo devuelve
 * `useTablaDeAuditoria`.
 *
 * Se declara acá, y no en cada panel, para que los dos nombren exactamente el
 * mismo contrato: los paneles reciben este objeto ya armado desde la pantalla,
 * que es la que necesita ver el total y los filtros de la solapa activa para
 * el encabezado y la exportación.
 */
export type TablaDeAuditoria<
  F extends { pagina: number; porPagina: number },
  T,
> = ReturnType<typeof useTablaDeAuditoria<F, T>>;
