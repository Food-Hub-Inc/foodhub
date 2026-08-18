import type {
  CocineroMapa,
  CocineroPublico,
  FiltrosFeed,
  PaginaFeed,
  PublicacionPublica,
  Ubicacion,
  ZonaVisible,
} from '@foodhub/shared';
import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import {
  listarCocinerosDelMapa,
  listarFeed,
  obtenerCocineroPublico,
  obtenerPublicacionPublica,
} from '../api/exploracion';
import { useSesion } from './useSesion';

/**
 * Lecturas del módulo de Exploración y búsqueda (US-EXP-01 a US-EXP-05).
 *
 * Las claves de caché arrancan todas con `CLAVE_EXPLORACION` para que las
 * mutaciones de favoritos puedan invalidar el módulo entero con un prefijo -un
 * corazón tocado en el detalle cambia el `esFavorito` del perfil y, si el filtro
 * "Mis favoritos" está activo, también el feed-.
 */
export const CLAVE_EXPLORACION = ['exploracion'] as const;
export const CLAVE_FEED = [...CLAVE_EXPLORACION, 'feed'] as const;

/** Los filtros del feed sin la página: la maneja el scroll infinito. */
export type FiltrosDelFeed = Omit<FiltrosFeed, 'pagina'>;

/**
 * US-EXP-01 y US-EXP-03 · Feed con scroll infinito.
 *
 * `useInfiniteQuery` y no `useQuery` con un paginador: el cuarto criterio de
 * US-EXP-01 pide que al llegar al final se carguen más publicaciones "sin
 * redirigir al usuario ni recargar la pantalla completa", que es exactamente lo
 * que un paginador numerado -el de PAN-PUB-01- no hace.
 *
 * `getNextPageParam` se apoya en `hayMas`, que la API calcula pidiendo una fila
 * de más: así no hay que comparar un total contra el offset.
 *
 * `keepPreviousData` conserva los resultados anteriores mientras llega la
 * consulta nueva. Importa más acá que en el listado del cocinero: US-EXP-03 exige
 * que los filtros se apliquen "de forma inmediata", así que cada tecla del
 * buscador dispara una consulta y sin esto la lista parpadearía en cada una.
 */
export function useFeed(
  filtros: FiltrosDelFeed,
): UseInfiniteQueryResult<InfiniteData<PaginaFeed>, Error> {
  const sesion = useSesion((estado) => estado.sesion);

  return useInfiniteQuery({
    queryKey: [...CLAVE_FEED, filtros],
    queryFn: ({ pageParam }) => listarFeed({ ...filtros, pagina: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (ultima) =>
      ultima.hayMas ? ultima.pagina + 1 : undefined,
    enabled: sesion !== null,
    placeholderData: keepPreviousData,
  });
}

/**
 * US-EXP-02 · Cocineros con marcador en la zona visible del mapa.
 *
 * `zona` es `null` hasta que el mapa reporta su primera región, y el hook queda
 * deshabilitado hasta entonces: sin saber qué se está mirando no hay nada que
 * pedir.
 *
 * `keepPreviousData` es lo que evita que los marcadores desaparezcan mientras el
 * usuario arrastra el mapa: cada desplazamiento cambia la clave y, sin esto, el
 * mapa quedaría vacío entre consulta y consulta.
 */
export function useCocinerosDelMapa(
  zona: ZonaVisible | null,
): UseQueryResult<CocineroMapa[], Error> {
  const sesion = useSesion((estado) => estado.sesion);

  return useQuery({
    queryKey: [...CLAVE_EXPLORACION, 'mapa', zona],
    queryFn: () => listarCocinerosDelMapa(zona!),
    enabled: sesion !== null && zona !== null,
    placeholderData: keepPreviousData,
  });
}

/**
 * US-EXP-04 · Perfil público de un cocinero.
 *
 * Las coordenadas forman parte de la clave: el perfil muestra la distancia al
 * cliente, así que el mismo cocinero visto desde dos lugares distintos NO es la
 * misma respuesta.
 */
export function useCocineroPublico(
  id: string | undefined,
  coordenadas: Ubicacion | null,
): UseQueryResult<CocineroPublico, Error> {
  const sesion = useSesion((estado) => estado.sesion);

  return useQuery({
    queryKey: [...CLAVE_EXPLORACION, 'cocinero', id, coordenadas],
    queryFn: () => obtenerCocineroPublico(id ?? '', coordenadas),
    enabled: sesion !== null && id !== undefined,
  });
}

/** US-EXP-05 · Detalle público de un plato. */
export function usePublicacionPublica(
  id: string | undefined,
): UseQueryResult<PublicacionPublica, Error> {
  const sesion = useSesion((estado) => estado.sesion);

  return useQuery({
    queryKey: [...CLAVE_EXPLORACION, 'publicacion', id],
    queryFn: () => obtenerPublicacionPublica(id ?? ''),
    enabled: sesion !== null && id !== undefined,
  });
}
