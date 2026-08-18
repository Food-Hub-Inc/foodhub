import { z } from 'zod';
import { MENSAJES_CONFIGURACION } from '../constants/mensajes.js';

/**
 * Contratos del modulo de Configuracion y parametros — categorias de platos
 * (US-CFG-01, RF054, PAN-ADM-04).
 */

const nombreCategoriaSchema = z
  .string()
  .trim()
  .min(1, MENSAJES_CONFIGURACION.campoObligatorio)
  .max(50, 'No puede superar los 50 caracteres.');

const descripcionCategoriaSchema = z
  .string()
  .trim()
  .max(200, 'La descripción no puede superar los 200 caracteres.');

/** US-CFG-01 - Alta de categoria. */
export const crearCategoriaSchema = z.object({
  nombre: nombreCategoriaSchema,
  descripcion: descripcionCategoriaSchema.optional(),
  imagenPredeterminadaUrl: z.url().nullable().optional(),
});

/**
 * US-CFG-01 - Edicion. Todos los campos son opcionales para admitir la
 * edicion parcial, igual que `editarPerfilSchema` en `usuario.schema.ts`.
 */
export const editarCategoriaSchema = z
  .object({
    nombre: nombreCategoriaSchema.optional(),
    descripcion: descripcionCategoriaSchema.nullable().optional(),
    imagenPredeterminadaUrl: z.url().nullable().optional(),
  })
  .refine((datos) => Object.keys(datos).length > 0, {
    message: 'No hay cambios para guardar.',
  });

/** Estado de habilitacion, para el filtro del listado (RNF002). */
export const ESTADO_HABILITACION_CATEGORIA = [
  'HABILITADA',
  'DESHABILITADA',
] as const;
export type EstadoHabilitacionCategoria =
  (typeof ESTADO_HABILITACION_CATEGORIA)[number];

/** US-CFG-01 - Listado paginado, con busqueda por nombre y filtro por estado. */
export const filtrosCategoriaSchema = z.object({
  busqueda: z.string().trim().max(80).optional(),
  estado: z.enum(ESTADO_HABILITACION_CATEGORIA).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Fila del listado de PAN-ADM-04. El criterio de aceptacion pide, ademas de
 * los datos propios, la "cantidad de publicaciones activas asociadas" — se
 * calcula en el servicio, no es una columna de `categoria`.
 */
export const categoriaListadoSchema = z.object({
  id: z.uuid(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  imagenPredeterminadaUrl: z.string().nullable(),
  activo: z.boolean(),
  publicacionesActivas: z.number().int().min(0),
  fechaCreacion: z.string(),
});

export const paginaCategoriasSchema = z.object({
  datos: z.array(categoriaListadoSchema),
  total: z.number().int().min(0),
  pagina: z.number().int().min(1),
  porPagina: z.number().int().min(1),
});

export type CrearCategoriaInput = z.infer<typeof crearCategoriaSchema>;
export type EditarCategoriaInput = z.infer<typeof editarCategoriaSchema>;
export type FiltrosCategoria = z.infer<typeof filtrosCategoriaSchema>;
export type CategoriaListado = z.infer<typeof categoriaListadoSchema>;
export type PaginaCategorias = z.infer<typeof paginaCategoriasSchema>;
