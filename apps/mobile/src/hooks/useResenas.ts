import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type {
  CalificacionACocinero,
  CalificarClienteInput,
  CalificarCocineroInput,
  CrearResenaInput,
  EditarResenaInput,
  EstadoCalificacionCocinero,
  EstadoResenaPublicacion,
  FiltrosResenas,
  MiCalificacionCliente,
  PaginaResenas,
  ReputacionCliente,
  ReputacionCocinero,
  ResenaPublica,
} from '@foodhub/shared';
import {
  calificarCliente,
  calificarCocinero,
  crearResena,
  editarResena,
  obtenerEstadoDeResenas,
  obtenerMiCalificacionDeCliente,
  obtenerReputacionDeCliente,
  obtenerCalificacionDeCocinero,
  obtenerEstadoDeCalificacion,
  obtenerReputacionDeCocinero,
  obtenerResena,
  obtenerResenasDeCocinero,
  editarCalificacionDeCocinero,
} from '../api/resenas';
import { useSesion } from './useSesion';

/**
 * Consultas y mutaciones del módulo de Reseñas (US-RES-01 a US-RES-03).
 *
 * QUÉ SE INVALIDA AL PUBLICAR UNA RESEÑA, Y POR QUÉ SON TANTAS COSAS. Una
 * reseña nueva mueve el promedio del plato y el del cocinero, y esos dos
 * números aparecen en media aplicación: el feed, el mapa, los favoritos, el
 * perfil público, el detalle del plato y el listado propio del cocinero. Si no
 * se invalidan, el cliente publica cinco estrellas y sigue viendo el promedio
 * viejo hasta que la caché expire, que es exactamente el bug que hace parecer
 * que la reseña no se guardó.
 */

export const CLAVE_RESENAS = ['resenas'] as const;
export const CLAVE_ESTADO_RESENAS = ['resenas', 'estado'] as const;
export const CLAVE_CALIFICACION_CLIENTE = ['resenas', 'cliente'] as const;

/** Todo lo que muestra un promedio y queda viejo al publicar o editar una reseña. */
const CLAVES_AFECTADAS_POR_UNA_RESENA = [
  ['resenas'],
  ['exploracion'],
  ['favoritos'],
  ['publicaciones'],
  ['pedidos'],
] as const;

function useInvalidarPromedios(): () => void {
  const cliente = useQueryClient();

  return () => {
    for (const clave of CLAVES_AFECTADAS_POR_UNA_RESENA) {
      void cliente.invalidateQueries({ queryKey: clave });
    }
  };
}

// ---------------------------------------------------------------------------
// US-RES-01 · Reseña de un plato
// ---------------------------------------------------------------------------

/**
 * RF031 — Estado de reseña de cada plato de un pedido.
 *
 * `enabled` con la lista vacía evita una request inútil: un pedido siempre
 * tiene ítems, pero la pantalla los recibe de forma asíncrona y en el primer
 * render todavía no los tiene.
 */
export function useEstadoDeResenas(
  publicacionIds: readonly string[],
): UseQueryResult<EstadoResenaPublicacion[], Error> {
  const sesion = useSesion((estado) => estado.sesion);

  return useQuery({
    queryKey: [...CLAVE_ESTADO_RESENAS, ...publicacionIds],
    queryFn: async () => (await obtenerEstadoDeResenas(publicacionIds)).datos,
    enabled: sesion !== null && publicacionIds.length > 0,
    staleTime: 30_000,
  });
}

/** Una reseña puntual, para precargar la edición o mostrarla en solo lectura. */
export function useResena(
  resenaId: string | null,
): UseQueryResult<ResenaPublica, Error> {
  return useQuery({
    queryKey: [...CLAVE_RESENAS, 'detalle', resenaId],
    queryFn: () => obtenerResena(resenaId ?? ''),
    enabled: resenaId !== null,
  });
}

export function useCrearResena(): UseMutationResult<
  ResenaPublica,
  Error,
  CrearResenaInput
