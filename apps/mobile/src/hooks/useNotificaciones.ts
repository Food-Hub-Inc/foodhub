import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type UseInfiniteQueryResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { Notificacion, PaginaNotificaciones } from '@foodhub/shared';
import {
  marcarNotificacionesLeidas,
  obtenerNoLeidas,
  obtenerNotificacion,
  obtenerNotificaciones,
} from '../api/notificaciones';
import { useSesion } from './useSesion';

/**
 * US-NOT-07 · Historial de notificaciones (PAN-NOT-01) y contador de la campana.
 *
 * El historial se pagina por offset con scroll infinito. El contador de no
 * leídas es una consulta aparte y liviana: vive en el encabezado del feed, que
 * está montado cuando PAN-NOT-01 no lo está.
 */

const CLAVE_NOTIFICACIONES = ['notificaciones'] as const;
export const CLAVE_HISTORIAL_NOTIFICACIONES = [
  ...CLAVE_NOTIFICACIONES,
  'historial',
] as const;
export const CLAVE_NO_LEIDAS = [...CLAVE_NOTIFICACIONES, 'no-leidas'] as const;

/** US-NOT-07 · La lista completa, paginada. */
export function useNotificaciones(): UseInfiniteQueryResult<
  { pages: PaginaNotificaciones[] },
  Error
> {
  const sesion = useSesion((estado) => estado.sesion);

  return useInfiniteQuery({
    queryKey: CLAVE_HISTORIAL_NOTIFICACIONES,
    queryFn: ({ pageParam }) => obtenerNotificaciones(pageParam),
    initialPageParam: 1,
    getNextPageParam: (ultima) =>
      ultima.pagina * ultima.porPagina < ultima.total
        ? ultima.pagina + 1
        : undefined,
    enabled: sesion !== null,
  });
}

/** PAN-NOT-03 · Una notificación puntual (el detalle de un aviso). */
export function useNotificacion(
  id: string | undefined,
): UseQueryResult<Notificacion, Error> {
  const sesion = useSesion((estado) => estado.sesion);

  return useQuery({
    queryKey: [...CLAVE_NOTIFICACIONES, 'detalle', id],
    queryFn: () => obtenerNotificacion(id ?? ''),
    enabled: sesion !== null && Boolean(id),
  });
}

/** Aplana las páginas del historial en una sola lista. */
export function aplanarNotificaciones(
  paginas: PaginaNotificaciones[] | undefined,
): Notificacion[] {
  return (paginas ?? []).flatMap((p) => p.datos);
}

/** US-NOT-07 · Contador del globo de la campana (PAN-EXP-01, PAN-PUB-01). */
export function useNoLeidas(): UseQueryResult<number, Error> {
  const sesion = useSesion((estado) => estado.sesion);

  return useQuery({
    queryKey: CLAVE_NO_LEIDAS,
    queryFn: async () => (await obtenerNoLeidas()).noLeidas,
    enabled: sesion !== null,
    // Se refresca al volver a la app: una notificación pudo llegar mientras
    // estaba en segundo plano. Realtime no cubre este módulo.
    refetchOnWindowFocus: true,
  });
}

/**
 * US-NOT-07 · Marca notificaciones como leídas.
 *
 * Sin `ids` (al abrir el historial): pone el contador de la campana en 0 al
 * instante -el criterio pide que "el indicador desaparece" al abrir- pero NO
 * invalida el historial, para que las tarjetas conserven su estilo de "no
 * leída" mientras el usuario las mira. Con `ids` (al tocar una, o "Marcar
 * todas" a mano): además refresca la lista para que la tarjeta se vea leída.
 */
export function useMarcarLeidas() {
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: (ids?: string[]) => marcarNotificacionesLeidas(ids),
    onSuccess: (_datos, ids) => {
      cliente.setQueryData<number>(CLAVE_NO_LEIDAS, 0);
      if (ids !== undefined) {
        void cliente.invalidateQueries({
          queryKey: CLAVE_HISTORIAL_NOTIFICACIONES,
        });
      }
    },
  });
}
