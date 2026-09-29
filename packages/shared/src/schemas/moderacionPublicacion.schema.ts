import { z } from 'zod';
import { ESTADO_PUBLICACION } from '../constants/enums.js';
import { MENSAJES_MODERACION } from '../constants/mensajes.js';
import { categoriaResumenSchema } from './catalogo.schema.js';

/**
 * Contratos de la moderación de publicaciones del panel — US-ADM-04, RF050 y
 * RF051 (PAN-ADM-02, pestaña "Publicaciones").
 *
 * Son contratos APARTE de los de `publicacion.schema.ts` aunque describan la
 * misma tabla: aquéllos son la vista del cocinero sobre lo propio (con pedidos
 * recibidos y valoración) y éstos la del administrador sobre lo de todos, que
 * necesita saber de quién es cada plato y no cuánto vende.
 */

/** Filas por página del listado, igual que el de usuarios de PAN-ADM-01. */
export const PUBLICACIONES_ADMIN_POR_PAGINA = 20;

/**
 * Segundo criterio: "Actualice el listado según nombre de plato, nombre de
 * cocinero, categoría o estado de disponibilidad".
 *
 * Plato y cocinero van en UN solo campo de búsqueda, con el mismo criterio que
 * PAN-ADM-01 (un input, no uno por columna).
 */
export const filtrosPublicacionAdminSchema = z.object({
  busqueda: z.string().trim().max(120).optional(),
  categoriaId: z.uuid().optional(),
  estadoPublicacion: z.enum(ESTADO_PUBLICACION).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(PUBLICACIONES_ADMIN_POR_PAGINA),
});

/**
 * Motivo obligatorio de la baja (cuarto criterio). Mismo tope de 500
 * caracteres que el motivo de suspensión de US-ADM-02 (decisión del equipo:
 * la US no fija uno).
 */
export const eliminarPublicacionAdminSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(1, MENSAJES_MODERACION.motivoEliminacionObligatorio)
    .max(500, MENSAJES_MODERACION.motivoEliminacionLargo),
});

const cocineroDePublicacionSchema = z.object({
  id: z.uuid(),
  nombre: z.string(),
  apellido: z.string(),
});

/**
 * Primer criterio: "imagen, nombre del plato, cocinero propietario,
 * categoría, precio, estado y fecha de creación".
 *
 * `precio` viaja como string por el mismo motivo que en el resto del sistema:
 * la columna es `numeric` y convertirla a `number` en el camino la redondea.
 */
export const publicacionAdminSchema = z.object({
  id: z.uuid(),
  nombre: z.string(),
  imagenUrl: z.url().nullable(),
  precio: z.string(),
  estadoPublicacion: z.enum(ESTADO_PUBLICACION),
  categoria: categoriaResumenSchema,
  cocinero: cocineroDePublicacionSchema,
  fechaCreacion: z.iso.datetime(),
});

/**
 * Tercer criterio: el detalle agrega la descripción a lo que ya muestra la
 * fila ("título, descripción, imagen, precio, categoría, estado y cocinero
 * asociado").
 */
export const detallePublicacionAdminSchema = publicacionAdminSchema.extend({
  descripcion: z.string().nullable(),
});

export const paginaPublicacionesAdminSchema = z.object({
  datos: z.array(publicacionAdminSchema),
  total: z.number().int().min(0),
  pagina: z.number().int().min(1),
  porPagina: z.number().int().min(1),
});

export type FiltrosPublicacionAdmin = z.infer<
  typeof filtrosPublicacionAdminSchema
>;
export type EliminarPublicacionAdminInput = z.infer<
  typeof eliminarPublicacionAdminSchema
>;
export type PublicacionAdmin = z.infer<typeof publicacionAdminSchema>;
export type DetallePublicacionAdmin = z.infer<
  typeof detallePublicacionAdminSchema
>;
export type PaginaPublicacionesAdmin = z.infer<
  typeof paginaPublicacionesAdminSchema
>;
