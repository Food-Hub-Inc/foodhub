import { z } from 'zod';
import { emailSchema } from './auth.schema.js';
import { MENSAJES_CONFIGURACION } from '../constants/mensajes.js';

/**
 * Contratos del modulo de Configuracion y parametros — parametros generales
 * del sistema (US-CFG-03, RF057, PAN-ADM-04).
 *
 * `configuracion_sistema` es una tabla clave/valor: cada parametro es una
 * fila con `clave` unica y `valor` en texto. Este archivo es el UNICO lugar
 * donde se declaran esas claves — cualquier modulo futuro que necesite leer
 * un parametro (Pedidos con el tiempo de expiracion, Exploracion con el radio
 * de busqueda...) importa `CLAVE_PARAMETRO` de aca en lugar de repetir el
 * string.
 */
export const CLAVE_PARAMETRO = {
  radioBusquedaDefectoKm: 'radio_busqueda_defecto_km',
  distanciaMaximaFiltroKm: 'distancia_maxima_filtro_km',
  feedPublicacionesPorPagina: 'feed_publicaciones_por_pagina',
  pedidoTiempoCancelacionClienteMinutos:
    'pedido_tiempo_cancelacion_cliente_minutos',
  pedidoExpiracionMinutos: 'pedido_expiracion_minutos',
  resenaMinimoParaPromedio: 'resena_minimo_para_promedio',
  resenaLimiteDiasParaResenar: 'resena_limite_dias_para_resenar',
  plataformaNombre: 'plataforma_nombre',
  plataformaLogoUrl: 'plataforma_logo_url',
  plataformaCorreoSoporte: 'plataforma_correo_soporte',
  plataformaHorarioAtencionSoporte: 'plataforma_horario_atencion_soporte',
} as const;

export const SECCION_PARAMETROS_SISTEMA = [
  'BUSQUEDA',
  'PEDIDOS',
  'RESENAS',
  'INSTITUCIONAL',
] as const;
export type SeccionParametrosSistema =
  (typeof SECCION_PARAMETROS_SISTEMA)[number];

// ---------------------------------------------------------------------------
// Parametros de busqueda y descubrimiento
// ---------------------------------------------------------------------------

export const parametrosBusquedaSchema = z.object({
  radioBusquedaDefectoKm: z
    .number({ message: 'Ingresá un número válido.' })
    .min(0.5, 'Debe estar entre 0,5 y 50 km.')
    .max(50, 'Debe estar entre 0,5 y 50 km.'),
  distanciaMaximaFiltroKm: z
    .number({ message: 'Ingresá un número válido.' })
    .min(1, 'Debe estar entre 1 y 100 km.')
    .max(100, 'Debe estar entre 1 y 100 km.'),
  feedPublicacionesPorPagina: z
    .number({ message: 'Ingresá un número válido.' })
    .int('Debe ser un número entero.')
    .min(5, 'Debe estar entre 5 y 50.')
    .max(50, 'Debe estar entre 5 y 50.'),
});
export type ParametrosBusqueda = z.infer<typeof parametrosBusquedaSchema>;

/** RF057: "Radio de busqueda por defecto en km" es 5, "distancia maxima" 20, "publicaciones por pagina" 20 — sin valor de fabrica fijado por el documento; el equipo elige uno razonable dentro del rango. */
export const PARAMETROS_BUSQUEDA_DEFAULT: ParametrosBusqueda = {
  radioBusquedaDefectoKm: 5,
  distanciaMaximaFiltroKm: 20,
  feedPublicacionesPorPagina: 20,
};

// ---------------------------------------------------------------------------
// Parametros de pedidos
// ---------------------------------------------------------------------------

export const parametrosPedidosSchema = z.object({
  tiempoCancelacionClienteMinutos: z
    .number({ message: 'Ingresá un número válido.' })
    .int('Debe ser un número entero.')
    .min(1, 'Debe estar entre 1 y 60 minutos.')
    .max(60, 'Debe estar entre 1 y 60 minutos.'),
  tiempoExpiracionCocineroMinutos: z
    .number({ message: 'Ingresá un número válido.' })
    .int('Debe ser un número entero.')
    .min(5, 'Debe estar entre 5 y 120 minutos.')
    .max(120, 'Debe estar entre 5 y 120 minutos.'),
});
export type ParametrosPedidos = z.infer<typeof parametrosPedidosSchema>;

/**
 * `tiempoExpiracionCocineroMinutos` en 15 no es arbitrario: coincide con
 * `PEDIDO_EXPIRACION_MINUTOS` (apps/api/src/config/env.ts), el valor por
 * defecto que ya regia por variable de entorno antes de que existiera este
 * ABM (US-PED-10).
 */
export const PARAMETROS_PEDIDOS_DEFAULT: ParametrosPedidos = {
  tiempoCancelacionClienteMinutos: 5,
  tiempoExpiracionCocineroMinutos: 15,
};

// ---------------------------------------------------------------------------
// Parametros de resenas
// ---------------------------------------------------------------------------

export const parametrosResenasSchema = z.object({
  minimoResenasParaPromedio: z
    .number({ message: 'Ingresá un número válido.' })
    .int('Debe ser un número entero.')
    .min(0, 'No puede ser negativo.'),
  limiteDiasParaResenar: z
    .number({ message: 'Ingresá un número válido.' })
    .int('Debe ser un número entero.')
    .min(1, 'Debe estar entre 1 y 60 días.')
    .max(60, 'Debe estar entre 1 y 60 días.'),
});
export type ParametrosResenas = z.infer<typeof parametrosResenasSchema>;

export const PARAMETROS_RESENAS_DEFAULT: ParametrosResenas = {
  minimoResenasParaPromedio: 3,
  limiteDiasParaResenar: 14,
};

// ---------------------------------------------------------------------------
// Informacion institucional
// ---------------------------------------------------------------------------

export const parametrosInstitucionalesSchema = z.object({
  nombrePlataforma: z
    .string()
    .trim()
    .min(1, MENSAJES_CONFIGURACION.campoObligatorio)
    .max(80, 'No puede superar los 80 caracteres.'),
  logoPlataformaUrl: z.url().nullable(),
  correoSoporte: emailSchema,
  /**
   * US-AYU-04 - Horario de atencion que la pantalla de Contacto del soporte
   * muestra al usuario. Se guarda como texto libre porque el formato ("Lun a
   * Vie 9 a 18 hs", "24/7", etc.) lo decide el administrador.
   */
  horarioAtencionSoporte: z
    .string()
    .trim()
    .min(1, MENSAJES_CONFIGURACION.campoObligatorio)
    .max(200, 'No puede superar los 200 caracteres.'),
});
export type ParametrosInstitucionales = z.infer<
  typeof parametrosInstitucionalesSchema
>;

export const PARAMETROS_INSTITUCIONALES_DEFAULT: ParametrosInstitucionales = {
  nombrePlataforma: 'FoodHub',
  logoPlataformaUrl: null,
  correoSoporte: 'soporte@foodhub.com',
  horarioAtencionSoporte: 'Lunes a viernes de 9 a 18 hs',
};

// ---------------------------------------------------------------------------
// Combinado (lectura completa, GET /configuracion/parametros)
// ---------------------------------------------------------------------------

export const parametrosSistemaSchema = z.object({
  busqueda: parametrosBusquedaSchema,
  pedidos: parametrosPedidosSchema,
  resenas: parametrosResenasSchema,
  institucional: parametrosInstitucionalesSchema,
});
export type ParametrosSistema = z.infer<typeof parametrosSistemaSchema>;
