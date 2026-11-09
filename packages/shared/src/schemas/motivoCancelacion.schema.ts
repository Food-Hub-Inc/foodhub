import { z } from 'zod';
import { MENSAJES_CONFIGURACION } from '../constants/mensajes.js';

/**
 * Contratos del modulo de Configuracion y parametros — motivos de
 * cancelacion de pedido (US-CFG-02, RF056, PAN-ADM-04).
 */

/**
 * Opciones fijas del selector "Aplicable a" (RF056). No es un ABM del panel:
 * son las 3 filas que siembra la migracion `0003_sembrar_tipos_usuario_
 * cancelacion.sql` en `tipo_usuario_cancelacion`, y el contrato de la API
 * trabaja con este codigo — el id de esa tabla es un detalle interno del
 * servicio, nunca viaja al cliente.
 */
export const TIPO_USUARIO_CANCELACION = [
  'COCINERO',
  'CLIENTE',
  'AMBOS',
] as const;
export type TipoUsuarioCancelacion = (typeof TIPO_USUARIO_CANCELACION)[number];

const nombreMotivoSchema = z
  .string()
  .trim()
  .min(1, MENSAJES_CONFIGURACION.campoObligatorio)
  .max(100, 'No puede superar los 100 caracteres.');

const aplicableASchema = z.enum(TIPO_USUARIO_CANCELACION, {
  message: MENSAJES_CONFIGURACION.campoObligatorio,
});

/** US-CFG-02 - Alta de motivo. */
export const crearMotivoCancelacionSchema = z.object({
  nombre: nombreMotivoSchema,
  aplicableA: aplicableASchema,
});

/** US-CFG-02 - Edicion parcial (nombre y/o aplicabilidad). */
export const editarMotivoCancelacionSchema = z
  .object({
    nombre: nombreMotivoSchema.optional(),
    aplicableA: aplicableASchema.optional(),
  })
  .refine((datos) => Object.keys(datos).length > 0, {
    message: 'No hay cambios para guardar.',
  });

/** Estado de habilitacion, para el filtro del listado. */
export const ESTADO_HABILITACION_MOTIVO = [
  'HABILITADO',
  'DESHABILITADO',
] as const;
export type EstadoHabilitacionMotivo =
  (typeof ESTADO_HABILITACION_MOTIVO)[number];

/** US-CFG-02 - Listado, filtrable por aplicabilidad y por estado. */
export const filtrosMotivoCancelacionSchema = z.object({
  aplicableA: z.enum(TIPO_USUARIO_CANCELACION).optional(),
  estado: z.enum(ESTADO_HABILITACION_MOTIVO).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Fila del listado de PAN-ADM-04. `pedidosAsociados` es la "cantidad de
 * pedidos asociados al motivo (acumulado histórico)" del criterio de
 * aceptación: se calcula en el servicio, no es una columna propia.
 */
export const motivoCancelacionListadoSchema = z.object({
  id: z.uuid(),
  nombre: z.string(),
  aplicableA: z.enum(TIPO_USUARIO_CANCELACION),
  activo: z.boolean(),
  pedidosAsociados: z.number().int().min(0),
});

export const paginaMotivosCancelacionSchema = z.object({
  datos: z.array(motivoCancelacionListadoSchema),
  total: z.number().int().min(0),
  pagina: z.number().int().min(1),
  porPagina: z.number().int().min(1),
});

/**
 * US-PED-04 (consumo, no administración) - Motivos rápidos que ve un
 * cocinero o cliente al rechazar/cancelar un pedido: solo los habilitados
 * con aplicabilidad para su rol o "AMBOS".
 */
export const motivoCancelacionRapidoSchema = z.object({
  id: z.uuid(),
  nombre: z.string(),
});

export type CrearMotivoCancelacionInput = z.infer<
  typeof crearMotivoCancelacionSchema
>;
export type EditarMotivoCancelacionInput = z.infer<
  typeof editarMotivoCancelacionSchema
>;
export type FiltrosMotivoCancelacion = z.infer<
  typeof filtrosMotivoCancelacionSchema
>;
export type MotivoCancelacionListado = z.infer<
  typeof motivoCancelacionListadoSchema
>;
export type PaginaMotivosCancelacion = z.infer<
  typeof paginaMotivosCancelacionSchema
>;
export type MotivoCancelacionRapido = z.infer<
  typeof motivoCancelacionRapidoSchema
>;
