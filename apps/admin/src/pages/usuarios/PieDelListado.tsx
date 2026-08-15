import { PaginacionDeTabla } from '../../components/PaginacionDeTabla.js';
import { formatearNumero, rangoVisible } from '../../lib/formato.js';

/**
 * Pie del listado de PAN-ADM-01: "Mostrando 1–20 de 824 usuarios" y la
 * paginación numerada.
 *
 * No se dibuja con la tabla vacía: en ese caso manda el estado vacío, y un
 * "Mostrando 0 de 0" al pie solo agrega ruido a una pantalla que ya está
 * explicando que no hay resultados.
 */
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
      resumen={`Mostrando ${formatearNumero(rango.desde)}–${formatearNumero(rango.hasta)} de ${formatearNumero(total)} usuarios`}
      total={total}
    />
  );
}
