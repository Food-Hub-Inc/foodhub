import { Label, ListBox, Select } from '@heroui/react';
import { TAMANOS_PAGINA_AUDITORIA } from '@foodhub/shared';
import { TEXTOS_AUDITORIA } from '../../lib/textos.js';

/**
 * Selector de registros por página — US-AUD-02.
 *
 * Las opciones salen de `TAMANOS_PAGINA_AUDITORIA`, la misma constante contra
 * la que valida el servidor. Declarada de un solo lado, el desplegable y la
 * validación no pueden desalinearse: agregar un tamaño es tocar
 * `@foodhub/shared` y nada más.
 */
export function SelectorDeTamano({
  valor,
  alCambiar,
}: {
  valor: number;
  alCambiar: (valor: number) => void;
}) {
  return (
    <Select
      className="w-[164px]"
      onSelectionChange={(clave) => {
        alCambiar(Number(clave));
      }}
      selectedKey={String(valor)}
    >
      <Label className="sr-only">{TEXTOS_AUDITORIA.porPagina}</Label>
      <Select.Trigger className="w-full justify-between border border-border bg-surface">
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {TAMANOS_PAGINA_AUDITORIA.map((tamano) => (
            <ListBox.Item
              id={String(tamano)}
              key={tamano}
              textValue={`${String(tamano)} ${TEXTOS_AUDITORIA.porPagina}`}
            >
              {`${String(tamano)} ${TEXTOS_AUDITORIA.porPagina}`}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
