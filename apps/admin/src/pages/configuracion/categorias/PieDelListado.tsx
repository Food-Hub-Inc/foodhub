import { PaginacionDeTabla } from '../../../components/PaginacionDeTabla.js';
import { formatearNumero, rangoVisible } from '../../../lib/formato.js';

/** Pie del listado de categorías: "Mostrando 1–20 de 12 categorías" y la paginación. */
export function PieDelListado({
  pagina,
  porPagina,
  total,
  cantidadEnPagina,
  alCambiarPagina,
}: {
  pagina: number;
  porPagina: number;
  total: number;
  cantidadEnPagina: number;
  alCambiarPagina: (pagina: number) => void;
}) {
  const rango = rangoVisible(pagina, porPagina, cantidadEnPagina);
  if (!rango) return null;

  return (
    <PaginacionDeTabla
      alCambiarPagina={alCambiarPagina}
      pagina={pagina}
      porPagina={porPagina}
      resumen={`Mostrando ${formatearNumero(rango.desde)}–${formatearNumero(rango.hasta)} de ${formatearNumero(total)} categorías`}
      total={total}
    />
  );
}
