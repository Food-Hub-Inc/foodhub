import type { ReactNode } from 'react';
import { Pagination } from '@heroui/react';
import { cantidadDePaginas } from '../lib/formato.js';

/**
 * Pie de las tablas del panel: resumen a la izquierda, paginación numerada a
 * la derecha.
 *
 * La paginación NO toca los filtros: cambia únicamente el número de página del
 * estado que la pantalla ya tiene. Es lo que exige US-AUD-02 ("paginación
 * manteniendo los filtros") y lo que espera cualquiera que esté revisando una
 * búsqueda larga.
 */
export function PaginacionDeTabla({
  pagina,
  porPagina,
  total,
  alCambiarPagina,
  resumen,
  controlesExtra,
}: {
  pagina: number;
  porPagina: number;
  total: number;
  alCambiarPagina: (pagina: number) => void;
  /** "Mostrando 1–20 de 824 usuarios". */
  resumen: ReactNode;
  /** Selector de tamaño de página, cuando la pantalla lo ofrece. */
  controlesExtra?: ReactNode;
}) {
  const ultima = cantidadDePaginas(total, porPagina);
  const numeros = numerosVisibles(pagina, ultima);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border px-4 py-3">
      <div className="flex flex-wrap items-center gap-4">
        <p className="text-label text-text-secondary">{resumen}</p>
        {controlesExtra}
      </div>

      {ultima > 1 ? (
        <Pagination>
          <Pagination.Content>
            <Pagination.Item>
              <Pagination.Previous
                isDisabled={pagina <= 1}
                onPress={() => {
                  alCambiarPagina(pagina - 1);
                }}
              >
                <Pagination.PreviousIcon />
              </Pagination.Previous>
            </Pagination.Item>

            {numeros.map((numero, indice) =>
              numero === null ? (
                <Pagination.Item key={`salto-${String(indice)}`}>
                  <Pagination.Ellipsis />
                </Pagination.Item>
              ) : (
                <Pagination.Item key={numero}>
                  <Pagination.Link
                    aria-label={`Página ${String(numero)}`}
                    isActive={numero === pagina}
                    onPress={() => {
                      alCambiarPagina(numero);
                    }}
                  >
                    {numero}
                  </Pagination.Link>
                </Pagination.Item>
              ),
            )}

            <Pagination.Item>
              <Pagination.Next
                isDisabled={pagina >= ultima}
                onPress={() => {
                  alCambiarPagina(pagina + 1);
                }}
              >
                <Pagination.NextIcon />
              </Pagination.Next>
            </Pagination.Item>
          </Pagination.Content>
        </Pagination>
      ) : null}
    </div>
  );
}

/** Cuántos números se muestran a cada lado de la página actual. */
const VENTANA = 1;

/**
 * Números a dibujar, con `null` donde va un salto.
 *
 * Con 42 páginas no se pueden listar las 42: se muestran la primera, la última,
 * la actual y sus vecinas. El resto se resume con puntos suspensivos.
 */
function numerosVisibles(actual: number, ultima: number): (number | null)[] {
  if (ultima <= 7) {
    return Array.from({ length: ultima }, (_, indice) => indice + 1);
  }

  const paginas = new Set<number>([1, ultima, actual]);
  for (let salto = 1; salto <= VENTANA; salto += 1) {
    if (actual - salto > 1) paginas.add(actual - salto);
    if (actual + salto < ultima) paginas.add(actual + salto);
  }

  const ordenadas = [...paginas].sort((a, b) => a - b);
  const resultado: (number | null)[] = [];

  let anterior = 0;
  for (const numero of ordenadas) {
    if (numero - anterior > 1) resultado.push(null);
    resultado.push(numero);
    anterior = numero;
  }
  return resultado;
}
