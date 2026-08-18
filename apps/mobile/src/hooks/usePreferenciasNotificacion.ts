import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type {
  GrupoPreferenciaNotificacion,
  PreferenciaNotificacionGrupo,
  PreferenciasNotificacion,
} from '@foodhub/shared';
import {
  actualizarPreferenciaNotificacion,
  obtenerPreferenciasNotificacion,
} from '../api/preferenciasNotificacion';
import { useSesion } from './useSesion';

const CLAVE_PREFERENCIAS_NOTIFICACION = ['preferencias-notificacion'] as const;

/** US-CFG-05 (RF059) · Los switches de PAN-CFG-01, ya agrupados y en el orden del rol. */
export function usePreferenciasNotificacion(): UseQueryResult<
  PreferenciasNotificacion,
  Error
> {
  const sesion = useSesion((estado) => estado.sesion);

  return useQuery({
    queryKey: CLAVE_PREFERENCIAS_NOTIFICACION,
    queryFn: obtenerPreferenciasNotificacion,
    enabled: sesion !== null,
  });
}

/**
 * Prende o apaga un grupo. Escribe la respuesta directo en la cache en lugar
 * de invalidar: la API ya devuelve el grupo actualizado, y un refetch
 * completo solo para reflejar un switch sería una vuelta de más.
 */
export function useActualizarPreferenciaNotificacion(): UseMutationResult<
  PreferenciaNotificacionGrupo,
  Error,
  { grupo: GrupoPreferenciaNotificacion; activa: boolean }
> {
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: ({ grupo, activa }) =>
      actualizarPreferenciaNotificacion(grupo, activa),
    onSuccess: (grupoActualizado) => {
      cliente.setQueryData<PreferenciasNotificacion>(
        CLAVE_PREFERENCIAS_NOTIFICACION,
        (actual) =>
          actual?.map((p) =>
            p.grupo === grupoActualizado.grupo ? grupoActualizado : p,
          ),
      );
    },
  });
}
