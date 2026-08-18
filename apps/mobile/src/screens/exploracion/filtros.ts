import type { CategoriaListado, Ubicacion } from '@foodhub/shared';
import type { FiltrosDelFeed } from '../../hooks/useExploracion';
import { TEXTOS_EXPLORACION } from '../../lib/textos';

/**
 * Estado y traducción de los filtros del feed (US-EXP-03).
 *
 * Vive en un archivo aparte -y no exportado desde el componente que lo usa-
 * porque `react-refresh/only-export-components` exige que un archivo de
 * componente solo exporte componentes: mezclar un componente con una constante
 * pierde el Fast Refresh de Metro en cada guardado. Mismo criterio que
 * `screens/publicaciones/listado.ts`.
 */

/**
 * Los cinco filtros de US-EXP-03 en la forma que maneja la pantalla.
 *
 * Los precios son `string` y no `number` porque salen de un `TextInput`: un
 * campo a medio escribir ("15") no es todavía un número válido, y forzarlo a
 * number obligaría a decidir qué hacer con la cadena vacía en cada tecla.
 */
export interface FiltrosDelFeedSeleccionados {
  categoriaIds: string[];
  precioMinimo: string;
  precioMaximo: string;
  distanciaMaximaKm: number | null;
  valoracionMinima: number | null;
  soloFavoritos: boolean;
}

export const SIN_FILTROS_DEL_FEED: FiltrosDelFeedSeleccionados = {
  categoriaIds: [],
  precioMinimo: '',
  precioMaximo: '',
  distanciaMaximaKm: null,
  valoracionMinima: null,
  soloFavoritos: false,
};

/**
 * [PROPIO] Opciones del filtro de distancia, en kilómetros.
 *
 * US-EXP-03 nombra el filtro pero no fija sus valores ni si es un deslizador o
 * una lista. Se eligen cinco radios fijos por el principio 6 de la guía de UX
 * ("reconocer antes que recordar"): elegir "5 km" de una lista es más preciso
 * que acertarle con el dedo a un deslizador, y además deja el filtro legible en
 * su chip.
 */
export const OPCIONES_DISTANCIA_KM = [1, 3, 5, 10, 25] as const;

/**
 * [PROPIO] Opciones del filtro de valoración mínima.
 *
 * Arranca en 3 y no en 1: "de 1 estrella para arriba" no excluye nada, así que
 * ofrecerlo sería un control que no hace nada.
 */
export const OPCIONES_VALORACION_MINIMA = [3, 4, 5] as const;

/** `true` si hay al menos un filtro puesto (sin contar el texto del buscador). */
export function hayFiltrosDelFeedActivos(
  filtros: FiltrosDelFeedSeleccionados,
): boolean {
  return (
    filtros.categoriaIds.length > 0 ||
    filtros.precioMinimo !== '' ||
    filtros.precioMaximo !== '' ||
    filtros.distanciaMaximaKm !== null ||
    filtros.valoracionMinima !== null ||
    filtros.soloFavoritos
  );
}

/**
 * Traduce el estado de la pantalla al contrato de la API.
 *
 * Los precios se descartan si no son un número: un campo con "abc" o a medio
 * borrar no debe viajar. `distanciaMaximaKm` se manda solo si además hay
 * coordenadas -sin punto de referencia el servidor lo ignoraría-, y las
 * coordenadas viajan juntas o no viajan, como exige `filtrosFeedSchema`.
 */
