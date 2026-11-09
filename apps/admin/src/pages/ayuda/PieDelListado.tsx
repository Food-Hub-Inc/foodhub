import { PaginacionDeTabla } from '../../components/PaginacionDeTabla.js';
import { formatearNumero, rangoVisible } from '../../lib/formato.js';

/** Pie de los listados de "Gestión de ayuda": resumen y paginación. */
export function PieDelListado({
  pagina,
  porPagina,
  total,
  cantidadEnPagina,
  alCambiarPagina,
  sustantivo,
}: {
  pagina: number;
  porPagina: number;
  total: number;
  cantidadEnPagina: number;
  alCambiarPagina: (pagina: number) => void;
  /** "capítulos" / "preguntas". */
  sustantivo: string;
}) {
  const rango = rangoVisible(pagina, porPagina, cantidadEnPagina);
  if (!rango) return null;

  return (
    <PaginacionDeTabla
      alCambiarPagina={alCambiarPagina}
      pagina={pagina}
      porPagina={porPagina}
      resumen={`Mostrando ${formatearNumero(rango.desde)}–${formatearNumero(rango.hasta)} de ${formatearNumero(total)} ${sustantivo}`}
      total={total}
    />
  );
}
