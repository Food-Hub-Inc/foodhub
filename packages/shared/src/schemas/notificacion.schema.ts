import { z } from 'zod';
import { TIPO_NOTIFICACION } from '../constants/enums.js';

/**
 * Contratos del modulo de Notificaciones y Alertas (US-NOT-01 a US-NOT-08,
 * RF034 a RF041). Pantallas: PAN-NOT-01 (historial), PAN-NOT-02 (preferencias,
 * su contrato vive en `preferenciaNotificacion.schema.ts`).
 *
 * TRES DECISIONES QUE ATRAVIESAN EL MODULO
 *
 *   LA FILA ES EL HISTORIAL; EL PUSH ES UN EFECTO ADICIONAL. `notificacion`
 *       registra lo que se le aviso a cada usuario y es lo que consume
 *       PAN-NOT-01. El envio por Expo/FCM puede fallar sin que la fila deje de
 *       existir. La UNICA excepcion a "la fila se escribe" es la preferencia
 *       apagada de un tipo configurable: ahi no se escribe fila NI se manda
 *       push (documento del modulo, revision 01/09/2026; corrige la regla vieja
 *       de "la fila siempre se escribe"). Los tipos esenciales -AVISO_SISTEMA y
 *       PUBLICACION_ELIMINADA_ADMIN- se escriben siempre.
 *
 *   `objetoAfectadoId` ES POLIMORFICO Y SIN FK. Segun `tipoNotificacion`
 *       apunta a un pedido, una conversacion o una publicacion; la app lo usa
 *       para el deep link al tocar la notificacion. Por eso viaja como uuid
 *       "pelado" y nullable (los avisos generales no tienen objeto).
 *
 *   EL HISTORIAL SE PAGINA POR OFFSET. A diferencia del chat -que scrollea
 *       hacia atras en el tiempo con un cursor por fecha-, el historial se abre
 *       entero desde arriba y se recorre hacia abajo: `pagina` + `porPagina` es
 *       suficiente y es lo que ya usan auditoria y publicaciones.
 */

/**
 * US-NOT-07: "todas las notificaciones ordenadas de la mas reciente a la mas
 * antigua". Tamano de pagina PROPIO -ningun criterio lo fija-, elegido para que
 * la primera pantalla entre sin scroll y el resto llegue por scroll infinito.
 */
export const NOTIFICACIONES_POR_PAGINA = 20;

/**
 * Plataforma del dispositivo que registra el token push. `Platform.OS` de React
 * Native entrega estos dos valores; la app es Android (punto 1.3.1.7) pero el
 * contrato admite iOS para cuando se amplie el alcance. Coincide con
 * `dispositivo_push.plataforma` (`varchar(20)`).
 */
export const PLATAFORMA_PUSH = ['android', 'ios'] as const;
export type PlataformaPush = (typeof PLATAFORMA_PUSH)[number];

/**
 * Formato de un Expo Push Token: `ExponentPushToken[...]` (lo que devuelve
 * `getExpoPushTokenAsync`) o `ExpoPushToken[...]`. Se valida la forma para
 * cortar temprano un token vacio o un FCM token crudo mandado por error.
 */
const EXPO_PUSH_TOKEN_RE = /^Expo(nent)?PushToken\[[^\]]+\]$/;

// ---------------------------------------------------------------------------
// Historial (US-NOT-07, PAN-NOT-01)
// ---------------------------------------------------------------------------

/**
 * Una fila del historial in-app.
 *
 * `titulo` y `cuerpo` ya vienen redactados desde la API (ver
 * `MENSAJES_NOTIFICACION`): la pantalla no arma texto, solo elige el icono a
 * partir de `tipoNotificacion` y el destino del deep link a partir de
 * `tipoNotificacion` + `objetoAfectadoId`.
 */
export const notificacionSchema = z.object({
  id: z.uuid(),
  tipoNotificacion: z.enum(TIPO_NOTIFICACION),
  titulo: z.string(),
  cuerpo: z.string(),
  objetoAfectadoId: z.uuid().nullable(),
  leida: z.boolean(),
  fechaCreacion: z.iso.datetime(),
});

