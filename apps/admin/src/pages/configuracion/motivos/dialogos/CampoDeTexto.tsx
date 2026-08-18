import { FieldError, Input, Label, TextField } from '@heroui/react';

/**
 * Copia de `categorias/dialogos/CampoDeTexto.tsx` para el módulo de motivos
 * de cancelación.
 */
export function CampoDeTexto({
  etiqueta,
  valor,
  alCambiar,
  error,
  autoFocus = false,
}: {
  etiqueta: string;
  valor: string;
  alCambiar: (valor: string) => void;
  error?: string | undefined;
  autoFocus?: boolean;
}) {
  return (
    <TextField isInvalid={Boolean(error)} onChange={alCambiar} value={valor}>
      <Label>{etiqueta}</Label>
      <Input autoFocus={autoFocus} className="w-full" />
      <FieldError>{error}</FieldError>
    </TextField>
  );
}
