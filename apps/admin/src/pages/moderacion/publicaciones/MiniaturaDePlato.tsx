import { clases } from '../../../lib/clases.js';
import { TEXTOS_MODERACION_PUBLICACIONES as TEXTOS } from '../../../lib/textos.js';

/**
 * Foto del plato en la tabla y en el detalle. Sin imagen (el campo es
 * opcional en US-PUB-01) se muestra un recuadro con el texto en lugar de un
 * hueco vacío que parezca un error de carga.
 */
export function MiniaturaDePlato({
  imagenUrl,
  nombre,
  className,
}: {
  imagenUrl: string | null;
  nombre: string;
  className?: string | undefined;
}) {
  if (!imagenUrl) {
    return (
      <div
        className={clases(
          'flex size-11 shrink-0 items-center justify-center rounded-sm bg-background text-center text-caption text-text-disabled',
          className,
        )}
      >
        {TEXTOS.sinImagen}
      </div>
    );
  }

  return (
    <img
      alt={nombre}
      className={clases(
        'size-11 shrink-0 rounded-sm bg-background object-cover',
        className,
      )}
      loading="lazy"
      src={imagenUrl}
    />
  );
}
