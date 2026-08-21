import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import type {
  ConversacionDetalle,
  ConversacionResumen,
  FiltroConversaciones,
} from '@foodhub/shared';
import * as apiMensajeria from '../api/mensajeria';

/**
 * Mensajería directa — consultas y escrituras de PAN-MSG-01 (US-MSG-01,
 * US-MSG-04, US-MSG-06 y US-MSG-07).
 *
 * DOS DECISIONES QUE VALEN PARA TODO EL ARCHIVO
 *
 *   UNA CLAVE RAÍZ.  Todo cuelga de `CLAVE_MENSAJERIA`, así que una escritura
 *       alcanza por prefijo a las consultas que dejó viejas. Enviar un mensaje
 *       reordena el listado, cambia el contador de no leídos de esa fila y, si
 *       la conversación estaba archivada, la mueve de filtro: tres efectos
 *       sobre el mismo listado, provocados por una sola acción.
 *
 *   EL LISTADO NO SE REFRESCA SOLO.  A diferencia del seguimiento del pedido,
 *       acá no hay `refetchInterval`: lo que llega en tiempo real lo trae
 *       Realtime (ver `useCanalDeChat`), y la pantalla de conversación invalida
 *       el listado cuando corresponde. Un intervalo encima de Realtime sería
 *       pedir dos veces lo mismo.
 *
 * El historial de mensajes NO vive acá: está en `useChat`, que además de la
 * consulta coordina la cola de envíos y la suscripción de tiempo real.
 */
export const CLAVE_MENSAJERIA = ['mensajeria'] as const;

export const claveConversacion = (conversacionId: string) =>
  [...CLAVE_MENSAJERIA, 'conversacion', conversacionId] as const;

export const claveMensajes = (conversacionId: string) =>
  [...CLAVE_MENSAJERIA, 'mensajes', conversacionId] as const;

/**
 * Refresca el listado de conversaciones de PAN-MSG-01.
 *
 * NO invalida el historial de mensajes, aunque también cuelgue de
 * `CLAVE_MENSAJERIA`. Invalidar por la raíz obligaría a recargar TODAS las
 * páginas ya cargadas de una conversación cada vez que alguien entra a ella o
 * archiva otra, y el historial no lo necesita: lo mantiene al día Realtime, que
 * escribe directo en la caché.
 *
 * El detalle de la conversación tampoco entra: las tres mutaciones lo reciben
 * ya actualizado en su respuesta y lo escriben con `setQueryData`.
 */
export function invalidarListados(cliente: QueryClient): void {
  void cliente.invalidateQueries({
    queryKey: [...CLAVE_MENSAJERIA, 'conversaciones'],
  });
}

// ---------------------------------------------------------------------------
// Lecturas
// ---------------------------------------------------------------------------

/**
 * US-MSG-04 · Listado de conversaciones, por filtro y con búsqueda.
 *
 * La búsqueda entra en la clave de caché, así que cada término tiene su propia
 * entrada y volver a uno ya consultado responde de la caché. Quien llama pasa
 * el texto YA debounced (`useValorDebounced`): sin eso habría una consulta por
 * tecla.
 */
export function useConversaciones(
  filtro: FiltroConversaciones,
  busqueda: string,
) {
  return useQuery({
    queryKey: [...CLAVE_MENSAJERIA, 'conversaciones', filtro, busqueda],
    queryFn: () =>
      apiMensajeria.listarConversaciones({
        filtro,
        busqueda: busqueda || undefined,
      }),
  });
}

/** US-MSG-05 · Cabecera de PAN-MSG-02 y estado del campo de entrada. */
export function useConversacion(conversacionId: string) {
  return useQuery({
    queryKey: claveConversacion(conversacionId),
    queryFn: () => apiMensajeria.obtenerConversacion(conversacionId),
  });
}

/**
 * US-MSG-06 · El hilo con la contraparte de un pedido, sin crearlo.
 *
 * Devuelve `null` mientras no exista conversación: el botón "Mensajes del
 * pedido" se muestra igual, sólo que sin contador de no leídos.
 */
export function useConversacionCon(usuarioId: string | undefined) {
  return useQuery({
    queryKey: [...CLAVE_MENSAJERIA, 'con', usuarioId],
    queryFn: () => apiMensajeria.obtenerConversacionCon(usuarioId!),
    enabled: usuarioId !== undefined,
  });
}

// ---------------------------------------------------------------------------
// Escrituras
// ---------------------------------------------------------------------------

/**
 * US-MSG-01 · "Enviar mensaje" desde el perfil del cocinero o desde el pedido.
 *
 * La API es idempotente: devuelve el hilo existente o crea el único posible.
 * La respuesta se escribe en la caché del detalle para que la pantalla de
 * conversación se dibuje sin una segunda vuelta a la red.
 */
export function useAbrirConversacion() {
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: (destinatarioId: string) =>
      apiMensajeria.abrirConversacion(destinatarioId),
    onSuccess: (conversacion) => {
      cliente.setQueryData(claveConversacion(conversacion.id), conversacion);
      invalidarListados(cliente);
    },
  });
}

/**
 * US-MSG-04 · Archivar o devolver al listado principal.
 *
 * OPTIMISTA NO: el listado se reordena y la fila cambia de pestaña, así que un
 * revert visible sería más confuso que la espera. La acción es de las que el
 * usuario hace de a una, no en ráfaga.
 */
export function useArchivarConversacion() {
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: (entrada: { conversacionId: string; archivada: boolean }) =>
      apiMensajeria.cambiarArchivado(entrada.conversacionId, entrada.archivada),
    onSuccess: (conversacion) => {
      cliente.setQueryData(claveConversacion(conversacion.id), conversacion);
      invalidarListados(cliente);
    },
  });
}

/**
 * US-MSG-05 · Marca como leídos los recibidos al entrar a la conversación.
 *
 * Devuelve el detalle con el contador ya en cero, que se escribe directo en la
 * caché: sin eso la cabecera seguiría mostrando "3 no leídos" sobre una
 * conversación que el usuario está mirando.
 */
export function useMarcarLeidos() {
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: (conversacionId: string) =>
      apiMensajeria.marcarLeidos(conversacionId),
    onSuccess: (conversacion) => {
      cliente.setQueryData(claveConversacion(conversacion.id), conversacion);
      invalidarListados(cliente);
    },
  });
}

/** Reexportados para que las pantallas no tengan que importar de dos lados. */
export type { ConversacionDetalle, ConversacionResumen };
