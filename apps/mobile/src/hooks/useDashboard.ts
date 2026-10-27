import type {
  ActividadCocinero,
  EvolucionPlato,
  RangoDashboard,
} from '@foodhub/shared';
import {
  keepPreviousData,
  useQuery,
  type UseQueryResult,
} from '@tanstack/react-query';
import { obtenerActividad, obtenerEvolucionDePlato } from '../api/dashboard';
import { useSesion } from './useSesion';

/** Clave de la actividad del cocinero. El rango forma parte de la identidad. */
export const CLAVE_ACTIVIDAD = ['dashboard', 'actividad'] as const;

/**
 * Las cuatro secciones de PAN-DASH-01 para un período (US-DASH-01 a US-DASH-05).
 *
 * `placeholderData: keepPreviousData` ES LO QUE CUMPLE US-DASH-05. Al cambiar de
 * período la clave cambia, y sin esto React Query devolvería `isPending` con los
 * datos en `undefined`: la pantalla entera parpadearía a esqueleto y volvería.
 * Con los datos anteriores en su lugar, el cocinero ve los números viejos hasta
 * que llegan los nuevos, que es lo que el criterio describe como "actualice de
 * forma inmediata".
 *
 * `staleTime` corto: las métricas cambian con cada pedido que entra, y el
 * cocinero suele abrir esta pantalla justo después de completar uno.
 */
export function useActividadDelCocinero(
  rango: RangoDashboard,
): UseQueryResult<ActividadCocinero, Error> {
  const sesion = useSesion((estado) => estado.sesion);

  return useQuery({
    queryKey: [...CLAVE_ACTIVIDAD, rango.desde, rango.hasta],
    queryFn: () => obtenerActividad(rango),
    enabled: sesion !== null,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

/**
 * Evolución de un plato para el mismo período con que se abrió desde el
 * ranking. Comparte el prefijo `dashboard`, así que lo que invalide la
 * actividad también la invalida a ella.
 */
export function useEvolucionDePlato(
  publicacionId: string,
  rango: RangoDashboard,
): UseQueryResult<EvolucionPlato, Error> {
  const sesion = useSesion((estado) => estado.sesion);

  return useQuery({
    queryKey: ['dashboard', 'plato', publicacionId, rango.desde, rango.hasta],
    queryFn: () => obtenerEvolucionDePlato(publicacionId, rango),
    enabled: sesion !== null && publicacionId.length > 0,
    staleTime: 60_000,
  });
}
