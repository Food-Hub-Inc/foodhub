import { z } from 'zod';
import { ESTADO_MENSAJE, TIPO_MENSAJE } from '../constants/enums.js';
import { MENSAJES_MENSAJERIA } from '../constants/mensajes.js';

/**
 * Contratos del modulo de Mensajeria directa (US-MSG-01 a US-MSG-07,
 * RF073 a RF079). Pantallas: PAN-MSG-01 (lista) y PAN-MSG-02 (conversacion).
 *
 * CUATRO DECISIONES QUE ATRAVIESAN TODO EL MODULO
 *
 *   LA CONVERSACION SE IDENTIFICA POR EL PAR, NO POR EL PEDIDO. El indice
 *       `conversacion_par_uq` normaliza (A,B) y (B,A) a la misma fila, de modo
 *       que "iniciar" un chat es siempre una operacion IDEMPOTENTE: devuelve el
 *       hilo que ya existia o crea el unico posible. Es lo que exigen a la vez
 *       US-MSG-01 ("si existe una conversacion previa, abra el hilo existente")
 *       y US-MSG-06 ("utilice el hilo existente sin crear uno nuevo").
 *
 *   EL HILO DEL PEDIDO SE RESUELVE POR CONSULTA. US-MSG-06 / RF078 hablan de
 *       "asociar la conversacion al pedido", pero el diagrama vigente
 *       DG12082026_V5 no tiene `pedidoId` en Conversacion y el indice unico
 *       admite UNA sola conversacion por par, tenga el par uno o diez pedidos.
 *       El boton "Mensajes del pedido" abre el hilo del cliente y el cocinero
 *       DEL pedido (decision del equipo, 2026-08-21): sin tocar el modelo.
 *
 *   TODO LO QUE ES POR PARTICIPANTE VIAJA YA RESUELTO. La base guarda los no
 *       leidos y el archivado en dos columnas por conversacion (una por
 *       participante); la API resuelve cual le toca a quien pregunta y manda un
 *       unico `noLeidos` / `archivada`. El cliente nunca ve `usuario1` ni
 *       `usuario2`: para el hay "yo" y "el interlocutor".
 *
 *   EL ORDEN CRONOLOGICO ES DESCENDENTE EN LA RED Y ASCENDENTE EN PANTALLA.
 *       La paginacion de US-MSG-05 va hacia ATRAS en el tiempo (scroll hacia
 *       arriba trae mensajes mas viejos), asi que el cursor es "anterior a esta
 *       fecha" y el indice `mensaje_conversacion_idx` la sirve directo.
 */

// ---------------------------------------------------------------------------
// Reglas del dominio
// ---------------------------------------------------------------------------

/**
 * US-MSG-02: "El usuario ingresa un texto que supera los 2000 caracteres".
 * Coincide con `varchar(2000)` de `mensaje.contenido`: el mismo numero no puede
 * estar en dos lados con dos valores.
 */
export const MAXIMO_CARACTERES_MENSAJE = 2000;

/**
 * Tope del texto opcional que acompana a una imagen (US-MSG-03: "un campo
 * opcional para agregar un mensaje de texto que la acompane").
 *
 * El criterio no fija el numero; sale de `varchar(300)` en
 * `mensaje.pie_de_imagen`, que ya esta migrado. Un pie no es un mensaje: si
 * hace falta escribir mas, se manda la imagen y despues el texto.
 */
export const MAXIMO_CARACTERES_PIE_DE_IMAGEN = 300;

/**
 * US-MSG-05: "Cargue los ultimos 50 mensajes de la conversacion". Es tambien el
 * tamano de cada bloque adicional que trae el scroll hacia arriba.
 */
export const MENSAJES_POR_PAGINA = 50;

/**
 * US-MSG-05: "El indicador desaparezca tras 3 segundos de inactividad o cuando
 * el interlocutor envie el mensaje". En milisegundos, que es la unidad de los
 * temporizadores del cliente.
 */
export const MILISEGUNDOS_INDICADOR_ESCRIBIENDO = 3000;

/**
 * US-MSG-03 y RF075: "Los formatos admitidos son JPG, PNG y WEBP con un tamano
 * maximo de 8 MB por archivo".
 *
 * Constantes PROPIAS del chat y no las de la foto de perfil (5 MB) ni las del
 * plato (5 MB): son tres criterios de aceptacion distintos y endurecer uno no
 * deberia mover los otros dos sin que nadie lo note. Mismo razonamiento que
 * documenta `FORMATOS_IMAGEN_PLATO`.
 */
