import { Button, Spinner } from '@heroui/react';
import { TEXTOS_FORMULARIO, TEXTOS_TERMINOS } from '../../../lib/textos.js';
import { EditorEnriquecido } from './EditorEnriquecido.js';

/** Sin etiquetas HTML el editor puede seguir "vacío" aunque `contenidoHtml` no sea la cadena vacía (ej. `<p></p>`). */
function estaVacio(html: string): boolean {
  return html.replace(/<[^>]*>/g, '').trim().length === 0;
}

/** Editor enriquecido con "Guardar borrador" / "Publicar nueva versión" / "Cancelar" (US-CFG-04). */
export function VistaEdicion({
  contenidoInicial,
  contenidoActual,
  esBorradorPropio,
  alCambiar,
  guardandoBorrador,
  alGuardarBorrador,
  alPublicar,
  alCancelar,
}: {
  contenidoInicial: string;
  contenidoActual: string;
  esBorradorPropio: boolean;
  alCambiar: (html: string) => void;
  guardandoBorrador: boolean;
  alGuardarBorrador: () => void;
  alPublicar: () => void;
  alCancelar: () => void;
}) {
  const vacio = estaVacio(contenidoActual);

  return (
    <div className="space-y-3">
      {esBorradorPropio ? (
        <p className="text-caption text-text-secondary">
          {TEXTOS_TERMINOS.editandoBorrador}
        </p>
      ) : null}

      <EditorEnriquecido
        alCambiar={alCambiar}
        contenidoInicial={contenidoInicial}
      />

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
        <Button onPress={alCancelar} type="button" variant="tertiary">
          {TEXTOS_FORMULARIO.cancelar}
        </Button>

        <Button
          isDisabled={vacio || guardandoBorrador}
          onPress={alGuardarBorrador}
          type="button"
          variant="secondary"
        >
          {guardandoBorrador ? <Spinner className="size-4" /> : null}
          {TEXTOS_TERMINOS.botonGuardarBorrador}
        </Button>

        <Button isDisabled={vacio} onPress={alPublicar} type="button">
          {TEXTOS_TERMINOS.botonPublicar}
        </Button>
      </div>
    </div>
  );
}