> {
  const invalidar = useInvalidarPromedios();

  return useMutation({
    mutationFn: crearResena,
    onSuccess: invalidar,
  });
}

export function useEditarResena(
  resenaId: string,
): UseMutationResult<ResenaPublica, Error, EditarResenaInput> {
  const invalidar = useInvalidarPromedios();

  return useMutation({
    mutationFn: (datos: EditarResenaInput) => editarResena(resenaId, datos),
    onSuccess: invalidar,
  });
}

// ---------------------------------------------------------------------------
// US-RES-03 · Perfil público del cocinero
// ---------------------------------------------------------------------------

/**
 * Listado y resumen de reseñas de un cocinero, paginado de a bloques.
 *
 * US-RES-03 pide diez reseñas por defecto y bloques adicionales de diez al
 * hacer scroll, así que es `useInfiniteQuery` y no `useQuery`: la pantalla
 * acumula las páginas en lugar de reemplazarlas.
 *
 * `keepPreviousData` por el mismo motivo que el dashboard: al cambiar el orden
 * o un filtro la clave cambia, y sin esto la sección entera parpadearía a
 * esqueleto en vez de actualizar el listado en el lugar.
 *
 * EL CORTE SE CALCULA CONTRA `total` Y NO CONTRA EL LARGO DE LA ÚLTIMA PÁGINA.
 * Una página puede venir corta sin ser la última si la moderación ocultó alguna
 * fila entre dos consultas; comparar cuántas se acumularon contra el total que
 * informa el servidor no depende de ese detalle.
 */
