import type {
  ConversacionDetalle,
  ConversacionResumen,
  EnviarMensajeInput,
  FiltroConversaciones,
  MensajeEnviado,
  PaginaDeMensajes,
  SolicitarUrlDeCargaImagenChatInput,
  UrlDeCarga,
} from '@foodhub/shared';
import { api } from '../lib/api';

/**
 * Mensajería directa — US-MSG-01 a US-MSG-07 · PAN-MSG-01 y PAN-MSG-02.
 *
 * Ninguna ruta recibe el id de quien escribe: la API lo saca de la sesión y
 * verifica la pertenencia a la conversación dentro de la propia consulta, así
 * que cambiar el id de la URL devuelve 404 y no el chat de otro.
 *
 * LO QUE NO ESTÁ ACÁ: el tiempo real. Los mensajes nuevos, el cambio a "Leído"
 * y el indicador "Escribiendo..." no viajan por estos endpoints sino por
 * Supabase Realtime, directo contra la base (ver `useCanalDeChat`). Estas
 * funciones son la carga inicial y las escrituras.
 */

/** US-MSG-04 · Listado de PAN-MSG-01, por filtro y con búsqueda por nombre. */
export function listarConversaciones(entrada: {
  filtro: FiltroConversaciones;
  busqueda?: string;
}): Promise<ConversacionResumen[]> {
  const parametros = new URLSearchParams({ filtro: entrada.filtro });
  if (entrada.busqueda) parametros.set('busqueda', entrada.busqueda);

  return api.obtener<ConversacionResumen[]>(
    `/mensajeria/conversaciones?${parametros.toString()}`,
  );
}

/**
 * US-MSG-01 · Abre el chat con alguien, creándolo si no existía.
 *
 * Es idempotente: llamarla dos veces devuelve la misma conversación. Por eso el
 * botón "Enviar mensaje" del perfil del cocinero puede tocarse las veces que
 * sea sin generar hilos duplicados.
 */
export function abrirConversacion(
  destinatarioId: string,
): Promise<ConversacionDetalle> {
  return api.enviar<ConversacionDetalle>('/mensajeria/conversaciones', {
    destinatarioId,
  });
}

/** US-MSG-05 · Cabecera de PAN-MSG-02 y estado del campo de entrada. */
export function obtenerConversacion(
  conversacionId: string,
): Promise<ConversacionDetalle> {
  return api.obtener<ConversacionDetalle>(
    `/mensajeria/conversaciones/${conversacionId}`,
  );
}

/**
 * US-MSG-06 · El hilo con la contraparte de un pedido, SIN crearlo.
 *
 * Lo consulta el botón "Mensajes del pedido" para saber si tiene que mostrar el
 * contador de no leídos. La API responde 204 cuando todavía no hay hilo, que el
 * cliente HTTP traduce a `undefined`.
 */
export async function obtenerConversacionCon(
  usuarioId: string,
): Promise<ConversacionDetalle | null> {
  const conversacion = await api.obtener<ConversacionDetalle | undefined>(
    `/mensajeria/conversaciones/con/${usuarioId}`,
  );
  return conversacion ?? null;
}

/** US-MSG-05 · Un bloque del historial, hacia atrás en el tiempo. */
export function listarMensajes(entrada: {
  conversacionId: string;
  antesDe?: string;
}): Promise<PaginaDeMensajes> {
  const parametros = new URLSearchParams();
  if (entrada.antesDe) parametros.set('antesDe', entrada.antesDe);
  const cadena = parametros.toString();

  return api.obtener<PaginaDeMensajes>(
    `/mensajeria/conversaciones/${entrada.conversacionId}/mensajes${cadena ? `?${cadena}` : ''}`,
  );
}

/** US-MSG-02 y US-MSG-03 · Enviar texto o imagen. */
export function enviarMensaje(
  conversacionId: string,
  datos: EnviarMensajeInput,
): Promise<MensajeEnviado> {
  return api.enviar<MensajeEnviado>(
    `/mensajeria/conversaciones/${conversacionId}/mensajes`,
    datos,
  );
}

/** US-MSG-05 · Marca como leídos los recibidos y pone el contador en 0. */
export function marcarLeidos(
  conversacionId: string,
): Promise<ConversacionDetalle> {
  return api.enviar<ConversacionDetalle>(
    `/mensajeria/conversaciones/${conversacionId}/leidos`,
  );
}

/**
 * US-MSG-02 · Acuse de entrega en lote (ENVIADO → ENTREGADO).
 *
 * No cuelga de una conversación: el teléfono acusa de una vez todo lo que le
 * llegó por Realtime, que puede abarcar varios hilos.
 */
export function acusarEntrega(mensajeIds: string[]): Promise<void> {
  return api.enviar<void>('/mensajeria/acuses', { mensajeIds });
}

/** US-MSG-04 · Archivar o devolver al listado principal. */
export function cambiarArchivado(
  conversacionId: string,
  archivada: boolean,
): Promise<ConversacionDetalle> {
  return api.modificar<ConversacionDetalle>(
    `/mensajeria/conversaciones/${conversacionId}/archivado`,
    { archivada },
  );
}

/**
 * US-MSG-03 · Permiso de escritura para una imagen del chat.
 *
 * La conversación va en la ruta y no en el cuerpo porque la API la usa para dos
 * cosas: verificar que quien sube participe del hilo, y nombrar la carpeta
 * dentro del bucket.
 */
export function solicitarUrlDeCargaDeImagenChat(
  conversacionId: string,
  datos: SolicitarUrlDeCargaImagenChatInput,
): Promise<UrlDeCarga> {
  return api.enviar<UrlDeCarga>(
    `/almacenamiento/imagen-chat/${conversacionId}`,
    datos,
  );
}
