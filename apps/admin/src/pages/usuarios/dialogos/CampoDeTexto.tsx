import { FieldError, Input, Label, TextField } from '@heroui/react';

/**
 * Campo de texto con etiqueta y error inline, en la forma que define la guía
 * visual (capítulo 2: normal · foco · error con el mensaje debajo).
 *
 * Existe para que los formularios de los diálogos no repitan las cuatro piezas
 * de `TextField` una y otra vez, y para que el error se muestre siempre en el
 * mismo lugar respecto del input.
 */
export function CampoDeTexto({
  etiqueta,
  valor,
  alCambiar,
  error,
  tipo = 'text',
  placeholder,
  autoFocus = false,
  deshabilitado = false,
}: {
  etiqueta: string;
  valor: string;
  alCambiar: (valor: string) => void;
  error?: string | undefined;
  tipo?: 'text' | 'email';
  placeholder?: string;
  autoFocus?: boolean;
  deshabilitado?: boolean;
}) {
  return (
    <TextField
      isDisabled={deshabilitado}
      isInvalid={Boolean(error)}
      onChange={alCambiar}
      type={tipo}
      value={valor}
    >
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