export const FORMATOS_IMAGEN_MENSAJE = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;
export type FormatoImagenMensaje = (typeof FORMATOS_IMAGEN_MENSAJE)[number];

export const MAXIMO_IMAGEN_MENSAJE_BYTES = 8 * 1024 * 1024;

/**
 * Los dos filtros del listado (US-MSG-04): el principal y "Archivados".
 *
 * No es un enum de la base. El archivado se guarda como un booleano por
 * participante; esto es el estado de la pantalla, igual que
 * `PERIODO_DASHBOARD`.
 */
export const FILTRO_CONVERSACIONES = ['ACTIVAS', 'ARCHIVADAS'] as const;
export type FiltroConversaciones = (typeof FILTRO_CONVERSACIONES)[number];

/**
 * Por que una conversacion no admite mensajes nuevos.
 *
 *   BAJA        el interlocutor elimino su cuenta o el administrador lo dio de
 *               baja (US-MSG-07). Es DEFINITIVO: la conversacion queda
 *               archivada y no vuelve al listado principal.
 *   SUSPENSION  el interlocutor tiene la cuenta suspendida (US-MSG-01). Es
 *               REVERSIBLE: si el administrador la reactiva, el chat vuelve a
 *               funcionar solo.
 *
 * Se distinguen porque cada uno muestra un texto distinto y porque solo el
 * primero archiva la conversacion.
 */
export const MOTIVO_BLOQUEO_CHAT = ['BAJA', 'SUSPENSION'] as const;
export type MotivoBloqueoChat = (typeof MOTIVO_BLOQUEO_CHAT)[number];

// ---------------------------------------------------------------------------
// Entrada
// ---------------------------------------------------------------------------

/**
 * US-MSG-01 - Abrir el chat con alguien. Idempotente: si el hilo existe lo
 * devuelve, y si no lo crea.
 *
 * Solo viaja el destinatario. Quien inicia sale del JWT: aceptarlo del cuerpo
 * dejaria que cualquiera abriera conversaciones ajenas.
 */
export const abrirConversacionSchema = z.object({
  destinatarioId: z.uuid(),
});

/**
 * US-MSG-04 - Filtros del listado.
 *
 * `busqueda` filtra por NOMBRE DEL INTERLOCUTOR, no por contenido de los
 * mensajes: "Filtre las conversaciones cuyo nombre del interlocutor contenga el
 * texto ingresado, de forma insensible a mayusculas y minusculas".
 */
export const filtrosConversacionesSchema = z.object({
  filtro: z.enum(FILTRO_CONVERSACIONES).default('ACTIVAS'),
  busqueda: z.string().trim().max(120).optional(),
});

/**
 * US-MSG-05 - Un bloque del historial.
 *
 * `antesDe` es un cursor por fecha y no un numero de pagina: entre dos cargas
 * pueden llegar mensajes nuevos, y con `offset` el bloque siguiente repetiria o
 * saltearia filas. La primera carga no lo manda y trae los mas recientes.
 */
export const historialDeMensajesSchema = z.object({
  antesDe: z.iso.datetime().optional(),
  limite: z.coerce
    .number()
    .int()
    .positive()
    .max(MENSAJES_POR_PAGINA)
    .default(MENSAJES_POR_PAGINA),
});

/**
 * US-MSG-02 - Mensaje de texto.
 *
 * `.trim()` ANTES de `.min(1)` es lo que implementa "El usuario intenta enviar
 * un mensaje vacio O SOLO CON ESPACIOS EN BLANCO": sin el, una cadena de
 * espacios pasa la validacion de longitud y termina en la base como una burbuja
 * en blanco. El tope se mide sobre el texto ya recortado, igual que el contador
 * de la pantalla.
 */
export const enviarMensajeTextoSchema = z.object({
  tipo: z.literal('TEXTO'),
  contenido: z.string().trim().min(1).max(MAXIMO_CARACTERES_MENSAJE),
});

/**
 * US-MSG-03 - Mensaje de imagen.
 *
 * Llega la URL, no el archivo: el binario va del dispositivo directo a Supabase
 * Storage con la URL firmada que emite `/almacenamiento/imagen-chat`, y por eso
 * el body de la API sigue limitado a 1 MB.
 *
 * `pieDeImagen` es opcional y se recorta igual que el texto: un pie de solo
 * espacios es lo mismo que no mandar pie.
 */
