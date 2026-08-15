import { Input, Label, TextField } from '@heroui/react';
import {
  TIPO_EVENTO_SEGURIDAD,
  type TipoEventoSeguridad,
} from '@foodhub/shared';
import { SelectorDeFiltro } from '../../components/SelectorDeFiltro.js';
import { ETIQUETA_EVENTO_SEGURIDAD } from '../../lib/etiquetas.js';
import { TEXTOS_AUDITORIA } from '../../lib/textos.js';
import { FiltrosComunes } from './FiltrosComunes.js';
import type { FiltrosSeguridad } from '../../api/auditoria.js';

/**
 * Barra de filtros de la solapa de seguridad — US-AUD-01, tercer criterio.
 *
 * Sobre los filtros comunes agrega los dos propios de esta tabla: el correo
 * intentado, que en un login fallido es el único dato de identidad disponible
 * (todavía no hay usuario asociado), y el tipo de evento, que acá reemplaza al
 * tipo de operación de la otra solapa.
 */
const OPCIONES_EVENTO = TIPO_EVENTO_SEGURIDAD.map((tipo) => ({
  valor: tipo,
  etiqueta: ETIQUETA_EVENTO_SEGURIDAD[tipo],
}));

export function FiltrosDeSeguridad({
  filtros,
  alCambiar,
  rangoInvalido,
}: {
  filtros: FiltrosSeguridad;
  alCambiar: (cambio: Partial<FiltrosSeguridad>) => void;
  rangoInvalido: boolean;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3 border-b border-border px-4 py-3">
      <FiltrosComunes
        alCambiar={alCambiar}
        desde={filtros.desde}
        hasta={filtros.hasta}
        ipOrigen={filtros.ipOrigen}
        rangoInvalido={rangoInvalido}
        usuarioId={filtros.usuarioId}
      />

      <TextField
        className="w-[228px]"
        onChange={(emailIntentado) => {
          alCambiar({ emailIntentado });
        }}
        value={filtros.emailIntentado}
      >
        <Label className="text-label text-text-secondary">
          {TEXTOS_AUDITORIA.correoIntentadoEtiqueta}
        </Label>
        <Input
          className="w-full"
          placeholder={TEXTOS_AUDITORIA.correoIntentado}
        />
      </TextField>

      <SelectorDeFiltro
        alCambiar={(tipoEvento: TipoEventoSeguridad | null) => {
          alCambiar({ tipoEvento });
        }}
        etiqueta={TEXTOS_AUDITORIA.tipoEvento}
        etiquetaTodos={TEXTOS_AUDITORIA.todos}
        opciones={OPCIONES_EVENTO}
        valor={filtros.tipoEvento}
      />
    </div>
  );
}