export function useResenasDeCocinero(
  cocineroId: string,
  filtros: Partial<FiltrosResenas>,
): UseInfiniteQueryResult<InfiniteData<PaginaResenas>, Error> {
  const sesion = useSesion((estado) => estado.sesion);

  return useInfiniteQuery({
    queryKey: [
      ...CLAVE_RESENAS,
      'cocinero',
      cocineroId,
      filtros.orden ?? 'MAS_RECIENTES',
      (filtros.estrellas ?? []).join(','),
      filtros.soloConFoto ?? false,
    ],
    queryFn: ({ pageParam }) =>
      obtenerResenasDeCocinero(cocineroId, { ...filtros, pagina: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (ultima) =>
      ultima.pagina * ultima.porPagina < ultima.total
        ? ultima.pagina + 1
        : undefined,
    enabled: sesion !== null && cocineroId.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

// ---------------------------------------------------------------------------
// US-RES-02 · Calificación del cocinero al cliente
// ---------------------------------------------------------------------------

/**
 * Lo que este cocinero ya opinó del cliente, o `null` si todavía no lo calificó.
 *
 * De esto sale la etiqueta del botón: "Calificar cliente" con `null`, "Editar
 * calificación" con un valor.
 */
export function useMiCalificacionDeCliente(
  clienteId: string,
): UseQueryResult<MiCalificacionCliente | null, Error> {
  const sesion = useSesion((estado) => estado.sesion);

  return useQuery({
    queryKey: [...CLAVE_CALIFICACION_CLIENTE, clienteId, 'mia'],
    queryFn: () => obtenerMiCalificacionDeCliente(clienteId),
    enabled: sesion !== null && clienteId.length > 0,
  });
}

/** Reputación agregada del cliente, para el detalle del pedido del cocinero. */
export function useReputacionDeCliente(
  clienteId: string,
): UseQueryResult<ReputacionCliente, Error> {
  const sesion = useSesion((estado) => estado.sesion);

  return useQuery({
    queryKey: [...CLAVE_CALIFICACION_CLIENTE, clienteId, 'reputacion'],
    queryFn: () => obtenerReputacionDeCliente(clienteId),
    enabled: sesion !== null && clienteId.length > 0,
    staleTime: 60_000,
  });
}

export function useCalificarCliente(
  clienteId: string,
): UseMutationResult<MiCalificacionCliente, Error, CalificarClienteInput> {
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: (datos: CalificarClienteInput) =>
      calificarCliente(clienteId, datos),
    onSuccess: () => {
      // La reputación del cliente y el botón del detalle del pedido dependen
      // de esta calificación: los dos quedan viejos apenas se guarda.
      void cliente.invalidateQueries({
        queryKey: [...CLAVE_CALIFICACION_CLIENTE, clienteId],
      });
      void cliente.invalidateQueries({ queryKey: ['pedidos'] });
    },
  });
}

// ---------------------------------------------------------------------------
// US-RES-07 · Calificación del cliente al cocinero
// ---------------------------------------------------------------------------

export const CLAVE_CALIFICACION_COCINERO = ['resenas', 'cocinero'] as const;

/**
 * RF031 — Qué acción corresponde para la calificación al cocinero del pedido.
 *
 * De acá salen los tres estados del botón del detalle: "Calificar al cocinero",
 * "Editar mi calificación" o "Ver mi calificación".
 */
export function useEstadoDeCalificacion(
  pedidoId: string,
): UseQueryResult<EstadoCalificacionCocinero, Error> {
  const sesion = useSesion((estado) => estado.sesion);

  return useQuery({
    queryKey: [...CLAVE_CALIFICACION_COCINERO, 'estado', pedidoId],
    queryFn: () => obtenerEstadoDeCalificacion(pedidoId),
    enabled: sesion !== null && pedidoId.length > 0,
    staleTime: 30_000,
  });
}

/** Una calificación puntual, para precargar la edición o verla en solo lectura. */
export function useCalificacionDeCocinero(
  calificacionId: string | null,
): UseQueryResult<CalificacionACocinero, Error> {
  return useQuery({
    queryKey: [...CLAVE_CALIFICACION_COCINERO, 'detalle', calificacionId],
    queryFn: () => obtenerCalificacionDeCocinero(calificacionId ?? ''),
    enabled: calificacionId !== null,
  });
}

/** RF082 — Bloque de reputación del perfil público. */
export function useReputacionDeCocinero(
  cocineroId: string,
): UseQueryResult<ReputacionCocinero, Error> {
  const sesion = useSesion((estado) => estado.sesion);

  return useQuery({
    queryKey: [...CLAVE_CALIFICACION_COCINERO, 'reputacion', cocineroId],
    queryFn: () => obtenerReputacionDeCocinero(cocineroId),
    enabled: sesion !== null && cocineroId.length > 0,
    staleTime: 60_000,
  });
}

/**
 * Lo que hay que invalidar al calificar a un cocinero.
 *
 * SON MÁS COSAS QUE AL RESEÑAR UN PLATO. La calificación mueve la reputación
 * del cocinero, que aparece en su perfil público, y además cambia el botón del
 * detalle del pedido. `exploracion` entra en la lista porque el perfil público
 * se sirve desde ahí.
 */
function useInvalidarReputacion(): () => void {
  const cliente = useQueryClient();

  return () => {
    void cliente.invalidateQueries({ queryKey: CLAVE_CALIFICACION_COCINERO });
    void cliente.invalidateQueries({ queryKey: ['exploracion'] });
    void cliente.invalidateQueries({ queryKey: ['pedidos'] });
  };
}

export function useCalificarCocinero(
  pedidoId: string,
): UseMutationResult<CalificacionACocinero, Error, CalificarCocineroInput> {
  const invalidar = useInvalidarReputacion();

  return useMutation({
    mutationFn: (datos: CalificarCocineroInput) =>
      calificarCocinero(pedidoId, datos),
    onSuccess: invalidar,
  });
}

export function useEditarCalificacionDeCocinero(
  calificacionId: string,
): UseMutationResult<CalificacionACocinero, Error, CalificarCocineroInput> {
  const invalidar = useInvalidarReputacion();

  return useMutation({
    mutationFn: (datos: CalificarCocineroInput) =>
      editarCalificacionDeCocinero(calificacionId, datos),
    onSuccess: invalidar,
  });
}