export const enviarMensajeImagenSchema = z.object({
  tipo: z.literal('IMAGEN'),
  imagenUrl: z.url(),
  pieDeImagen: z
    .string()
    .trim()
    .max(MAXIMO_CARACTERES_PIE_DE_IMAGEN)
    .optional(),
});

/**
 * Los dos subtipos en un solo endpoint, discriminados por `tipo`.
 *
 * Es el mismo criterio con el que la base los guarda en UNA tabla con
 * discriminador: se leen siempre juntos y en orden cronologico. Dos endpoints
 * separados obligarian al cliente a decidir la ruta segun el tipo y duplicarian
 * toda la validacion de pertenencia a la conversacion.
 */
export const enviarMensajeSchema = z.discriminatedUnion('tipo', [
  enviarMensajeTextoSchema,
  enviarMensajeImagenSchema,
]);

/** US-MSG-04 - Archivar o devolver al listado principal una conversacion. */
export const archivadoConversacionSchema = z.object({
  archivada: z.boolean(),
});

/**
 * US-MSG-02 - Acuse de recepcion: los mensajes pasan a ENTREGADO.
 *
 * LO MANDA EL DESTINATARIO, no el remitente, y solo cuando el mensaje llego
 * efectivamente a su dispositivo por el canal de Realtime (decision del equipo,
 * 2026-08-21). Es la unica lectura de "entregado" que el modelo permite
 * verificar: ni la US ni RF074 definen el hecho que dispara ese estado.
 *
 * Va en lote porque al abrir la app puede haber varios pendientes de acusar y
 * un POST por mensaje despertaria la radio del telefono N veces.
 */
export const acusarEntregaSchema = z.object({
  mensajeIds: z.array(z.uuid()).min(1).max(MENSAJES_POR_PAGINA),
});

// ---------------------------------------------------------------------------
// Respuesta
// ---------------------------------------------------------------------------

/**
 * La otra parte de la conversacion, ya resuelta por la API.
 *
 * LA IDENTIDAD DE UNA CUENTA DADA DE BAJA NO SALE DE LA API: con `eliminado` en
 * true, `nombre`, `apellido` y `fotoPerfilUrl` viajan en null y la pantalla
 * muestra "Usuario no disponible" (US-MSG-07). Es la misma regla que aplica el
 * dashboard del cocinero con `ClienteRecurrente`.
 *
 * `esCocinero` existe por un motivo puntual: US-MSG-01 fija el texto del bloqueo
 * por suspension hablando de "este cocinero", y el caso simetrico no lo cubre
 * ningun criterio. La pantalla necesita saber cual de los dos textos mostrar.
 */
export const interlocutorSchema = z.object({
  id: z.uuid(),
  nombre: z.string().nullable(),
  apellido: z.string().nullable(),
  fotoPerfilUrl: z.string().nullable(),
  esCocinero: z.boolean(),
  eliminado: z.boolean(),
  suspendido: z.boolean(),
});

/**
 * Un mensaje del hilo.
 *
 * `remitenteId` va crudo y no como un booleano "es mio": el mismo payload lo
 * consumen la pantalla del cliente y la del cocinero, y la comparacion contra
 * la sesion la hace cada una. Un campo calculado obligaria a la API a
 * serializar el mismo mensaje distinto para cada participante y romperia la
 * cache de Realtime, donde la fila llega tal cual esta en la base.
 */
export const mensajeSchema = z.object({
  id: z.uuid(),
  conversacionId: z.uuid(),
  remitenteId: z.uuid(),
  tipo: z.enum(TIPO_MENSAJE),
  estado: z.enum(ESTADO_MENSAJE),
  contenido: z.string().nullable(),
  imagenUrl: z.string().nullable(),
  pieDeImagen: z.string().nullable(),
  fechaEnvio: z.iso.datetime(),
});

/**
 * Una fila del listado (US-MSG-04): "foto de perfil del interlocutor, nombre
 * completo, extracto del ultimo mensaje, fecha y hora del ultimo mensaje y un
 * contador de mensajes no leidos".
 *
 * El "extracto" viaja como el ultimo mensaje entero y no recortado a N
 * caracteres: donde cortar depende del ancho de la fila, que es una decision de
 * la pantalla. Ademas, para un mensaje de IMAGEN no hay texto que recortar y la
 * fila muestra un rotulo propio.
 *
 * `ultimoMensaje` NO es nullable, y por eso el listado excluye las
 * conversaciones sin ningun mensaje: US-MSG-01 crea el hilo al presionar
 * "Enviar mensaje", antes de que se escriba nada, y esa fila mostraria un
 * "extracto del ultimo mensaje" inexistente ocupando el tope de una lista
 * ordenada por actividad. Existe en la base, se puede abrir por su id, pero no
 * aparece en PAN-MSG-01 hasta el primer mensaje.
 */
