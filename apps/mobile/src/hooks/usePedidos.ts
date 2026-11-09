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
  PaginaPedidos,
  PedidoDetalle,
  PestanaPedidosCliente,
  PestanaPedidosCocinero,
} from '@foodhub/shared';
import {
  aceptarPedido,
  cancelarPedido,
  completarPedido,
  confirmarPedido,
  listarMisPedidos,
  listarPedidosRecibidos,
  marcarPedidoListo,
  obtenerPedido,
  rechazarPedido,
} from '../api/pedidos';
import { CLAVE_CARRITO } from './useCarrito';
import { useSesion } from './useSesion';

/**
 * Módulo de Pedidos (US-PED-01 a US-PED-09).
 *
 * TRES DECISIONES QUE VALEN PARA TODO EL ARCHIVO
 *
 *   UNA CLAVE RAÍZ.  Todas las claves cuelgan de `CLAVE_PEDIDOS`, así que
 *       cualquier transición invalida el módulo entero con un prefijo: aceptar
 *       un pedido cambia su detalle, lo mueve de pestaña en la bandeja del
 *       cocinero Y actualiza el seguimiento que el cliente tiene abierto.
 *
 *   LAS TRANSICIONES DEVUELVEN EL DETALLE y se escribe directo en la caché del
 *       pedido tocado, además de invalidar los listados. Así la pantalla de
 *       detalle se actualiza sin una segunda vuelta a la red, pero las listas
 *       -que cambiaron de contenido y de contadores- sí se vuelven a pedir.
 *
 *   EL SEGUIMIENTO SE REFRESCA SOLO mientras el pedido está activo. Es la forma
 *       en que se implementa el "en tiempo real" de US-PED-02 / RF023 (decisión
 *       del equipo, 2026-08-19): refresco periódico con React Query en lugar de
 *       una suscripción de Supabase Realtime, que exigiría abrir políticas RLS
 *       de lectura sobre `pedido` para la clave anónima que viaja en el APK.
 */
export const CLAVE_PEDIDOS = ['pedidos'] as const;
const CLAVE_MIS_PEDIDOS = [...CLAVE_PEDIDOS, 'mios'] as const;
const CLAVE_RECIBIDOS = [...CLAVE_PEDIDOS, 'recibidos'] as const;

/**
 * Cada cuánto se revalida un pedido en curso, en milisegundos.
 *
 * Diez segundos es el equilibrio entre "el cliente ve el cambio casi al
 * instante" y no despertar la radio del teléfono cada dos segundos: el ciclo de
 * vida de un pedido se mide en minutos, no en segundos, y una espera de hasta
 * diez segundos para ver "Preparando" no cambia ninguna decisión del usuario.
 */
const REFRESCO_DE_SEGUIMIENTO_MS = 10_000;

/** Estados en los que el pedido todavía puede cambiar solo. */
function estaEnCurso(pedido: PedidoDetalle | undefined): boolean {
  return (
    pedido !== undefined &&
    (pedido.estado === 'CREADO' ||
      pedido.estado === 'ACEPTADO' ||
      pedido.estado === 'LISTO')
  );
}

// ---------------------------------------------------------------------------
// Lecturas
// ---------------------------------------------------------------------------

/**
 * US-PED-06 · Historial del cliente, con scroll infinito (PAN-PED-05).
 *
 * `keepPreviousData` evita que la lista parpadee al cambiar de pestaña: sin él,
 * cada toque en "Completados" vacía la pantalla hasta que llega la respuesta.
 */
