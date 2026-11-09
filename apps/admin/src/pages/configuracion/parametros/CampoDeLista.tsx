import { FieldError, Label, TextArea, TextField } from '@heroui/react';

/**
 * Campo multilínea para una lista de valores, uno por renglón (US-CFG-03).
 *
 * Lo usa hoy la lista de términos del filtro de moderación de reseñas. Se
 * separa de `CampoDeTexto` en lugar de agregarle una bandera `multilinea`
 * porque no son el mismo control: este edita una COLECCIÓN y el otro un valor
 * suelto, y de esa diferencia salen el contador de elementos y la ayuda que
 * explica el formato.
 *
 * El valor viaja como texto crudo mientras se edita —igual que en
 * `CampoNumerico`— y la sección es quien lo parte en líneas al validar: cortar
 * en cada tecla impediría escribir un renglón nuevo, porque la línea vacía
 * recién abierta se descartaría antes de poder tipear.
 */
export function CampoDeLista({
  etiqueta,
  ayuda,
  valor,
  alCambiar,
  error,
  cantidad,
  leyendaCantidad,
}: {
  etiqueta: string;
  ayuda: string;
  valor: string;
  alCambiar: (valor: string) => void;
  error?: string | undefined;
  cantidad: number;
  leyendaCantidad: (cantidad: number) => string;
}) {
  return (
    <TextField isInvalid={Boolean(error)} onChange={alCambiar} value={valor}>
      <Label>{etiqueta}</Label>
      <p className="mb-1 text-caption text-text-secondary">{ayuda}</p>
      <TextArea className="min-h-32 w-full" />
      <p className="mt-1 text-caption text-text-secondary">
        {leyendaCantidad(cantidad)}
      </p>
      <FieldError>{error}</FieldError>
    </TextField>
  );
}
