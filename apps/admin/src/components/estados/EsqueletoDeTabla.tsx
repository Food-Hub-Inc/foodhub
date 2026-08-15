import { Skeleton } from '@heroui/react';

/**
 * Estado CARGANDO de las tablas del panel.
 *
 * Reproduce la forma del contenido real —el mismo número de columnas, filas de
 * la misma altura, la celda de usuario con su avatar circular— en lugar de un
 * spinner suelto. Es lo que pide el principio de "visibilidad del estado del
 * sistema" de la guía de UX: el usuario ve dónde va a aparecer cada dato y la
 * página no salta cuando llegan.
 */
export function EsqueletoDeTabla({
  columnas,
  filas = 8,
  conAvatar = false,
}: {
  columnas: number;
  filas?: number;
  conAvatar?: boolean;
}) {
  return (
    <div aria-hidden="true" className="divide-y divide-border">
      {Array.from({ length: filas }, (_, indice) => (
        <div
          className="grid items-center gap-4 px-4 py-3.5"
          key={indice}
          style={{ gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columnas }, (_, columna) => (
            <div className="flex items-center gap-3" key={columna}>
              {conAvatar && columna === 1 ? (
                <Skeleton className="size-9 shrink-0 rounded-full" />
              ) : null}
              <Skeleton
                className="h-3.5 rounded-xs"
                // Anchos alternados: una grilla de barras idénticas se lee como
                // un patrón y no como texto por llegar.
                style={{ width: `${55 + ((columna * 13 + indice * 7) % 40)}%` }}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
