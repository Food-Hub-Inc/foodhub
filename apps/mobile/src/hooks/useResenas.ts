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
  CrearResenaInput,
  EditarResenaInput,
  EstadoResenaPersona,
  EstadoResenaPublicacion,
  FiltrosResenas,
  PaginaPedidos,
  PaginaResenas,
  PerfilPublicoCliente,
  ReaccionarInput,
  ReportarResenaInput,
  ReputacionCliente,
  ResenaPublica,
  ResponderResenaInput,
  RespuestaCocinero,
} from '@foodhub/shared';
import {
  crearResena,
  editarResena,
  editarRespuesta,
  eliminarMiResena,
  obtenerEstadoDeResenas,
  obtenerMiResenaDeCliente,
  obtenerMiResenaDeCocinero,
  obtenerPedidosConCliente,
  obtenerPerfilDeCliente,
  obtenerReputacionDeCliente,
  obtenerResena,
  obtenerResenas,
  reaccionar,
  reportarResena,
  responderResena,
  type OrigenDeResenas,
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
export function useResenasDe(
  origen: OrigenDeResenas,
  filtros: Partial<FiltrosResenas>,
): UseInfiniteQueryResult<InfiniteData<PaginaResenas>, Error> {
  const sesion = useSesion((estado) => estado.sesion);

  return useInfiniteQuery({
    /**
     * LA CLAVE LLEVA EL ORIGEN ENTERO Y LOS CUATRO FILTROS.
     *
     * `soloConRespuesta` faltaba, y esa omisión era un defecto real: el chip se
     * marcaba, la petición salía con el filtro puesto, pero React Query
     * devolvía la respuesta cacheada de la clave anterior. Para el usuario, el
     * filtro no hacía nada.
     *
     * El origen se serializa entero por el mismo motivo: dos listados sobre el
     * mismo cocinero —sus opiniones y las de sus platos— comparten `cocineroId`
     * y se pisarían entre sí.
     */
    queryKey: [
      ...CLAVE_RESENAS,
      'listado',
      JSON.stringify(origen),
      filtros.orden ?? 'MAS_RECIENTES',
      (filtros.estrellas ?? []).join(','),
      filtros.soloConFoto ?? false,
      filtros.soloConRespuesta ?? false,
    ],
    queryFn: ({ pageParam }) =>
      obtenerResenas(origen, { ...filtros, pagina: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (ultima) =>
      ultima.pagina * ultima.porPagina < ultima.total
        ? ultima.pagina + 1
        : undefined,
    enabled: sesion !== null,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

// ---------------------------------------------------------------------------
// US-RES-02 · Calificación del cocinero al cliente
// ---------------------------------------------------------------------------

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

/**
 * US-RES-02 — el cocinero reseña a un cliente.
 *
 * Envuelve el alta genérica en vez de tener endpoint propio: desde la
 * corrección del modelo es una reseña como cualquier otra, solo que su objeto
 * es una persona. El hook existe igual porque lo que invalida NO es lo mismo
 * que al reseñar un plato —acá no se mueve ningún promedio público— y porque
 * la pantalla no tiene por qué armar el discriminador a mano.
 */
export function useCalificarCliente(
  clienteId: string,
): UseMutationResult<
  ResenaPublica,
  Error,
  Omit<Extract<CrearResenaInput, { tipo: 'CLIENTE' }>, 'tipo' | 'clienteId'>
> {
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: (datos) =>
      crearResena({ ...datos, tipo: 'CLIENTE', clienteId }),
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

/** US-DASH-03 — Ficha del perfil público del cliente, para el cocinero. */
export function usePerfilDeCliente(
  clienteId: string,
): UseQueryResult<PerfilPublicoCliente, Error> {
  const sesion = useSesion((estado) => estado.sesion);

  return useQuery({
    queryKey: [...CLAVE_CALIFICACION_CLIENTE, clienteId, 'perfil'],
    queryFn: () => obtenerPerfilDeCliente(clienteId),
    enabled: sesion !== null && clienteId.length > 0,
    staleTime: 60_000,
  });
}

/** US-DASH-03 — Los pedidos que ese cliente le hizo al cocinero de la sesión. */
export function usePedidosConCliente(
  clienteId: string,
): UseInfiniteQueryResult<InfiniteData<PaginaPedidos>, Error> {
  const sesion = useSesion((estado) => estado.sesion);

  return useInfiniteQuery({
    queryKey: [...CLAVE_CALIFICACION_CLIENTE, clienteId, 'pedidos'],
    queryFn: ({ pageParam }) => obtenerPedidosConCliente(clienteId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (ultima, todas) =>
      ultima.hayMas ? todas.length + 1 : undefined,
    enabled: sesion !== null && clienteId.length > 0,
    staleTime: 60_000,
  });
}

// ---------------------------------------------------------------------------
// US-RES-07 · El cliente reseña al cocinero
// ---------------------------------------------------------------------------

export const CLAVE_CALIFICACION_COCINERO = ['resenas', 'cocinero'] as const;

/**
 * Qué puede hacer el cliente de la sesión con este cocinero.
 *
 * ES POR COCINERO Y NO POR PEDIDO. De acá salen los estados del botón del
 * perfil público y los del detalle del pedido, que ahora son los mismos: con
 * `mia` en `null` y `puedeResenar`, "Calificar al cocinero"; con `mia`,
 * "Editar mi calificación"; sin ninguno de los dos, el botón deshabilitado con
 * el motivo escrito debajo.
 *
 * Trae también la reseña vigente, así el formulario se precarga sin encadenar
 * una segunda consulta.
 */
export function useMiResenaDeCocinero(
  cocineroId: string,
): UseQueryResult<EstadoResenaPersona, Error> {
  const sesion = useSesion((estado) => estado.sesion);

  return useQuery({
    queryKey: [...CLAVE_CALIFICACION_COCINERO, 'mi-resena', cocineroId],
    queryFn: () => obtenerMiResenaDeCocinero(cocineroId),
    enabled: sesion !== null && cocineroId.length > 0,
    staleTime: 30_000,
  });
}

/**
 * US-RES-02 — Qué puede hacer el cocinero de la sesión con este cliente.
 *
 * De acá salen los dos estados del botón del detalle del pedido y los del
 * perfil del cliente. Es el espejo de `useMiResenaDeCocinero`, con el mismo
 * contrato: la reseña sobre una persona es una sola.
 */
export function useMiResenaDeCliente(
  clienteId: string,
): UseQueryResult<EstadoResenaPersona, Error> {
  const sesion = useSesion((estado) => estado.sesion);

  return useQuery({
    queryKey: [...CLAVE_CALIFICACION_CLIENTE, clienteId, 'mi-resena'],
    queryFn: () => obtenerMiResenaDeCliente(clienteId),
    enabled: sesion !== null && clienteId.length > 0,
    staleTime: 30_000,
  });
}

// ---------------------------------------------------------------------------
// US-RES-04, US-RES-05 y US-RES-06 · lo social
// ---------------------------------------------------------------------------

/**
 * Lo que queda viejo al reaccionar, responder o reportar.
 *
 * ES SOLO `resenas` Y NO LA LISTA LARGA de `CLAVES_AFECTADAS_POR_UNA_RESENA`:
 * ninguna de las tres mueve un promedio, así que el feed, el mapa y los
 * favoritos siguen siendo válidos. Invalidarlos igual haría que un "Me gusta"
 * recargara media aplicación.
 *
 * La excepción es eliminar la propia reseña, que sí saca la fila del promedio;
 * ese caso usa `useInvalidarPromedios`.
 */
function useInvalidarListados(): () => void {
  const cliente = useQueryClient();

  return () => {
    void cliente.invalidateQueries({ queryKey: CLAVE_RESENAS });
  };
}

export function useReaccionar(
  resenaId: string,
): UseMutationResult<void, Error, ReaccionarInput> {
  const invalidar = useInvalidarListados();

  return useMutation({
    mutationFn: (datos: ReaccionarInput) => reaccionar(resenaId, datos),
    onSuccess: invalidar,
  });
}

export function useResponderResena(
  resenaId: string,
): UseMutationResult<RespuestaCocinero, Error, ResponderResenaInput> {
  const invalidar = useInvalidarListados();

  return useMutation({
    mutationFn: (datos: ResponderResenaInput) =>
      responderResena(resenaId, datos),
    onSuccess: invalidar,
  });
}

export function useEditarRespuesta(
  respuestaId: string,
): UseMutationResult<RespuestaCocinero, Error, ResponderResenaInput> {
  const invalidar = useInvalidarListados();

  return useMutation({
    mutationFn: (datos: ResponderResenaInput) =>
      editarRespuesta(respuestaId, datos),
    onSuccess: invalidar,
  });
}

export function useReportarResena(
  resenaId: string,
): UseMutationResult<{ mensaje: string }, Error, ReportarResenaInput> {
  const invalidar = useInvalidarListados();

  return useMutation({
    mutationFn: (datos: ReportarResenaInput) => reportarResena(resenaId, datos),
    onSuccess: invalidar,
  });
}

/**
 * Retirar la propia reseña SÍ mueve los promedios: la fila deja de estar
 * VISIBLE y sale del promedio del plato y del cocinero. Por eso invalida la
 * lista completa y no solo los listados de reseñas.
 */
export function useEliminarMiResena(
  resenaId: string,
): UseMutationResult<void, Error, void> {
  const invalidar = useInvalidarPromedios();

  return useMutation({
    mutationFn: () => eliminarMiResena(resenaId),
    onSuccess: invalidar,
  });
}
