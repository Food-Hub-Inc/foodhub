import type {
  FiltrosPublicacion,
  PaginaPublicaciones,
  PublicacionDetalle,
} from '@foodhub/shared';
import {
  keepPreviousData,
  useQuery,
  type UseQueryResult,
} from '@tanstack/react-query';
import {
  listarMisPublicaciones,
  obtenerMiPublicacion,
} from '../api/publicaciones';
import { useSesion } from './useSesion';

/**
 * Clave base del listado propio. Se comparte para poder invalidarla desde
 * las mutaciones que agregan las historias siguientes (crear, editar,
 * disponibilidad, eliminar).
 */
export const CLAVE_PUBLICACIONES = ['publicaciones', 'propias'] as const;

/**
 * US-PUB-05 · "Mis publicaciones" — listado paginado y filtrado.
 *
 * `keepPreviousData` conserva la página anterior en pantalla mientras llega
 * la nueva: sin esto, cada cambio de filtro o de página muestra el esqueleto
 * de carga y el listado "parpadea" en vez de reemplazarse con suavidad.
 */
export function usePublicacionesPropias(
  filtros: FiltrosPublicacion,
): UseQueryResult<PaginaPublicaciones, Error> {
  const sesion = useSesion((estado) => estado.sesion);

  return useQuery({
    queryKey: [...CLAVE_PUBLICACIONES, filtros],
    queryFn: () => listarMisPublicaciones(filtros),
    enabled: sesion !== null,
    placeholderData: keepPreviousData,
  });
}

/** US-PUB-05 · Detalle de una publicación propia. */
export function usePublicacionPropia(
  id: string | undefined,
): UseQueryResult<PublicacionDetalle, Error> {
  const sesion = useSesion((estado) => estado.sesion);

  return useQuery({
    queryKey: [...CLAVE_PUBLICACIONES, 'detalle', id],
    queryFn: () => obtenerMiPublicacion(id ?? ''),
    enabled: sesion !== null && id !== undefined,
  });
}
