import { FieldError, Label, ListBox, Select } from '@heroui/react';
import {
  TIPO_USUARIO_CANCELACION,
  type TipoUsuarioCancelacion,
} from '@foodhub/shared';
import { ETIQUETA_TIPO_USUARIO_CANCELACION } from '../../../../lib/etiquetas.js';

/**
 * Desplegable "Aplicable a" de los diálogos de alta y edición (US-CFG-02,
 * RF056), con las opciones "Cancelación por cocinero", "Cancelación por
 * cliente" y "Ambos" — mismo patrón que `SelectorDeRol` del módulo de
 * usuarios.
 */
export function SelectorDeAplicabilidad({
  etiqueta,
  valor,
  alCambiar,
  error,
}: {
  etiqueta: string;
  valor: TipoUsuarioCancelacion | null;
  alCambiar: (valor: TipoUsuarioCancelacion) => void;
  error?: string | undefined;
}) {
  return (
    <Select
      isInvalid={Boolean(error)}
      onSelectionChange={(clave) => {
        alCambiar(String(clave) as TipoUsuarioCancelacion);
      }}
      selectedKey={valor}
    >
      <Label>{etiqueta}</Label>
      <Select.Trigger className="w-full justify-between border border-border bg-surface">
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {TIPO_USUARIO_CANCELACION.map((codigo) => (
            <ListBox.Item
              id={codigo}
              key={codigo}
              textValue={ETIQUETA_TIPO_USUARIO_CANCELACION[codigo]}
            >
              {ETIQUETA_TIPO_USUARIO_CANCELACION[codigo]}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
      <FieldError>{error}</FieldError>
    </Select>
  );
}
