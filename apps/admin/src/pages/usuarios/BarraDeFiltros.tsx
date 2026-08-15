import { Label, SearchField } from '@heroui/react';
import { ESTADO_CUENTA, TIPO_USUARIO } from '@foodhub/shared';
import type { EstadoCuenta, TipoUsuario } from '@foodhub/shared';
import {
  SelectorDeFiltro,
  type OpcionDeFiltro,
} from '../../components/SelectorDeFiltro.js';
import { BotonNoDisponible } from '../../components/BotonNoDisponible.js';
import { IconoFiltro } from '../../components/iconos/index.js';
import {
  ETIQUETA_ESTADO_CUENTA,
  ETIQUETA_TIPO_USUARIO,
} from '../../lib/etiquetas.js';
import { TEXTOS_USUARIOS } from '../../lib/textos.js';

/**
 * Barra de filtros de PAN-ADM-01 — US-GURP-05.
 *
 * Los tres filtros son exactamente los que declara `filtrosUsuarioSchema`:
 * búsqueda única sobre nombre, apellido y correo (un input, no tres, como pide
 * el segundo criterio de aceptación), rol y estado de cuenta.
 */

const OPCIONES_ROL: readonly OpcionDeFiltro<TipoUsuario>[] = TIPO_USUARIO.map(
  (tipo) => ({ valor: tipo, etiqueta: ETIQUETA_TIPO_USUARIO[tipo] }),
);

const OPCIONES_ESTADO: readonly OpcionDeFiltro<EstadoCuenta>[] =
  ESTADO_CUENTA.map((estado) => ({
    valor: estado,
    etiqueta: ETIQUETA_ESTADO_CUENTA[estado],
  }));

export function BarraDeFiltros({
  busqueda,
  tipo,
  estadoCuenta,
  alCambiarBusqueda,
  alCambiarTipo,
  alCambiarEstado,
}: {
  busqueda: string;
  tipo: TipoUsuario | null;
  estadoCuenta: EstadoCuenta | null;
  alCambiarBusqueda: (valor: string) => void;
  alCambiarTipo: (valor: TipoUsuario | null) => void;
  alCambiarEstado: (valor: EstadoCuenta | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
      <SearchField
        className="min-w-[280px] flex-1"
        onChange={alCambiarBusqueda}
        value={busqueda}
      >
        <Label className="sr-only">{TEXTOS_USUARIOS.buscarEtiqueta}</Label>
        <SearchField.Group className="border border-border bg-surface">
          <SearchField.SearchIcon />
          <SearchField.Input placeholder={TEXTOS_USUARIOS.buscar} />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>

      <SelectorDeFiltro
        alCambiar={alCambiarTipo}
        etiqueta={TEXTOS_USUARIOS.filtroRol}
        etiquetaTodos={TEXTOS_USUARIOS.todos}
        opciones={OPCIONES_ROL}
        valor={tipo}
      />

      <SelectorDeFiltro
        alCambiar={alCambiarEstado}
        etiqueta={TEXTOS_USUARIOS.filtroEstado}
        etiquetaTodos={TEXTOS_USUARIOS.todos}
        opciones={OPCIONES_ESTADO}
        valor={estadoCuenta}
      />

      {/**
       * "Más filtros" está en la maquetación, pero `filtrosUsuarioSchema`
       * define solamente los tres que ya están en la barra. Se conserva en su
       * posición y desactivado, con la explicación en el tooltip: agregar
       * filtros que la API no acepta sería inventar un requerimiento.
       */}
      <BotonNoDisponible motivo={TEXTOS_USUARIOS.masFiltrosNoDisponible}>
        <IconoFiltro className="size-4" />
        {TEXTOS_USUARIOS.masFiltros}
      </BotonNoDisponible>
    </div>
  );
}
