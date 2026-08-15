import { FieldError, Label, ListBox, Select } from '@heroui/react';
import { ROL_EN_PROSA } from '../../../lib/etiquetas.js';
import { ROLES_DEL_PANEL, type RolDelPanel } from './roles.js';

/**
 * Desplegable de rol de los diálogos de alta y edición (US-GURP-06 y
 * US-GURP-07).
 *
 * Ofrece los roles en prosa ("Cliente", "Administrador") y no el valor del
 * enum: el vocabulario de la pantalla es el del usuario, no el de la base.
 */
export function SelectorDeRol({
  etiqueta,
  valor,
  alCambiar,
  error,
}: {
  etiqueta: string;
  valor: RolDelPanel;
  alCambiar: (valor: RolDelPanel) => void;
  error?: string | undefined;
}) {
  return (
    <Select
      isInvalid={Boolean(error)}
      onSelectionChange={(clave) => {
        alCambiar(String(clave) as RolDelPanel);
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
          {ROLES_DEL_PANEL.map((rol) => (
            <ListBox.Item id={rol} key={rol} textValue={ROL_EN_PROSA[rol]}>
              {ROL_EN_PROSA[rol]}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
      <FieldError>{error}</FieldError>
    </Select>
  );
}