/** US-NOT-07 - Parametros del historial. */
export const filtrosHistorialNotificacionesSchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce
    .number()
    .int()
    .positive()
    .max(NOTIFICACIONES_POR_PAGINA)
    .default(NOTIFICACIONES_POR_PAGINA),
});

/**
 * Una pagina del historial mas el contador de no leidas.
 *
 * `noLeidas` viaja en cada pagina porque la misma consulta que trae la lista
 * puede contar: la pantalla del historial actualiza el globo de la campana al
 * abrirse sin una segunda ida a la red. El globo del encabezado del feed, que
 * vive en otra pantalla, si usa el endpoint liviano `conteoNoLeidasSchema`.
 */
export const paginaNotificacionesSchema = z.object({
  datos: z.array(notificacionSchema),
  total: z.number().int().min(0),
  pagina: z.number().int().min(1),
  porPagina: z.number().int().min(1),
  noLeidas: z.number().int().min(0),
});

/** US-NOT-07 - Contador para el globo de la campana (PAN-EXP-01, encabezado). */
export const conteoNoLeidasSchema = z.object({
  noLeidas: z.number().int().min(0),
});

/**
 * US-NOT-07 - Marcar notificaciones como leidas.
 *
 * `ids` ausente o vacio = "todas las del usuario": es lo que hace la pantalla
 * al abrirse ("Al abrir el historial ... las notificaciones se marcan como
 * leidas"). Con `ids` marca solo esas -la que el usuario toco-. En los dos
 * casos la API acota al `usuario_destino_id` de la sesion: nadie marca leidas
 * las notificaciones de otro.
 */
export const marcarLeidasSchema = z.object({
  ids: z.array(z.uuid()).max(NOTIFICACIONES_POR_PAGINA).optional(),
});

// ---------------------------------------------------------------------------
// Dispositivos push (punto 1.3.1.11)
// ---------------------------------------------------------------------------

/**
 * Registro / renovacion de un Expo Push Token.
 *
 * "Los Expo Push Tokens deben persistirse asociados al usuario, con
 * actualizacion ante renovaciones o reinstalaciones." La app lo llama al
 * iniciar sesion y cada vez que el token rota. Es idempotente: mismo token = la
 * misma fila reactivada, no una nueva.
 */
export const registrarDispositivoSchema = z.object({
  expoPushToken: z
    .string()
    .trim()
    .max(255)
    .regex(EXPO_PUSH_TOKEN_RE, 'El token de notificaciones no es válido.'),
  plataforma: z.enum(PLATAFORMA_PUSH),
  dispositivoInfo: z.string().trim().max(200).optional(),
});

// ---------------------------------------------------------------------------
// Presencia en el chat (US-NOT-02)
// ---------------------------------------------------------------------------

/**
 * US-NOT-02: "Si el usuario tiene la conversacion abierta en pantalla ... no se
 * envia notificacion push."
 *
 * La presencia real vive en Supabase Realtime (canal `chat:<id>`), no en la
 * base. En vez de que la API consulte Realtime, el cliente del destinatario
 * declara que conversacion esta mirando: `conversacionId` mientras la pantalla
 * de chat esta enfocada, `null` al salir. La API lo guarda en memoria con un
 * TTL corto y omite el push -no la fila- si coincide. La limitacion (memoria
 * por instancia, se pierde en un reinicio) esta documentada en
 * `docs/API-NOTIFICACIONES.md`.
 */
export const marcarPresenciaSchema = z.object({
  conversacionId: z.uuid().nullable(),
});

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type Notificacion = z.infer<typeof notificacionSchema>;
export type FiltrosHistorialNotificaciones = z.infer<
  typeof filtrosHistorialNotificacionesSchema
>;
export type PaginaNotificaciones = z.infer<typeof paginaNotificacionesSchema>;
export type ConteoNoLeidas = z.infer<typeof conteoNoLeidasSchema>;
export type MarcarLeidasInput = z.infer<typeof marcarLeidasSchema>;
export type RegistrarDispositivoInput = z.infer<
  typeof registrarDispositivoSchema
>;
export type MarcarPresenciaInput = z.infer<typeof marcarPresenciaSchema>;
