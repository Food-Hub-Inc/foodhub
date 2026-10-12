import { useQuery } from '@tanstack/react-query';
import { Label, SearchField } from '@heroui/react';
import { ESTADO_PUBLICACION, type EstadoPublicacion } from '@foodhub/shared';
import { listarCategorias } from '../../../api/categorias.js';
import {
  SelectorDeFiltro,
  type OpcionDeFiltro,
} from '../../../components/SelectorDeFiltro.js';
import { ETIQUETA_ESTADO_PUBLICACION } from '../../../lib/etiquetas.js';
import { TEXTOS_MODERACION_PUBLICACIONES as TEXTOS } from '../../../lib/textos.js';

/**
 * Barra de filtros de la pestaña "Publicaciones" — segundo criterio de
 * US-ADM-04: "nombre de plato, nombre de cocinero, categoría o estado de
 * disponibilidad".
 */

const OPCIONES_ESTADO: readonly OpcionDeFiltro<EstadoPublicacion>[] =
  ESTADO_PUBLICACION.map((estado) => ({
    valor: estado,
    etiqueta: ETIQUETA_ESTADO_PUBLICACION[estado],
  }));

/**
 * Las categorías salen del ABM de configuración y no del catálogo público:
 * éste trae solo las habilitadas, y una categoría deshabilitada puede seguir
 * teniendo publicaciones activas que moderar (US-CFG-01 no las toca).
 */
const TODAS_LAS_CATEGORIAS = {
  busqueda: '',
  estado: null,
  pagina: 1,
  porPagina: 100,
} as const;

export function BarraDeFiltros({
  busqueda,
  categoriaId,
  estadoPublicacion,
  alCambiarBusqueda,
  alCambiarCategoria,
  alCambiarEstado,
}: {
  busqueda: string;
  categoriaId: string | null;
  estadoPublicacion: EstadoPublicacion | null;
  alCambiarBusqueda: (valor: string) => void;
  alCambiarCategoria: (valor: string | null) => void;
  alCambiarEstado: (valor: EstadoPublicacion | null) => void;
}) {
  const categorias = useQuery({
    queryKey: ['categorias', TODAS_LAS_CATEGORIAS],
    queryFn: () => listarCategorias(TODAS_LAS_CATEGORIAS),
  });

  const opcionesCategoria: readonly OpcionDeFiltro<string>[] =
    categorias.data?.datos.map((categoria) => ({
      valor: categoria.id,
      etiqueta: categoria.nombre,
    })) ?? [];

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
      <SearchField
        className="min-w-[280px] flex-1"
        onChange={alCambiarBusqueda}
        value={busqueda}
      >
        <Label className="sr-only">{TEXTOS.buscarEtiqueta}</Label>
        <SearchField.Group className="border border-border bg-surface">
          <SearchField.SearchIcon />
          <SearchField.Input placeholder={TEXTOS.buscar} />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>

      <SelectorDeFiltro
        alCambiar={alCambiarCategoria}
        etiqueta={TEXTOS.filtroCategoria}
        etiquetaTodos={TEXTOS.todas}
        opciones={opcionesCategoria}
        valor={categoriaId}
      />

      <SelectorDeFiltro
        alCambiar={alCambiarEstado}
        etiqueta={TEXTOS.filtroEstado}
        etiquetaTodos={TEXTOS.todos}
        opciones={OPCIONES_ESTADO}
        valor={estadoPublicacion}
      />
    </div>
  );
}
