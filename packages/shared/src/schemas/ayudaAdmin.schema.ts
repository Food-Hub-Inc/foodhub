import { z } from 'zod';
import { ROL_DESTINO_AYUDA } from '../constants/ayuda.js';
import { MENSAJES_AYUDA } from '../constants/mensajes.js';

/**
 * Contratos del modulo de Ayuda y soporte — gestion del manual de usuario y
 * las preguntas frecuentes desde el panel web (US-AYU-05).
 *
 * El administrador trabaja con el CODIGO del rol destinatario
 * (`CLIENTE` / `COCINERO` / `AMBOS`); el id de la fila de `rol_destino` es un
 * detalle interno del servicio y nunca viaja al cliente.
 */

const rolDestinoSchema = z.enum(ROL_DESTINO_AYUDA, {
  message: MENSAJES_AYUDA.admin.campoObligatorio,
});

/**
 * LITERAL - US-AYU-05: "Título (máximo 100 caracteres) — obligatorio".
 * El texto de `contenidoHtml` es contenido del editor enriquecido; el tope de
 * 500_000 es la misma salvaguarda defensiva que usa `terminos.schema.ts`, no
 * una regla de negocio de la US.
 */
const tituloContenidoSchema = z
  .string()
  .trim()
  .min(1, MENSAJES_AYUDA.admin.campoObligatorio)
  .max(100, MENSAJES_AYUDA.admin.tituloMaximo);

const contenidoHtmlSchema = z
  .string()
  .trim()
  .min(1, MENSAJES_AYUDA.admin.campoObligatorio)
  .max(500_000, MENSAJES_AYUDA.admin.contenidoExtenso);

// ---------------------------------------------------------------------------
// Manual de usuario — capitulos y secciones
// ---------------------------------------------------------------------------

/**
 * US-AYU-05 - Una seccion del capitulo. `id` viaja solo al editar un capitulo
 * existente: el servicio lo usa para actualizar la seccion en lugar de
 * recrearla, de modo que no se pierde su historial de fechas.
 */
export const seccionAyudaInputSchema = z.object({
  id: z.uuid().optional(),
  titulo: tituloContenidoSchema,
  contenidoHtml: contenidoHtmlSchema,
  orden: z.number().int().min(0).optional(),
});
export type SeccionAyudaInput = z.infer<typeof seccionAyudaInputSchema>;

/**
 * US-AYU-05 - Alta de capitulo. El formulario describe Título + Contenido +
 * Rol; el contenido se materializa en una o mas secciones, porque el diagrama
 * V5 modela el manual como capitulo -> seccion. Se exige al menos una.
 */
export const crearCapituloAyudaSchema = z.object({
  titulo: tituloContenidoSchema,
  rolDestino: rolDestinoSchema,
  orden: z.number().int().min(0).optional(),
  secciones: z
    .array(seccionAyudaInputSchema)
    .min(1, MENSAJES_AYUDA.admin.seccionObligatoria),
});
export type CrearCapituloAyudaInput = z.infer<typeof crearCapituloAyudaSchema>;

/** US-AYU-05 - Edicion parcial del capitulo y reemplazo de sus secciones. */
export const editarCapituloAyudaSchema = z
  .object({
    titulo: tituloContenidoSchema.optional(),
    rolDestino: rolDestinoSchema.optional(),
    orden: z.number().int().min(0).optional(),
    secciones: z
      .array(seccionAyudaInputSchema)
      .min(1, MENSAJES_AYUDA.admin.seccionObligatoria)
      .optional(),
  })
  .refine((datos) => Object.keys(datos).length > 0, {
    message: 'No hay cambios para guardar.',
  });
export type EditarCapituloAyudaInput = z.infer<
  typeof editarCapituloAyudaSchema
>;

/** US-AYU-05 - Fila del listado del manual, con sus secciones. */
export const seccionAyudaListadoSchema = z.object({
  id: z.uuid(),
  titulo: z.string(),
  contenidoHtml: z.string(),
  habilitado: z.boolean(),
  orden: z.number().int(),
});
export type SeccionAyudaListado = z.infer<typeof seccionAyudaListadoSchema>;

export const capituloAyudaListadoSchema = z.object({
  id: z.uuid(),
  titulo: z.string(),
  rolDestino: z.enum(ROL_DESTINO_AYUDA),
  orden: z.number().int(),
  activo: z.boolean(),
  fechaCreacion: z.iso.datetime(),
  fechaUltimaModificacion: z.iso.datetime(),
  secciones: z.array(seccionAyudaListadoSchema),
});
export type CapituloAyudaListado = z.infer<typeof capituloAyudaListadoSchema>;

/** Estado de habilitacion, para el filtro del listado. */
export const ESTADO_HABILITACION_AYUDA = [
  'HABILITADO',
  'DESHABILITADO',
] as const;
export type EstadoHabilitacionAyuda =
  (typeof ESTADO_HABILITACION_AYUDA)[number];

