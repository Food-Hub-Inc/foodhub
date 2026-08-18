import { Button } from '@heroui/react';
import type { EstadoTerminos } from '@foodhub/shared';
import { formatearFecha, nombreCompleto } from '../../../lib/formato.js';
import { TEXTOS_TERMINOS } from '../../../lib/textos.js';

/** Vista de solo lectura de la versión vigente, con "Editar" y "Ver historial" (US-CFG-04). */
export function VistaVigente({
  estado,
  alEditar,
  alVerHistorial,
}: {
  estado: EstadoTerminos;
  alEditar: () => void;
  alVerHistorial: () => void;
}) {
  return (
    <div className="space-y-4">
      {estado.vigente ? (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-text-secondary">
            <span>
              {TEXTOS_TERMINOS.fechaPublicacion}:{' '}
              {formatearFecha(estado.vigente.fechaPublicacion)}
            </span>
            <span>
              {TEXTOS_TERMINOS.publicadoPor}:{' '}
              {estado.vigente.adminAutor
                ? nombreCompleto(
                    estado.vigente.adminAutor.nombre,
                    estado.vigente.adminAutor.apellido,
                  )
                : TEXTOS_TERMINOS.autorDesconocido}
            </span>
          </div>

          {/* El contenido ya pasó por sanitize-html en el servidor antes de guardarse: es seguro renderizarlo. */}
          <div
            className="prose prose-sm max-w-none rounded-sm border border-border bg-surface p-4"
            dangerouslySetInnerHTML={{ __html: estado.vigente.contenidoHtml }}
          />
        </>
      ) : (
        <p className="rounded-sm border border-dashed border-border p-4 text-body text-text-secondary">
          {TEXTOS_TERMINOS.sinVersionVigente}
        </p>
      )}

      <div className="flex gap-2">
        <Button onPress={alEditar}>{TEXTOS_TERMINOS.accionEditar}</Button>
        <Button onPress={alVerHistorial} variant="secondary">
          {TEXTOS_TERMINOS.accionVerHistorial}
        </Button>
      </div>
    </div>
  );
}
