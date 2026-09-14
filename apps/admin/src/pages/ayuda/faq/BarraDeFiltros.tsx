import {
  ESTADO_HABILITACION_AYUDA,
  ETIQUETAS_ROL_DESTINO_AYUDA,
  ROL_DESTINO_AYUDA,
  categoriasFaqDeRol,
  type EstadoHabilitacionAyuda,
  type RolDestinoAyuda,
} from '@foodhub/shared';
import {
  SelectorDeFiltro,
  type OpcionDeFiltro,
} from '../../../components/SelectorDeFiltro.js';
import { TEXTOS_GESTION_AYUDA } from '../../../lib/textos.js';

/**
 * Barra de filtros de las FAQ — US-AYU-05: por rol destinatario, categoría y
 * estado. Las categorías del filtro son la unión de las dos listas por rol,
 * porque el filtro no depende de un rol elegido.
 */

const OPCIONES_ROL: readonly OpcionDeFiltro<RolDestinoAyuda>[] =
  ROL_DESTINO_AYUDA.map((codigo) => ({
    valor: codigo,
    etiqueta: ETIQUETAS_ROL_DESTINO_AYUDA[codigo],
  }));

const OPCIONES_CATEGORIA: readonly OpcionDeFiltro<string>[] =
  categoriasFaqDeRol('AMBOS').map((categoria) => ({
    valor: categoria,
    etiqueta: categoria,
  }));

const OPCIONES_ESTADO: readonly OpcionDeFiltro<EstadoHabilitacionAyuda>[] =
  ESTADO_HABILITACION_AYUDA.map((estado) => ({
    valor: estado,
    etiqueta:
      estado === 'HABILITADO'
        ? TEXTOS_GESTION_AYUDA.habilitados
        : TEXTOS_GESTION_AYUDA.deshabilitados,
  }));

export function BarraDeFiltros({
  rolDestino,
  categoria,
  estado,
  alCambiarRol,
  alCambiarCategoria,
  alCambiarEstado,
}: {
  rolDestino: RolDestinoAyuda | null;
  categoria: string | null;
  estado: EstadoHabilitacionAyuda | null;
  alCambiarRol: (valor: RolDestinoAyuda | null) => void;
  alCambiarCategoria: (valor: string | null) => void;
  alCambiarEstado: (valor: EstadoHabilitacionAyuda | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
      <SelectorDeFiltro
        alCambiar={alCambiarRol}
        etiqueta={TEXTOS_GESTION_AYUDA.filtroRol}
        etiquetaTodos={TEXTOS_GESTION_AYUDA.todos}
        opciones={OPCIONES_ROL}
        valor={rolDestino}
      />

      <SelectorDeFiltro
        alCambiar={alCambiarCategoria}
        etiqueta={TEXTOS_GESTION_AYUDA.filtroCategoria}
        etiquetaTodos={TEXTOS_GESTION_AYUDA.todos}
        opciones={OPCIONES_CATEGORIA}
        valor={categoria}
      />

      <SelectorDeFiltro
        alCambiar={alCambiarEstado}
        etiqueta={TEXTOS_GESTION_AYUDA.filtroEstado}
        etiquetaTodos={TEXTOS_GESTION_AYUDA.todos}
        opciones={OPCIONES_ESTADO}
        valor={estado}
      />
    </div>
  );
}