export function aFiltrosDelFeed(entrada: {
  busqueda: string;
  filtros: FiltrosDelFeedSeleccionados;
  coordenadas: Ubicacion | null;
}): FiltrosDelFeed {
  const { busqueda, filtros, coordenadas } = entrada;
  const minimo = Number(filtros.precioMinimo);
  const maximo = Number(filtros.precioMaximo);

  return {
    ...(busqueda ? { busqueda } : {}),
    ...(filtros.categoriaIds.length > 0
      ? { categoriaIds: filtros.categoriaIds }
      : {}),
    ...(filtros.precioMinimo !== '' && !Number.isNaN(minimo)
      ? { precioMinimo: minimo }
      : {}),
    ...(filtros.precioMaximo !== '' && !Number.isNaN(maximo)
      ? { precioMaximo: maximo }
      : {}),
    ...(coordenadas && filtros.distanciaMaximaKm !== null
      ? { distanciaMaximaKm: filtros.distanciaMaximaKm }
      : {}),
    ...(filtros.valoracionMinima !== null
      ? { valoracionMinima: filtros.valoracionMinima }
      : {}),
    ...(filtros.soloFavoritos ? { soloFavoritos: true } : {}),
    ...(coordenadas ? { lat: coordenadas.lat, lng: coordenadas.lng } : {}),
  };
}

/**
 * Un filtro activo, tal como se dibuja en su chip.
 *
 * El segundo criterio de US-EXP-03 exige que "cada filtro aplicado se muestre
 * visualmente como una etiqueta activa con opción de eliminarlo
 * individualmente". `quitar` es esa opción: devuelve los filtros SIN este,
 * dejando el resto intacto.
 */
export interface ChipDeFiltro {
  clave: string;
  etiqueta: string;
  quitar: () => FiltrosDelFeedSeleccionados;
}

/**
 * Arma la lista de chips a partir de los filtros y del catálogo de categorías.
 *
 * Las categorías necesitan el catálogo para poder nombrarse: el filtro guarda
 * ids, y un chip que dijera el uuid no le sirve a nadie. Si el catálogo todavía
 * no cargó, la categoría no produce chip -aparecerá cuando llegue-, en lugar de
 * mostrar un chip vacío.
 *
 * El precio produce UN chip y no dos aunque tenga dos campos: mínimo y máximo
 * son las dos puntas de un solo rango, y quitarlo los limpia juntos.
 */
export function chipsDeFiltro(
  filtros: FiltrosDelFeedSeleccionados,
  categorias: readonly CategoriaListado[],
): ChipDeFiltro[] {
  const chips: ChipDeFiltro[] = [];

  filtros.categoriaIds.forEach((id) => {
    const categoria = categorias.find((c) => c.id === id);
    if (!categoria) return;
    chips.push({
      clave: `categoria-${id}`,
      etiqueta: categoria.nombre,
      quitar: () => ({
        ...filtros,
        categoriaIds: filtros.categoriaIds.filter((otro) => otro !== id),
      }),
    });
  });

  if (filtros.precioMinimo !== '' || filtros.precioMaximo !== '') {
    chips.push({
      clave: 'precio',
      etiqueta: etiquetaDePrecio(filtros),
      quitar: () => ({ ...filtros, precioMinimo: '', precioMaximo: '' }),
    });
  }

  if (filtros.distanciaMaximaKm !== null) {
    chips.push({
      clave: 'distancia',
      etiqueta: TEXTOS_EXPLORACION.distanciaOpcion(filtros.distanciaMaximaKm),
      quitar: () => ({ ...filtros, distanciaMaximaKm: null }),
    });
  }

  if (filtros.valoracionMinima !== null) {
    chips.push({
      clave: 'valoracion',
      etiqueta: TEXTOS_EXPLORACION.valoracionOpcion(filtros.valoracionMinima),
      quitar: () => ({ ...filtros, valoracionMinima: null }),
    });
  }

  return chips;
}

/** Nombre del chip de precio, según qué punta del rango esté puesta. */
function etiquetaDePrecio(filtros: FiltrosDelFeedSeleccionados): string {
  if (filtros.precioMinimo !== '' && filtros.precioMaximo !== '') {
    return TEXTOS_EXPLORACION.chipPrecio(
      filtros.precioMinimo,
      filtros.precioMaximo,
    );
  }
  return filtros.precioMinimo !== ''
    ? TEXTOS_EXPLORACION.chipPrecioDesde(filtros.precioMinimo)
    : TEXTOS_EXPLORACION.chipPrecioHasta(filtros.precioMaximo);
}
