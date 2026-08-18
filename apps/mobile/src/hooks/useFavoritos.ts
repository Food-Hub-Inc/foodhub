import type {
  CocineroPublico,
  FavoritoRespuesta,
  Favoritos,
  PublicacionPublica,
} from '@foodhub/shared';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import {
  desmarcarCocineroFavorito,
  desmarcarPublicacionFavorita,
  marcarCocineroFavorito,
  marcarPublicacionFavorita,
  obtenerFavoritos,
} from '../api/exploracion';
import { CLAVE_EXPLORACION } from './useExploracion';
import { useSesion } from './useSesion';

/**
 * US-EXP-06 · Favoritos de cocinero y de publicación.
 *
 * LOS DOS TOGGLES SON OPTIMISTAS. Los dos primeros criterios de la historia
 * exigen que el ícono cambie "de forma inmediata", antes de la respuesta del
 * servidor. El patrón `onMutate` / `onError` / `onSettled` es el mismo que ya
 * resolvió `useCambiarDisponibilidad` en el módulo de Publicaciones: se escribe
 * la caché al instante, se revierte exactamente al estado anterior si el PUT o
 * el DELETE fallan, y se revalida al final éxito o error.
 *
 * Lo que se escribe de forma optimista es el `esFavorito` de la pantalla que
 * tiene el corazón -el perfil del cocinero o el detalle del plato-, no la lista
 * de "Mis favoritos": esa lista trae imagen, nombre y valoración de cada
 * elemento, datos que el toggle no conoce, así que inventarle una fila daría una
 * tarjeta a medio dibujar. Se invalida y se vuelve a pedir.
 */
export const CLAVE_FAVORITOS = [...CLAVE_EXPLORACION, 'favoritos'] as const;

/** US-EXP-06 · Las dos pestañas de "Mis favoritos". */
export function useFavoritos(): UseQueryResult<Favoritos, Error> {
  const sesion = useSesion((estado) => estado.sesion);

  return useQuery({
    queryKey: CLAVE_FAVORITOS,
    queryFn: obtenerFavoritos,
    enabled: sesion !== null,
  });
}

/** Argumento de los dos toggles: qué elemento y en qué estado está HOY. */
export interface AlternarFavorito {
  id: string;
  esFavorito: boolean;
}

/** Estado previo de la entrada de detalle, para poder revertirla. */
interface ContextoPrevio {
  previas: [QueryKey, unknown][];
}

/**
 * Fábrica de los dos toggles. Cocinero y publicación se diferencian solo en la
 * ruta y en el fragmento de clave de la pantalla que hay que actualizar; el
 * resto -optimismo, reversión, invalidación- es idéntico, y escribirlo dos veces
 * dejaría dos copias del `onMutate` divergiendo con el tiempo.
 */
function crearToggleDeFavorito<T extends CocineroPublico | PublicacionPublica>(
  fragmentoDeClave: 'cocinero' | 'publicacion',
) {
  return function useToggle(): UseMutationResult<
    FavoritoRespuesta,
    Error,
    AlternarFavorito,
    ContextoPrevio
  > {
    const cliente = useQueryClient();

    /**
     * Todas las entradas de detalle de ESTE elemento. Puede haber más de una
     * para el mismo cocinero -su clave incluye las coordenadas del cliente, ver
     * `useCocineroPublico`-, así que se seleccionan por predicado y no por
     * clave exacta.
     */
    const consultasDelElemento = {
      predicate: (query: { queryKey: QueryKey }) =>
        query.queryKey[0] === CLAVE_EXPLORACION[0] &&
        query.queryKey[1] === fragmentoDeClave,
    };

    return useMutation({
      mutationFn: ({ id, esFavorito }: AlternarFavorito) => {
        if (fragmentoDeClave === 'cocinero') {
          return esFavorito
            ? desmarcarCocineroFavorito(id)
            : marcarCocineroFavorito(id);
        }
        return esFavorito
          ? desmarcarPublicacionFavorita(id)
          : marcarPublicacionFavorita(id);
      },

      onMutate: async ({ id, esFavorito }) => {
        await cliente.cancelQueries(consultasDelElemento);

        const previas = cliente.getQueriesData(consultasDelElemento);

        cliente.setQueriesData<T>(consultasDelElemento, (detalle) =>
          detalle && detalle.id === id
            ? { ...detalle, esFavorito: !esFavorito }
            : detalle,
        );

        return { previas };
      },

      onError: (_error, _variables, contexto) => {
        contexto?.previas.forEach(([clave, datos]) => {
          cliente.setQueryData(clave, datos);
        });
      },

      /**
       * Se invalida el módulo entero, no solo el elemento: el feed cambia si el
       * filtro "Mis favoritos" está activo, y las dos pestañas de "Mis
       * favoritos" cambian siempre. Revalidar de más acá cuesta una consulta;
       * revalidar de menos deja un corazón mintiendo en otra pantalla.
       */
      onSettled: () => {
        void cliente.invalidateQueries({ queryKey: CLAVE_EXPLORACION });
      },
    });
  };
}

/** US-EXP-06 · Guardar o quitar un cocinero de favoritos. */
export const useAlternarCocineroFavorito =
  crearToggleDeFavorito<CocineroPublico>('cocinero');

/** US-EXP-06 · Guardar o quitar una publicación de favoritos. */
export const useAlternarPublicacionFavorita =
  crearToggleDeFavorito<PublicacionPublica>('publicacion');
