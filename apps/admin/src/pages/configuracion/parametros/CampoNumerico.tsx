import { FieldError, Input, Label, TextField } from '@heroui/react';

/**
 * Campo numérico de una sección de parámetros generales (US-CFG-03), con la
 * "descripción breve de su uso" que pide el criterio de aceptación debajo
 * de la etiqueta.
 *
 * El valor viaja como texto mientras se edita —no como número— para poder
 * representar estados intermedios ("", "12,", "0.") sin que React los
 * normalice a mitad de tecleo; `Seccion*.tsx` es quien lo convierte y valida
 * en cada cambio (RF057: "El sistema valida los rangos al modificar
 * cualquier campo").
 */
export function CampoNumerico({
  etiqueta,
  ayuda,
  valor,
  alCambiar,
  error,
}: {
  etiqueta: string;
  ayuda: string;
  valor: string;
  alCambiar: (valor: string) => void;
  error?: string | undefined;
}) {
  return (
    <TextField isInvalid={Boolean(error)} onChange={alCambiar} value={valor}>
      <Label>{etiqueta}</Label>
      <p className="mb-1 text-caption text-text-secondary">{ayuda}</p>
      <Input className="w-full" inputMode="decimal" />
      <FieldError>{error}</FieldError>
    </TextField>
  );
}
