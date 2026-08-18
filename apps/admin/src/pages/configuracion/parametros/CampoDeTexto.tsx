import { FieldError, Input, Label, TextField } from '@heroui/react';

/** Campo de texto de Información institucional (US-CFG-03), con ayuda opcional debajo de la etiqueta. */
export function CampoDeTexto({
  etiqueta,
  ayuda,
  valor,
  alCambiar,
  error,
}: {
  etiqueta: string;
  ayuda?: string;
  valor: string;
  alCambiar: (valor: string) => void;
  error?: string | undefined;
}) {
  return (
    <TextField isInvalid={Boolean(error)} onChange={alCambiar} value={valor}>
      <Label>{etiqueta}</Label>
      {ayuda ? (
        <p className="mb-1 text-caption text-text-secondary">{ayuda}</p>
      ) : null}
      <Input className="w-full" />
      <FieldError>{error}</FieldError>
    </TextField>
  );
}
