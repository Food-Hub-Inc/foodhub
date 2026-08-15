import { z } from 'zod';
import {
  OPERACION_AUDITORIA,
  TIPO_EVENTO_SEGURIDAD,
} from '../constants/enums.js';

/**
 * Contratos del modulo de Auditoria y Trazabilidad (US-AUD-01 y US-AUD-02).
 *
 * Son dos tablas con proposito distinto y por eso son dos contratos distintos:
 *
 *   registro_auditoria  operaciones de negocio: quien dio de alta, modifico o
 *                       dio de baja que cosa.                       US-AUD-02
 *   evento_seguridad    intentos fallidos de login y accesos denegados por
 *                       falta de permisos.                          US-AUD-01
 *
 * Ambas se consultan desde PAN-AUD-01, en dos solapas de la misma pantalla.
 */

/**
 * Tamanos de pagina admitidos.
 *
 * US-AUD-02 los fija explicitamente: "paginacion (ej. de a 20 o 50 resultados
 * por pagina)". Se declara como enum y no como un rango para que el selector
 * de la interfaz y la validacion del servidor no puedan desalinearse.
 */
export const TAMANOS_PAGINA_AUDITORIA = [20, 50] as const;

const porPaginaSchema = z.coerce
  .number()
  .refine(
    (v): v is (typeof TAMANOS_PAGINA_AUDITORIA)[number] =>
      TAMANOS_PAGINA_AUDITORIA.includes(
        v as (typeof TAMANOS_PAGINA_AUDITORIA)[number],
      ),
    { message: 'La paginación admite 20 o 50 registros por página.' },
  )
  .default(20);

/**
 * Rango de fechas de los filtros. Se valida que el desde no sea posterior al
 * hasta: sin eso la consulta devuelve una tabla vacia y el administrador cree
 * que no hay registros, cuando en realidad el filtro es imposible.
 */
const rangoFechas = {
  desde: z.iso.datetime().optional(),
  hasta: z.iso.datetime().optional(),
};

// El `| undefined` explicito es necesario con `exactOptionalPropertyTypes`:
// esa opcion distingue "propiedad ausente" de "propiedad presente en
// undefined", y zod entrega la segunda forma al refine.
const validarRango = (datos: {
  desde?: string | undefined;
  hasta?: string | undefined;
}) => !datos.desde || !datos.hasta || datos.desde <= datos.hasta;

const errorRango = {
  message: 'La fecha de inicio no puede ser posterior a la de fin.',
  path: ['desde'],
};

/**
 * US-AUD-02 - Filtros de la tabla de auditoria.
 *
 * El tercer criterio de aceptacion enumera exactamente cuatro: rango de
 * fechas, tipo de operacion, IP de origen e ID de usuario. No se agregan
 * otros: cada filtro de mas es una columna que hay que indexar y una opcion
 * mas que el administrador tiene que descartar.
 */
export const filtrosAuditoriaSchema = z
  .object({
    ...rangoFechas,
    operacion: z.enum(OPERACION_AUDITORIA).optional(),
    // No se valida como IP estricta: el filtro admite prefijos parciales
    // ("190.192.") para rastrear un rango de origen.
    ipOrigen: z.string().trim().max(45).optional(),
    usuarioId: z.uuid().optional(),
    pagina: z.coerce.number().int().min(1).default(1),
    porPagina: porPaginaSchema,
  })
  .refine(validarRango, errorRango);

/**
 * US-AUD-01, tercer criterio - Filtros de la solapa de eventos de seguridad.
 *
 * Cambian dos filtros respecto de la solapa de operaciones: el tipo de evento
 * reemplaza al tipo de operacion, y se puede buscar por el correo intentado,
 * que en un login fallido es el unico dato de identidad disponible (todavia no
 * hay usuario asociado).
 */
