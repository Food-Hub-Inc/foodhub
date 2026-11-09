import { FieldError, Input, Label, TextField } from '@heroui/react';

/**
 * Copia de `pages/usuarios/dialogos/CampoDeTexto.tsx` para el módulo de
 * categorías. Ver nota de duplicación en `Categorias.tsx`.
 */
export function CampoDeTexto({
  etiqueta,
  valor,
  alCambiar,
  error,
  placeholder,
  autoFocus = false,
}: {
  etiqueta: string;
  valor: string;
  alCambiar: (valor: string) => void;
  error?: string | undefined;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <TextField isInvalid={Boolean(error)} onChange={alCambiar} value={valor}>
      <Label>{etiqueta}</Label>
      <Input
        autoFocus={autoFocus}
        className="w-full"
        {...(placeholder === undefined ? {} : { placeholder })}
      />
      <FieldError>{error}</FieldError>
    </TextField>
  );
}
