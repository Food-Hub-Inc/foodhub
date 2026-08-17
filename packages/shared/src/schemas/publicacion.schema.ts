import { z } from 'zod';
import { ESTADO_PUBLICACION } from '../constants/enums.js';
import {
  MENSAJES_PUBLICACION,
  MENSAJES_VALIDACION,
} from '../constants/mensajes.js';
import { categoriaListadoSchema } from './catalogo.schema.js';

/**
 * Contratos del modulo de Publicaciones (US-PUB-01 a US-PUB-05).
 *
 * Se definen aca, antes de que exista el router de `publicaciones`, porque las
 * cinco historias del modulo comparten el mismo formulario, el mismo listado y
 * el mismo bloque de mensajes: fijar el contrato una sola vez evita que cada
 * historia transcriba (y, con el tiempo, desincronice) los mismos campos.
 */

// ---------------------------------------------------------------------------
// Campos base, compartidos por el alta y la edicion
// ---------------------------------------------------------------------------

/** US-PUB-01 - "Nombre del plato [String] (máximo 80 caracteres) — obligatorio". */
const nombrePlatoSchema = z
  .string()
  .trim()
  .min(1, MENSAJES_VALIDACION.campoObligatorio)
  .max(80, 'El nombre no puede superar los 80 caracteres.');

/** US-PUB-01 - "Descripción [String] (máximo 500 caracteres) — obligatorio". */
const descripcionPlatoSchema = z
  .string()
  .trim()
  .min(1, MENSAJES_VALIDACION.campoObligatorio)
  .max(500, 'La descripción no puede superar los 500 caracteres.');

/**
 * US-PUB-01 - "Precio en pesos argentinos [Decimal] (mayor a 0) — obligatorio".
 *
 * Se tipa como `z.string()` y no como `z.number()`, en ambos sentidos del
 * contrato (entrada Y salida): la columna `publicacion.precio` es `numeric`
 * exactamente por el motivo que documenta `packages/db/src/schema/publicaciones.ts`
 * ("el punto flotante binario no representa exactamente los decimales de un
 * precio"), y Drizzle traduce ese tipo como string tanto al leer como al
 * escribir. Coercionar a `number` en cualquiera de los dos extremos
 * reintroduciría el problema que la columna fue elegida para evitar.
 *
 * El formulario mobile es responsable de normalizar la coma decimal del
 * usuario ("150,50") a este formato antes de mandarlo.
 */
const precioSchema = z
  .string()
  .trim()
  .min(1, MENSAJES_VALIDACION.campoObligatorio)
  .refine(
    (valor) => /^\d+(\.\d{1,2})?$/.test(valor) && Number(valor) > 0,
    MENSAJES_PUBLICACION.precioInvalido,
  );

/** US-PUB-01 - "Categoría [Menú desplegable] ... — obligatorio". */
const categoriaIdSchema = z.uuid(MENSAJES_VALIDACION.campoObligatorio);

/**
 * US-PUB-01 - "Imagen del plato ... — opcional" y US-PUB-02 - "Quitar imagen".
 *
 * `null` explícito (y no solo ausente) es la forma en que la edición expresa
 * "quitar la imagen actual": la resolución del fallback a la imagen
 * predeterminada de la categoría la hace la capa de lectura, no este campo.
 */
const imagenUrlSchema = z.url().nullable().optional();

/** US-PUB-01 - "Tiempo Estimado Preparación [Int] (minutos) — opcional". */
const tiempoEstimadoPreparacionSchema = z
  .number()
  .int('El tiempo estimado debe ser un número entero de minutos.')
  .positive('El tiempo estimado debe ser mayor a 0.')
  .optional();

const camposPublicacion = {
  nombre: nombrePlatoSchema,
  descripcion: descripcionPlatoSchema,
  precio: precioSchema,
  categoriaId: categoriaIdSchema,
  imagenUrl: imagenUrlSchema,
  tiempoEstimadoPreparacion: tiempoEstimadoPreparacionSchema,
};

// ---------------------------------------------------------------------------
// Alta y edicion
// ---------------------------------------------------------------------------

/**
 * US-PUB-01 - Alta de publicación.
 *
 * `estadoPublicacion` no forma parte del body: US-PUB-04, último criterio,
 * fija que toda publicación nueva nace "Disponible" sin que el cocinero la
 * seleccione, y esa es además la columna por defecto en la base
 * (`estado_publicacion` default `'DISPONIBLE'`). Aceptarlo como campo abierto
 * permitiría publicar un plato ya "No disponible", que el criterio no
 * contempla como una opción del alta.
 */
export const crearPublicacionSchema = z.object(camposPublicacion);

/**
 * US-PUB-02 - Edición de publicación. Parcial: el formulario de edición manda
 * solo lo que el cocinero tocó, mismo patrón que `editarPerfilSchema`.
 */
export const editarPublicacionSchema = z
  .object(camposPublicacion)
  .partial()
  .refine((datos) => Object.keys(datos).length > 0, {
    message: 'No hay cambios para guardar.',
  });

/**
 * US-PUB-04 - Cambio de disponibilidad. Endpoint propio, separado de la
 * edición general: el criterio de aceptación exige que el cambio "se aplica de
 * forma inmediata sin necesidad de confirmación adicional", a diferencia de
 * `editarPublicacionSchema`, que sí lleva un modal de confirmación.
 */
export const cambiarDisponibilidadPublicacionSchema = z.object({
  estadoPublicacion: z.enum(ESTADO_PUBLICACION),
});

