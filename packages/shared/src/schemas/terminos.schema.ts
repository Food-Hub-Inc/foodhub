import { z } from 'zod';
import { MENSAJES_CONFIGURACION } from '../constants/mensajes.js';

/**
 * Contratos del modulo de Configuracion y parametros — términos y
 * condiciones / política de privacidad (US-CFG-04, RF058, PAN-ADM-04).
 *
 * `version_terminos.tipo` es un varchar libre en la base (no un ENUM de
 * Postgres): estos dos son los unicos valores que la aplicacion escribe.
 */
export const TIPO_VERSION_TERMINOS = ['TERMINOS', 'PRIVACIDAD'] as const;
export type TipoVersionTerminos = (typeof TIPO_VERSION_TERMINOS)[number];

/**
 * Tope defensivo del editor. RF058 no fija un maximo: es una salvaguarda de
 * seguridad (un body descomunal no debe poder colgar el proceso), no una
 * regla de negocio.
 */
const contenidoHtmlSchema = z
  .string()
  .trim()
  .min(1, MENSAJES_CONFIGURACION.campoObligatorio)
  .max(500_000, 'El contenido es demasiado extenso.');

export const guardarBorradorTerminosSchema = z.object({
  contenidoHtml: contenidoHtmlSchema,
});
export const publicarVersionTerminosSchema = z.object({
  contenidoHtml: contenidoHtmlSchema,
});

const autorSchema = z
  .object({
    id: z.uuid(),
    nombre: z.string(),
    apellido: z.string(),
  })
  .nullable();

/** US-CFG-04 - Versión vigente de un tipo, con quién y cuándo la publicó. */
export const versionVigenteTerminosSchema = z.object({
  id: z.uuid(),
  numeroVersion: z.number().int(),
  contenidoHtml: z.string(),
  fechaPublicacion: z.iso.datetime(),
  adminAutor: autorSchema,
});

/**
 * US-CFG-04 - Borrador del administrador que está pidiendo el estado. RF058:
 * "el borrador se deberá mantener asociado al administrador que lo creó" —
 * cada admin tiene, a lo sumo, un borrador propio por tipo.
 */
export const borradorTerminosSchema = z.object({
  id: z.uuid(),
  contenidoHtml: z.string(),
});

export const estadoTerminosSchema = z.object({
  vigente: versionVigenteTerminosSchema.nullable(),
  borrador: borradorTerminosSchema.nullable(),
});

/** US-CFG-04 - Fila del historial. Read-only, sin contenido (se pide aparte). */
export const versionHistorialSchema = z.object({
  id: z.uuid(),
  numeroVersion: z.number().int(),
  fechaPublicacion: z.iso.datetime(),
  adminAutor: autorSchema,
});
export const historialTerminosSchema = z.array(versionHistorialSchema);

/** US-CFG-04 - "Ver contenido" de una versión puntual del historial. */
export const versionCompletaSchema = z.object({
  id: z.uuid(),
  numeroVersion: z.number().int(),
  contenidoHtml: z.string(),
  fechaPublicacion: z.iso.datetime(),
  adminAutor: autorSchema,
});

/**
 * RF058 (consumo) - Los dos documentos vigentes juntos, para la pantalla de
 * re-aceptación obligatoria de la app móvil.
 */
export const terminosVigentesParaAceptarSchema = z.object({
  terminos: z.object({
    contenidoHtml: z.string(),
    numeroVersion: z.number().int(),
  }),
  privacidad: z.object({
    contenidoHtml: z.string(),
    numeroVersion: z.number().int(),
  }),
});

export type GuardarBorradorTerminosInput = z.infer<
  typeof guardarBorradorTerminosSchema
>;
export type PublicarVersionTerminosInput = z.infer<
  typeof publicarVersionTerminosSchema
>;
export type VersionVigenteTerminos = z.infer<
  typeof versionVigenteTerminosSchema
>;
export type BorradorTerminos = z.infer<typeof borradorTerminosSchema>;
export type EstadoTerminos = z.infer<typeof estadoTerminosSchema>;
export type VersionHistorial = z.infer<typeof versionHistorialSchema>;
export type HistorialTerminos = z.infer<typeof historialTerminosSchema>;
export type VersionCompleta = z.infer<typeof versionCompletaSchema>;
export type TerminosVigentesParaAceptar = z.infer<
  typeof terminosVigentesParaAceptarSchema
>;
