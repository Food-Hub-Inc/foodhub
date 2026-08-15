import { Label, ListBox, Select } from '@heroui/react';
import { clases } from '../lib/clases.js';

/**
 * Desplegable de las barras de filtros del panel.
 *
 * Envuelve el `Select` de HeroUI —que aporta el manejo de teclado y los roles
 * ARIA de React Aria— con la única forma que usa la maquetación: etiqueta
 * adelante y valor a continuación ("Rol: Todos"), y una opción "Todos" que
 * representa la ausencia de filtro.
 *
 * El valor vacío se modela con la cadena `TODOS` y no con `null` porque una
 * colección de React Aria no puede tener una clave nula; hacia afuera la
 * conversión es transparente.
 */

const TODOS = '__todos__';

export interface OpcionDeFiltro<T extends string> {
  valor: T;
  etiqueta: string;
}

export function SelectorDeFiltro<T extends string>({
  etiqueta,
  etiquetaTodos,
  opciones,
  valor,
  alCambiar,
  className,
}: {
  etiqueta: string;
  /** Texto de la opción que desactiva el filtro ("Todos" / "Todas"). */
  etiquetaTodos: string;
  opciones: readonly OpcionDeFiltro<T>[];
  valor: T | null;
  alCambiar: (valor: T | null) => void;
  className?: string | undefined;
}) {
  return (
    <Select
      aria-label={etiqueta}
      className={clases('min-w-[168px]', className)}
      onSelectionChange={(clave) => {
        alCambiar(clave === TODOS ? null : (String(clave) as T));
      }}
      selectedKey={valor ?? TODOS}
    >
      <Label className="sr-only">{etiqueta}</Label>

      <Select.Trigger className="w-full justify-between border border-border bg-surface">
        <span className="flex min-w-0 items-center gap-1.5 truncate">
          <span className="text-text-secondary">{etiqueta}:</span>
          <Select.Value className="truncate font-semibold text-text-primary" />
        </span>
        <Select.Indicator />
      </Select.Trigger>

      <Select.Popover>
        <ListBox>
          <ListBox.Item id={TODOS} textValue={etiquetaTodos}>
            {etiquetaTodos}
            <ListBox.ItemIndicator />
          </ListBox.Item>

          {opciones.map((opcion) => (
            <ListBox.Item
              id={opcion.valor}
              key={opcion.valor}
              textValue={opcion.etiqueta}
            >
              {opcion.etiqueta}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