export const filtrosEventoSeguridadSchema = z
  .object({
    ...rangoFechas,
    tipoEvento: z.enum(TIPO_EVENTO_SEGURIDAD).optional(),
    emailIntentado: z.string().trim().max(255).optional(),
    ipOrigen: z.string().trim().max(45).optional(),
    usuarioId: z.uuid().optional(),
    pagina: z.coerce.number().int().min(1).default(1),
    porPagina: porPaginaSchema,
  })
  .refine(validarRango, errorRango);

/**
 * Fila de la tabla de auditoria.
 *
 * `usuarioEmail` viaja resuelto desde el servidor y no como un id a resolver
 * en el cliente: US-AUD-02 exige mostrar el correo en la tabla, y pedirlo por
 * separado por cada fila seria una consulta por registro listado.
 *
 * Es nullable porque la FK usa `on delete set null`: si la cuenta se elimina
 * fisicamente, el registro de lo que hizo tiene que sobrevivir igual.
 */
export const registroAuditoriaSchema = z.object({
  id: z.uuid(),
  fechaHora: z.iso.datetime(),
  usuarioId: z.uuid().nullable(),
  usuarioEmail: z.string().nullable(),
  operacion: z.enum(OPERACION_AUDITORIA),
  tipoObjeto: z.string(),
  objetoAfectadoId: z.uuid().nullable(),
  ipOrigen: z.string().nullable(),
  // Estructura libre: cada tipo de operacion guarda lo que le sirve. El modal
  // de detalle de PAN-AUD-01 lo renderiza como pares campo/valor.
  datosAdicionales: z.unknown().nullable(),
});

/** Fila de la solapa de seguridad de PAN-AUD-01. */
export const eventoSeguridadSchema = z.object({
  id: z.uuid(),
  fechaHora: z.iso.datetime(),
  tipoEvento: z.enum(TIPO_EVENTO_SEGURIDAD),
  emailIntentado: z.string().nullable(),
  usuarioId: z.uuid().nullable(),
  recursoSolicitado: z.string().nullable(),
  ipOrigen: z.string().nullable(),
  motivo: z.string().nullable(),
});

/**
 * US-AUD-01, segundo criterio - Reporte de un intento de login fallido.
 *
 * El login va del cliente directo a Supabase Auth y nunca pasa por la API, de
 * modo que el backend no puede observar el fallo por si mismo: es la app la
 * que avisa cuando `signInWithPassword` rechaza las credenciales.
 *
 * Solo se acepta el correo intentado. La IP y la fecha las pone el servidor:
 * si el cliente pudiera informarlas, el registro dejaria de ser evidencia.
 */
export const reportarLoginFallidoSchema = z.object({
  email: z.string().trim().toLowerCase().max(255),
});

/** Envoltorio de las respuestas paginadas de las dos solapas. */
export function paginaDeSchema<T extends z.ZodTypeAny>(fila: T) {
  return z.object({
    datos: z.array(fila),
    total: z.number().int().min(0),
    pagina: z.number().int().min(1),
    porPagina: z.number().int().min(1),
  });
}

export const paginaAuditoriaSchema = paginaDeSchema(registroAuditoriaSchema);
export const paginaEventoSeguridadSchema = paginaDeSchema(
  eventoSeguridadSchema,
);

export type FiltrosAuditoria = z.infer<typeof filtrosAuditoriaSchema>;
export type FiltrosEventoSeguridad = z.infer<
  typeof filtrosEventoSeguridadSchema
>;
export type RegistroAuditoria = z.infer<typeof registroAuditoriaSchema>;
export type EventoSeguridad = z.infer<typeof eventoSeguridadSchema>;
export type ReportarLoginFallidoInput = z.infer<
  typeof reportarLoginFallidoSchema
>;
export type PaginaAuditoria = z.infer<typeof paginaAuditoriaSchema>;
export type PaginaEventoSeguridad = z.infer<typeof paginaEventoSeguridadSchema>;