/** US-AYU-05 - Listado del manual, filtrable por rol, estado y titulo. */
export const filtrosCapitulosAyudaSchema = z.object({
  busqueda: z.string().trim().max(100).optional(),
  rolDestino: rolDestinoSchema.optional(),
  estado: z.enum(ESTADO_HABILITACION_AYUDA).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(20),
});
export type FiltrosCapitulosAyuda = z.infer<typeof filtrosCapitulosAyudaSchema>;

export const paginaCapitulosAyudaSchema = z.object({
  datos: z.array(capituloAyudaListadoSchema),
  total: z.number().int().min(0),
  pagina: z.number().int().min(1),
  porPagina: z.number().int().min(1),
});
export type PaginaCapitulosAyuda = z.infer<typeof paginaCapitulosAyudaSchema>;

// ---------------------------------------------------------------------------
// Preguntas frecuentes
// ---------------------------------------------------------------------------

/**
 * LITERAL - US-AYU-05: enunciado 200 y respuesta 1500 caracteres. La categoria
 * es un varchar libre en la base; el servidor la acepta como texto acotado y es
 * la UI la que ofrece el desplegable segun el rol (`categoriasFaqDeRol`), para
 * no invalidar preguntas ya cargadas con categorias fuera de la lista actual.
 */
const categoriaFaqSchema = z
  .string()
  .trim()
  .min(1, MENSAJES_AYUDA.admin.campoObligatorio)
  .max(80, 'La categoría no puede superar los 80 caracteres.');

const preguntaFaqSchema = z
  .string()
  .trim()
  .min(1, MENSAJES_AYUDA.admin.campoObligatorio)
  .max(200, MENSAJES_AYUDA.admin.preguntaMaxima);

const respuestaFaqSchema = z
  .string()
  .trim()
  .min(1, MENSAJES_AYUDA.admin.campoObligatorio)
  .max(1500, MENSAJES_AYUDA.admin.respuestaMaxima);

/** US-AYU-05 - Alta de pregunta frecuente. */
export const crearFaqAdminSchema = z.object({
  categoria: categoriaFaqSchema,
  pregunta: preguntaFaqSchema,
  respuesta: respuestaFaqSchema,
  rolDestino: rolDestinoSchema,
});
export type CrearFaqAdminInput = z.infer<typeof crearFaqAdminSchema>;

/** US-AYU-05 - Edicion parcial de la pregunta. */
export const editarFaqAdminSchema = z
  .object({
    categoria: categoriaFaqSchema.optional(),
    pregunta: preguntaFaqSchema.optional(),
    respuesta: respuestaFaqSchema.optional(),
    rolDestino: rolDestinoSchema.optional(),
  })
  .refine((datos) => Object.keys(datos).length > 0, {
    message: 'No hay cambios para guardar.',
  });
export type EditarFaqAdminInput = z.infer<typeof editarFaqAdminSchema>;

/** US-AYU-05 - Fila del listado de FAQ del panel. */
export const faqAdminListadoSchema = z.object({
  id: z.uuid(),
  categoria: z.string().nullable(),
  pregunta: z.string(),
  respuesta: z.string(),
  rolDestino: z.enum(ROL_DESTINO_AYUDA),
  votosUtil: z.number().int().nonnegative(),
  votosNoUtil: z.number().int().nonnegative(),
  activo: z.boolean(),
  fechaCreacion: z.iso.datetime(),
  fechaUltimaModificacion: z.iso.datetime(),
});
export type FaqAdminListado = z.infer<typeof faqAdminListadoSchema>;

/** US-AYU-05 - Listado de FAQ, filtrable por rol, categoria, estado y texto. */
export const filtrosFaqsAdminSchema = z.object({
  busqueda: z.string().trim().max(200).optional(),
  rolDestino: rolDestinoSchema.optional(),
  categoria: z.string().trim().max(80).optional(),
  estado: z.enum(ESTADO_HABILITACION_AYUDA).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(20),
});
export type FiltrosFaqsAdmin = z.infer<typeof filtrosFaqsAdminSchema>;

export const paginaFaqsAdminSchema = z.object({
  datos: z.array(faqAdminListadoSchema),
  total: z.number().int().min(0),
  pagina: z.number().int().min(1),
  porPagina: z.number().int().min(1),
});
export type PaginaFaqsAdmin = z.infer<typeof paginaFaqsAdminSchema>;

// ---------------------------------------------------------------------------
// Lectura publica del manual (la consume US-AYU-01 desde la app movil)
// ---------------------------------------------------------------------------

export const seccionManualPublicaSchema = z.object({
  id: z.uuid(),
  titulo: z.string(),
  contenidoHtml: z.string(),
  orden: z.number().int(),
});
export type SeccionManualPublica = z.infer<typeof seccionManualPublicaSchema>;

export const capituloManualPublicoSchema = z.object({
  id: z.uuid(),
  titulo: z.string(),
  orden: z.number().int(),
  secciones: z.array(seccionManualPublicaSchema),
});
export type CapituloManualPublico = z.infer<typeof capituloManualPublicoSchema>;

export const manualPublicoSchema = z.array(capituloManualPublicoSchema);
export type ManualPublico = z.infer<typeof manualPublicoSchema>;
