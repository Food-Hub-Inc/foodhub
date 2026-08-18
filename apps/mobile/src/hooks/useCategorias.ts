import type { CategoriaResumen } from '@foodhub/shared';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { listarCategorias } from '../api/catalogo';
import { useSesion } from './useSesion';

/** Clave de la consulta de categorías. Se comparte para poder invalidarla. */
export const CLAVE_CATEGORIAS = ['catalogo', 'categorias'] as const;

/**
 * Categorías activas (US-PUB-01, desplegable del formulario de plato;
 * US-PUB-05, filtro por categoría del listado propio).
 *
 * `staleTime` largo: es una tabla de referencia que el administrador cambia
 * rara vez, no un dato de negocio que se invalide seguido.
 */
export function useCategorias(): UseQueryResult<CategoriaResumen[], Error> {
  const sesion = useSesion((estado) => estado.sesion);

  return useQuery({
    queryKey: CLAVE_CATEGORIAS,
    queryFn: listarCategorias,
    enabled: sesion !== null,
    staleTime: 10 * 60_000,
  });
}
