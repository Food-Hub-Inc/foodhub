import { Label, SearchField } from '@heroui/react';
import { ESTADO_HABILITACION_CATEGORIA } from '@foodhub/shared';
import type { EstadoHabilitacionCategoria } from '@foodhub/shared';
import {
  SelectorDeFiltro,
  type OpcionDeFiltro,
} from '../../../components/SelectorDeFiltro.js';
import { TEXTOS_CATEGORIAS } from '../../../lib/textos.js';

/** Barra de filtros de PAN-ADM-04 — US-CFG-01: búsqueda por nombre y estado. */

const OPCIONES_ESTADO: readonly OpcionDeFiltro<EstadoHabilitacionCategoria>[] =
  ESTADO_HABILITACION_CATEGORIA.map((estado) => ({
    valor: estado,
    etiqueta:
      estado === 'HABILITADA'
        ? TEXTOS_CATEGORIAS.habilitadas
        : TEXTOS_CATEGORIAS.deshabilitadas,
  }));

export function BarraDeFiltros({
  busqueda,
  estado,
  alCambiarBusqueda,
  alCambiarEstado,
}: {
  busqueda: string;
  estado: EstadoHabilitacionCategoria | null;
  alCambiarBusqueda: (valor: string) => void;
  alCambiarEstado: (valor: EstadoHabilitacionCategoria | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
      <SearchField
        className="min-w-[280px] flex-1"
        onChange={alCambiarBusqueda}
        value={busqueda}
      >
        <Label className="sr-only">{TEXTOS_CATEGORIAS.buscarEtiqueta}</Label>
        <SearchField.Group className="border border-border bg-surface">
          <SearchField.SearchIcon />
          <SearchField.Input placeholder={TEXTOS_CATEGORIAS.buscar} />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>

      <SelectorDeFiltro
        alCambiar={alCambiarEstado}
        etiqueta={TEXTOS_CATEGORIAS.filtroEstado}
        etiquetaTodos={TEXTOS_CATEGORIAS.todas}
        opciones={OPCIONES_ESTADO}
        valor={estado}
      />
    </div>
  );
}
