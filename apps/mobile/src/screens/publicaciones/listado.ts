import type { EstadoPublicacion, OrdenPublicacion } from '@foodhub/shared';
import { TEXTOS_PUBLICACIONES } from '../../lib/textos';

/**
 * Constantes compartidas por `MisPublicaciones`, `HojaDeFiltros` y
 * `HojaDeOrden` (US-PUB-05).
 *
 * Viven en un archivo aparte —y no exportadas desde los componentes que las
 * usan— porque `react-refresh/only-export-components` exige que un archivo
 * de componente solo exporte componentes: un archivo que mezcla un componente
 * con una constante pierde el Fast Refresh de Metro en cada guardado.
 */

/** Filtros combinables de US-PUB-05, en la forma que maneja la pantalla. */
export interface FiltrosSeleccionados {
  categoriaIds: string[];
  estados: EstadoPublicacion[];
  precioMinimo: string;
  precioMaximo: string;
}

export const SIN_FILTROS: FiltrosSeleccionados = {
  categoriaIds: [],
  estados: [],
  precioMinimo: '',
  precioMaximo: '',
};

/** Opciones del desplegable "Ordenar por", en el orden del criterio de aceptación. */
export const OPCIONES_ORDEN: { valor: OrdenPublicacion; etiqueta: string }[] = [
  { valor: 'RECIENTES', etiqueta: TEXTOS_PUBLICACIONES.ordenRecientes },
  { valor: 'NOMBRE', etiqueta: TEXTOS_PUBLICACIONES.ordenNombre },
  { valor: 'PRECIO_ASC', etiqueta: TEXTOS_PUBLICACIONES.ordenPrecioAsc },
  { valor: 'PRECIO_DESC', etiqueta: TEXTOS_PUBLICACIONES.ordenPrecioDesc },
  { valor: 'MAS_PEDIDOS', etiqueta: TEXTOS_PUBLICACIONES.ordenMasPedidos },
];

/** Opciones fijas del filtro de disponibilidad (multi-selección). */
export const OPCIONES_ESTADO: { valor: EstadoPublicacion; etiqueta: string }[] =
  [
    { valor: 'DISPONIBLE', etiqueta: TEXTOS_PUBLICACIONES.estadoDisponible },
    {
      valor: 'ULTIMAS_UNIDADES',
      etiqueta: TEXTOS_PUBLICACIONES.estadoUltimasUnidades,
    },
    {
      valor: 'NO_DISPONIBLE',
      etiqueta: TEXTOS_PUBLICACIONES.estadoNoDisponible,
    },
  ];
