import { Input, Label, TextField } from '@heroui/react';
import { ToggleButton, ToggleButtonGroup } from 'react-aria-components';
import { PERIODO_METRICAS, type PeriodoMetricas } from '@foodhub/shared';
import { TEXTOS_METRICAS } from '../../lib/textos.js';
import { hoyISO, type SeleccionDePeriodo } from './periodo.js';

/**
 * Selector de período de PAN-ADM-03: el segmentado del mockup (Semana / Mes /
 * Año) más "Personalizado", que la US exige.
 *
 * `ToggleButtonGroup` de React Aria con selección única: aporta el rol de
 * grupo, las flechas del teclado y el `aria-pressed` que un conjunto de
 * `<button>` sueltos no tendría.
 */
const ETIQUETA: Record<PeriodoMetricas, string> = {
  SEMANA: TEXTOS_METRICAS.periodoSemana,
  MES: TEXTOS_METRICAS.periodoMes,
  ANIO: TEXTOS_METRICAS.periodoAnio,
  PERSONALIZADO: TEXTOS_METRICAS.periodoPersonalizado,
};

export function SelectorDePeriodo({
  seleccion,
  error,
  alCambiar,
}: {
  seleccion: SeleccionDePeriodo;
  error: string | null;
  alCambiar: (seleccion: SeleccionDePeriodo) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <ToggleButtonGroup
        aria-label={TEXTOS_METRICAS.periodo}
        className="flex rounded-md bg-background p-1"
        disallowEmptySelection
        onSelectionChange={(claves) => {
          const [clave] = [...claves];
          if (clave) {
            alCambiar({ ...seleccion, periodo: clave as PeriodoMetricas });
          }
        }}
        selectedKeys={[seleccion.periodo]}
        selectionMode="single"
      >
        {PERIODO_METRICAS.map((periodo) => (
          <ToggleButton
            className="cursor-pointer rounded-sm px-3.5 py-1.5 text-body font-semibold text-text-secondary transition-colors duration-150 outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-primary data-selected:bg-surface data-selected:text-text-primary data-selected:shadow-sm"
            id={periodo}
            key={periodo}
          >
            {ETIQUETA[periodo]}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {seleccion.periodo === 'PERSONALIZADO' ? (
        <RangoPersonalizado
          alCambiar={alCambiar}
          error={error}
          seleccion={seleccion}
        />
      ) : null}
    </div>
  );
}

/**
 * "Desde" y "Hasta" con el mismo campo de fecha nativo que Auditoría. El `max`
 * en hoy impide elegir un día futuro; la validación de `resolverRango` cubre
 * lo que se tipea a mano.
 */
function RangoPersonalizado({
  seleccion,
  error,
  alCambiar,
}: {
  seleccion: SeleccionDePeriodo;
  error: string | null;
  alCambiar: (seleccion: SeleccionDePeriodo) => void;
}) {
  const hoy = hoyISO();

  return (
    <div>
      <div className="flex items-end gap-2">
        <CampoDeFecha
          alCambiar={(desde) => {
            alCambiar({ ...seleccion, desde });
          }}
          etiqueta={TEXTOS_METRICAS.desde}
          invalido={error !== null}
          maximo={hoy}
          valor={seleccion.desde}
        />
        <CampoDeFecha
          alCambiar={(hasta) => {
            alCambiar({ ...seleccion, hasta });
          }}
          etiqueta={TEXTOS_METRICAS.hasta}
          invalido={error !== null}
          maximo={hoy}
          valor={seleccion.hasta}
        />
      </div>
      {error ? (
        <p className="mt-1 text-caption text-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function CampoDeFecha({
  etiqueta,
  valor,
  maximo,
  invalido,
  alCambiar,
}: {
  etiqueta: string;
  valor: string;
  maximo: string;
  invalido: boolean;
  alCambiar: (valor: string) => void;
}) {
  return (
    <TextField
      className="w-[160px]"
      isInvalid={invalido}
      onChange={alCambiar}
      type="date"
      value={valor}
    >
      <Label className="text-label text-text-secondary">{etiqueta}</Label>
      <Input className="w-full" max={maximo} />
    </TextField>
  );
}