export const conversacionResumenSchema = z.object({
  id: z.uuid(),
  interlocutor: interlocutorSchema,
  ultimoMensaje: mensajeSchema,
  fechaUltimoMensaje: z.iso.datetime(),
  noLeidos: z.number().int().min(0),
  archivada: z.boolean(),
  bloqueadaPorBaja: z.boolean(),
});

/**
 * La cabecera de PAN-MSG-02 y el estado del campo de entrada.
 *
 * `puedeEnviar` lo decide el SERVIDOR y no la pantalla. Deshabilitar el input
 * es una ayuda al usuario, no un control de acceso: el POST se rechaza igual si
 * llega. `motivoBloqueo` viene en null cuando `puedeEnviar` es true.
 */
export const conversacionDetalleSchema = z.object({
  id: z.uuid(),
  interlocutor: interlocutorSchema,
  noLeidos: z.number().int().min(0),
  archivada: z.boolean(),
  bloqueadaPorBaja: z.boolean(),
  puedeEnviar: z.boolean(),
  motivoBloqueo: z.enum(MOTIVO_BLOQUEO_CHAT).nullable(),
});

/**
 * Un bloque del historial (US-MSG-05).
 *
 * Los mensajes van del MAS VIEJO al MAS NUEVO dentro del bloque, aunque la
 * consulta los traiga al reves: asi la pantalla los concatena sin invertir
 * nada. `hayMas` evita el disparo inutil de una carga que volveria vacia cuando
 * el bloque coincide justo con el final del historial.
 */
export const paginaDeMensajesSchema = z.object({
  mensajes: z.array(mensajeSchema),
  hayMas: z.boolean(),
});

/**
 * Lo que devuelve el envio de un mensaje: el mensaje ya persistido MAS el
 * estado de la conversacion.
 *
 * Los dos juntos porque enviar puede cambiar la conversacion ademas del hilo:
 * si el interlocutor la tenia archivada, el mensaje nuevo la devuelve al
 * listado principal (US-MSG-04), y esa fila hay que refrescarla.
 */
export const mensajeEnviadoSchema = z.object({
  mensaje: mensajeSchema,
  conversacion: conversacionDetalleSchema,
});

/**
 * US-MSG-03 - Lo que el dispositivo declara antes de recibir la URL firmada de
 * una imagen del chat.
 *
 * Vive aca y no en `almacenamiento.schema.ts` -donde estan las otras tres- para
 * que el tope de 8 MB quede al lado del criterio que lo fija. La respuesta si
 * reutiliza `urlDeCargaSchema`: el permiso de escritura tiene la misma forma
 * suba lo que suba.
 */
export const solicitarUrlDeCargaImagenChatSchema = z.object({
  mimeType: z.enum(FORMATOS_IMAGEN_MENSAJE, {
    message: MENSAJES_MENSAJERIA.imagenInvalida,
  }),
  tamano: z
    .number()
    .int()
    .positive(MENSAJES_MENSAJERIA.imagenInvalida)
    .max(MAXIMO_IMAGEN_MENSAJE_BYTES, MENSAJES_MENSAJERIA.imagenInvalida),
});

export type AbrirConversacionInput = z.infer<typeof abrirConversacionSchema>;
export type FiltrosConversaciones = z.infer<typeof filtrosConversacionesSchema>;
export type HistorialDeMensajesInput = z.infer<
  typeof historialDeMensajesSchema
>;
export type EnviarMensajeInput = z.infer<typeof enviarMensajeSchema>;
export type ArchivadoConversacionInput = z.infer<
  typeof archivadoConversacionSchema
>;
export type AcusarEntregaInput = z.infer<typeof acusarEntregaSchema>;
export type Interlocutor = z.infer<typeof interlocutorSchema>;
export type Mensaje = z.infer<typeof mensajeSchema>;
export type ConversacionResumen = z.infer<typeof conversacionResumenSchema>;
export type ConversacionDetalle = z.infer<typeof conversacionDetalleSchema>;
export type PaginaDeMensajes = z.infer<typeof paginaDeMensajesSchema>;
export type MensajeEnviado = z.infer<typeof mensajeEnviadoSchema>;
export type SolicitarUrlDeCargaImagenChatInput = z.infer<
  typeof solicitarUrlDeCargaImagenChatSchema
>;
