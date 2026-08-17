import {
  ESTADO_HABILITACION_MOTIVO,
  TIPO_USUARIO_CANCELACION,
} from '@foodhub/shared';
import type {
  EstadoHabilitacionMotivo,
  TipoUsuarioCancelacion,
} from '@foodhub/shared';
import {
  SelectorDeFiltro,
  type OpcionDeFiltro,
} from '../../../components/SelectorDeFiltro.js';
import { ETIQUETA_TIPO_USUARIO_CANCELACION } from '../../../lib/etiquetas.js';
import { TEXTOS_MOTIVOS } from '../../../lib/textos.js';

/** Barra de filtros de PAN-ADM-04 — US-CFG-02: por aplicabilidad y por estado. */

const OPCIONES_APLICABILIDAD: readonly OpcionDeFiltro<TipoUsuarioCancelacion>[] =
  TIPO_USUARIO_CANCELACION.map((codigo) => ({
    valor: codigo,
    etiqueta: ETIQUETA_TIPO_USUARIO_CANCELACION[codigo],
  }));

const OPCIONES_ESTADO: readonly OpcionDeFiltro<EstadoHabilitacionMotivo>[] =
  ESTADO_HABILITACION_MOTIVO.map((estado) => ({
    valor: estado,
    etiqueta:
      estado === 'HABILITADO'
        ? TEXTOS_MOTIVOS.habilitados
        : TEXTOS_MOTIVOS.deshabilitados,
  }));

export function BarraDeFiltros({
  aplicableA,
  estado,
  alCambiarAplicableA,
  alCambiarEstado,
}: {
  aplicableA: TipoUsuarioCancelacion | null;
  estado: EstadoHabilitacionMotivo | null;
  alCambiarAplicableA: (valor: TipoUsuarioCancelacion | null) => void;
  alCambiarEstado: (valor: EstadoHabilitacionMotivo | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
      <SelectorDeFiltro
        alCambiar={alCambiarAplicableA}
        etiqueta={TEXTOS_MOTIVOS.filtroAplicabilidad}
        etiquetaTodos={TEXTOS_MOTIVOS.todos}
        opciones={OPCIONES_APLICABILIDAD}
        valor={aplicableA}
      />

      <SelectorDeFiltro
        alCambiar={alCambiarEstado}
        etiqueta={TEXTOS_MOTIVOS.filtroEstado}
        etiquetaTodos={TEXTOS_MOTIVOS.todos}
        opciones={OPCIONES_ESTADO}
        valor={estado}
      />
    </div>
  );
}
