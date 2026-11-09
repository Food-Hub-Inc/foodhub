import type { TipoConsultaCatalogo } from '@foodhub/shared';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { listarTiposDeConsulta } from '../api/catalogo';

/**
 * US-AYU-03 - Catalogo de tipos de consulta activos.
 *
 * No requiere filtro por rol: el endpoint es publico para los usuarios
 * autenticados y la misma lista sirve para cliente y cocinero. La cache
 * se mantiene 5 minutos en memoria: el catalogo no cambia seguido y un
 * refetch agresivo gastaria cuotas de Supabase sin motivo.
 */
export const CLAVE_TIPOS_CONSULTA = ['catalogo', 'tipos-consulta'] as const;

export function useTiposDeConsulta(): UseQueryResult<
  TipoConsultaCatalogo[],
  Error
> {
  return useQuery({
    queryKey: CLAVE_TIPOS_CONSULTA,
    queryFn: listarTiposDeConsulta,
    staleTime: 5 * 60_000,
  });
}