// ---------------------------------------------------------------------------
// Listado (US-PUB-05)
// ---------------------------------------------------------------------------

/**
 * Opciones del desplegable "Ordenar por". No es un ENUM de la base: no
 * describe un estado persistido de la publicación, sino un criterio de
 * ordenamiento resuelto en el momento de la consulta.
 */
export const ORDEN_PUBLICACION = [
  'RECIENTES',
  'NOMBRE',
  'PRECIO_ASC',
  'PRECIO_DESC',
  'MAS_PEDIDOS',
] as const;
export type OrdenPublicacion = (typeof ORDEN_PUBLICACION)[number];

/**
 * RNF002 fija 10 publicaciones por página, sin que el cliente pueda pedir
 * otro tamaño: por eso `filtrosPublicacionSchema` no tiene campo `porPagina`
 * (a diferencia de `filtrosUsuarioSchema`, donde el panel sí lo controla) y
 * este valor es una constante fija que consume el servicio de listado.
 */
export const PUBLICACIONES_POR_PAGINA = 10;

/** Separa un query param CSV ("a,b,c") en sus partes, sin validarlas todavía. */
const listaCsvSchema = z.string().transform((valor) =>
  valor
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean),
);

/**
 * US-PUB-05 - Búsqueda, filtros combinables y orden del listado propio.
 *
 * `busqueda` es insensible a mayúsculas/minúsculas por criterio de
 * aceptación; esa parte de la regla la aplica el servicio con `ilike`, no este
 * schema. `categoriaIds` y `estados` viajan como CSV en la query string
 * (`?categoriaIds=uuid1,uuid2`), igual que cualquier filtro multi-selección
 * sobre HTTP GET.
 */
export const filtrosPublicacionSchema = z.object({
  busqueda: z.string().trim().max(120).optional(),
  categoriaIds: listaCsvSchema.pipe(z.array(z.uuid())).optional(),
  estados: listaCsvSchema.pipe(z.array(z.enum(ESTADO_PUBLICACION))).optional(),
  precioMinimo: z.coerce.number().nonnegative().optional(),
  precioMaximo: z.coerce.number().nonnegative().optional(),
  orden: z.enum(ORDEN_PUBLICACION).default('RECIENTES'),
  pagina: z.coerce.number().int().min(1).default(1),
});

// ---------------------------------------------------------------------------
// Respuestas
// ---------------------------------------------------------------------------

/**
 * Fila del listado y del detalle. US-PUB-05 fija las columnas de la tarjeta:
 * imagen, nombre, categoría, precio, disponibilidad, pedidos recibidos,
 * valoración y fecha de creación.
 */
const publicacionBaseSchema = z.object({
  id: z.uuid(),
  nombre: z.string(),
  precio: z.string(),
  imagenUrl: z.url().nullable(),
  estadoPublicacion: z.enum(ESTADO_PUBLICACION),
  categoria: categoriaListadoSchema,

  /**
   * Cuenta de pedidos con `estadoPedidoActual = 'COMPLETADO'` únicamente
   * (decisión de alcance del equipo, ver el plan del módulo): un pedido
   * "Creado" o "Rechazado" nunca llegó a concretarse y contarlo infla la cifra
   * que el cocinero usa para evaluar qué tan bien vende cada plato.
   */
  cantidadPedidos: z.number().int().min(0),

  /**
   * Siempre `null` hoy. El modelo de datos no permite calcular la valoración
   * promedio de UN plato: `resena` se relaciona con `pedido` (una reseña por
   * pedido), y un pedido puede incluir varios platos de un mismo cocinero, así
   * que no hay forma de atribuir la reseña a una publicación puntual. Es un
   * defecto de diseño del modelo de datos (probablemente resuelto agregando
   * `publicacionId` a `resena`, o modelando reseña-por-ítem) que otro
   * integrante del equipo debe corregir; no se toca `packages/db/src/schema/`
   * para esto en el módulo de Publicaciones. Cuando se corrija el modelo, el
   * cálculo real se conecta acá.
   */
  valoracionPromedio: z.number().nullable(),

  fechaCreacion: z.iso.datetime(),
});

/** US-PUB-05 - Tarjeta del listado "Mis publicaciones". */
export const publicacionListadoSchema = publicacionBaseSchema;

/** US-PUB-05 - Detalle completo de una publicación propia. */
export const publicacionDetalleSchema = publicacionBaseSchema.extend({
  descripcion: z.string(),
  tiempoEstimadoPreparacion: z.number().int().nullable(),
  fechaUltimaEdicion: z.iso.datetime().nullable(),
});

/** Envoltorio paginado del listado, mismo shape que `paginaUsuariosSchema`. */
export const paginaPublicacionesSchema = z.object({
  datos: z.array(publicacionListadoSchema),
  total: z.number().int().min(0),
  pagina: z.number().int().min(1),
  porPagina: z.number().int().min(1),
});

export type CrearPublicacionInput = z.infer<typeof crearPublicacionSchema>;
export type EditarPublicacionInput = z.infer<typeof editarPublicacionSchema>;
export type CambiarDisponibilidadPublicacionInput = z.infer<
  typeof cambiarDisponibilidadPublicacionSchema
>;
export type FiltrosPublicacion = z.infer<typeof filtrosPublicacionSchema>;
export type PublicacionListado = z.infer<typeof publicacionListadoSchema>;
export type PublicacionDetalle = z.infer<typeof publicacionDetalleSchema>;
export type PaginaPublicaciones = z.infer<typeof paginaPublicacionesSchema>;