export function useMisPedidos(
  pestana: PestanaPedidosCliente,
): UseInfiniteQueryResult<InfiniteData<PaginaPedidos>, Error> {
  const sesion = useSesion((estado) => estado.sesion);

  return useInfiniteQuery({
    queryKey: [...CLAVE_MIS_PEDIDOS, pestana],
    queryFn: ({ pageParam }) =>
      listarMisPedidos({ pestana, pagina: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (ultima) =>
      ultima.hayMas ? ultima.pagina + 1 : undefined,
    enabled: sesion !== null,
    placeholderData: keepPreviousData,
  });
}

/** US-PED-03 y US-PED-08 · Bandeja del cocinero (PAN-PED-04). */
export function usePedidosRecibidos(
  pestana: PestanaPedidosCocinero,
): UseInfiniteQueryResult<InfiniteData<PaginaPedidos>, Error> {
  const sesion = useSesion((estado) => estado.sesion);

  return useInfiniteQuery({
    queryKey: [...CLAVE_RECIBIDOS, pestana],
    queryFn: ({ pageParam }) =>
      listarPedidosRecibidos({ pestana, pagina: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (ultima) =>
      ultima.hayMas ? ultima.pagina + 1 : undefined,
    enabled: sesion !== null,
    placeholderData: keepPreviousData,
  });
}

/**
 * US-PED-02 y US-PED-07 · Un pedido, con su línea de tiempo.
 *
 * `seguir` enciende el refresco periódico y lo usan las pantallas que muestran
 * el estado vivo -el seguimiento del cliente y el detalle del pedido nuevo del
 * cocinero-. El refresco se apaga solo en cuanto el pedido llega a un estado
 * terminal: un pedido rechazado o completado ya no cambia, y seguir
 * consultándolo sería gastar batería y datos para recibir siempre lo mismo.
 */
export function usePedido(
  pedidoId: string,
  seguir = false,
): UseQueryResult<PedidoDetalle, Error> {
  const sesion = useSesion((estado) => estado.sesion);

  return useQuery({
    queryKey: [...CLAVE_PEDIDOS, pedidoId],
    queryFn: () => obtenerPedido(pedidoId),
    enabled: sesion !== null && pedidoId !== '',
    refetchInterval: (consulta) =>
      seguir && estaEnCurso(consulta.state.data)
        ? REFRESCO_DE_SEGUIMIENTO_MS
        : false,
  });
}

// ---------------------------------------------------------------------------
// Escrituras
// ---------------------------------------------------------------------------

/**
 * Deja la caché coherente después de una transición.
 *
 * Escribe el detalle que devolvió la API y marca como vencidos los dos
 * listados: el pedido cambió de pestaña y los contadores de todas las demás
 * también, así que reescribirlos a mano sería replicar en el cliente la lógica
 * de reparto por estado que ya vive en `@foodhub/shared`.
 */
function useAplicarTransicion() {
  const cliente = useQueryClient();

  return (detalle: PedidoDetalle) => {
    cliente.setQueryData<PedidoDetalle>(
      [...CLAVE_PEDIDOS, detalle.id],
      detalle,
    );
    void cliente.invalidateQueries({ queryKey: CLAVE_MIS_PEDIDOS });
    void cliente.invalidateQueries({ queryKey: CLAVE_RECIBIDOS });
  };
}

/**
 * US-PED-01 · Confirmar el pedido desde el carrito.
 *
 * Además de sembrar el detalle, VACÍA LA CACHÉ DEL CARRITO: el octavo criterio
 * de US-EXP-07 y el de US-PED-01 dicen que el carrito se vacía "una vez
 * registrado el pedido en el sistema", y el servidor ya lo borró. Sin esto, el
 * botón flotante seguiría mostrando el contador viejo hasta el próximo refetch.
 *
 * NO NAVEGA: la pantalla decide a dónde ir, igual que el resto de las
 * mutaciones del proyecto.
 */
export function useConfirmarPedido(): UseMutationResult<
  PedidoDetalle,
  Error,
  string | undefined
> {
  const cliente = useQueryClient();
  const aplicar = useAplicarTransicion();

  return useMutation({
    mutationFn: (instruccionesCliente?: string) =>
      confirmarPedido(instruccionesCliente),
    onSuccess: (detalle) => {
      cliente.setQueryData(CLAVE_CARRITO, { carrito: null, itemsQuitados: [] });
      aplicar(detalle);
    },
    onError: () => {
      // El 409 por platos que dejaron de estar disponibles llega con el carrito
      // ya depurado del lado del servidor: refrescarlo es lo que hace que el
      // aviso de US-EXP-07 aparezca sobre el carrito real y no sobre el viejo.
      void cliente.invalidateQueries({ queryKey: CLAVE_CARRITO });
    },
  });
}

/** US-PED-03 · "Aceptar" con el tiempo comprometido. */
export function useAceptarPedido(): UseMutationResult<
  PedidoDetalle,
  Error,
  { pedidoId: string; tiempoEstimadoPreparacionMin: number }
> {
  const aplicar = useAplicarTransicion();

  return useMutation({
    mutationFn: ({ pedidoId, tiempoEstimadoPreparacionMin }) =>
      aceptarPedido(pedidoId, tiempoEstimadoPreparacionMin),
    onSuccess: aplicar,
  });
}

/** US-PED-04 · "Confirmar rechazo", con motivo obligatorio. */
export function useRechazarPedido(): UseMutationResult<
  PedidoDetalle,
  Error,
  { pedidoId: string; motivoCancelacionId?: string; motivoTexto?: string }
> {
  const aplicar = useAplicarTransicion();

  return useMutation({
    mutationFn: ({ pedidoId, ...motivo }) => rechazarPedido(pedidoId, motivo),
    onSuccess: aplicar,
  });
}

/** US-PED-05 · Botón "Listo". */
export function useMarcarListo(): UseMutationResult<
  PedidoDetalle,
  Error,
  string
> {
  const aplicar = useAplicarTransicion();

  return useMutation({
    mutationFn: (pedidoId: string) => marcarPedidoListo(pedidoId),
    onSuccess: aplicar,
  });
}

/** US-PED-05 · Botón "Entregado", ya confirmado en el diálogo. */
export function useCompletarPedido(): UseMutationResult<
  PedidoDetalle,
  Error,
  string
> {
  const aplicar = useAplicarTransicion();

  return useMutation({
    mutationFn: (pedidoId: string) => completarPedido(pedidoId),
    onSuccess: aplicar,
  });
}

/** US-PED-09 · "Sí, cancelar", con motivo opcional. */
export function useCancelarPedido(): UseMutationResult<
  PedidoDetalle,
  Error,
  { pedidoId: string; motivoCancelacionId?: string; motivoTexto?: string }
> {
  const aplicar = useAplicarTransicion();

  return useMutation({
    mutationFn: ({ pedidoId, ...motivo }) => cancelarPedido(pedidoId, motivo),
    onSuccess: aplicar,
  });
}
