import type {
  CategoriaResumen,
  MotivoCancelacionRapido,
} from '@foodhub/shared';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { listarCategorias, listarMotivosDeCancelacion } from '../api/catalogo';
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

/** Clave de la consulta de motivos de cancelación. */
export const CLAVE_MOTIVOS_CANCELACION = [
  'catalogo',
  'motivos-cancelacion',
] as const;

/**
 * Motivos rápidos de cancelación del rol de la sesión (US-CFG-02, RF056).
 *
 * Los usan el rechazo del cocinero (US-PED-04) y la cancelación del cliente
 * (US-PED-09). Mismo `staleTime` largo que las categorías, y por el mismo
 * motivo: es una tabla de referencia que el administrador cambia rara vez.
 *
 * `habilitada` deja postergar la consulta hasta que la hoja de motivos se abre:
 * la mayoría de los pedidos no se cancelan ni se rechazan, así que pedir la
 * lista al entrar a cada pantalla sería gastar una request que casi nunca se
 * usa.
 */
export function useMotivosDeCancelacion(
  habilitada = true,
): UseQueryResult<MotivoCancelacionRapido[], Error> {
  const sesion = useSesion((estado) => estado.sesion);

  return useQuery({
    queryKey: CLAVE_MOTIVOS_CANCELACION,
    queryFn: listarMotivosDeCancelacion,
    enabled: sesion !== null && habilitada,
    staleTime: 10 * 60_000,
  });
}
