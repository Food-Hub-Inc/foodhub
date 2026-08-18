import { FieldError, Label, TextArea, TextField } from '@heroui/react';

/** Campo multilínea del formulario de categoría (descripción, ≤200 caracteres). */
export function CampoDeTextoLargo({
  etiqueta,
  valor,
  alCambiar,
  error,
  placeholder,
}: {
  etiqueta: string;
  valor: string;
  alCambiar: (valor: string) => void;
  error?: string | undefined;
  placeholder?: string;
}) {
  return (
    <TextField isInvalid={Boolean(error)} onChange={alCambiar} value={valor}>
      <Label>{etiqueta}</Label>
      <TextArea className="w-full" placeholder={placeholder} rows={3} />
      <FieldError>{error}</FieldError>
    </TextField>
  );
}
