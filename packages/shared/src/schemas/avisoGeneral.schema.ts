import { z } from 'zod';
import { MENSAJES_AVISO } from '../constants/mensajes.js';

/**
 * Aviso general del administrador — US-NOT-04 / RF037.
 *
 * El criterio fija tres destinatarios: "todos los usuarios registrados en el
 * sistema (clientes y cocineros)", "solo a clientes" o "solo a cocineros". El
 * administrador nunca es destinatario: no tiene historial ni recibe push.
 */
export const DESTINATARIO_AVISO = ['TODOS', 'CLIENTE', 'COCINERO'] as const;
export type DestinatarioAviso = (typeof DESTINATARIO_AVISO)[number];

/** Topes de las columnas `notificacion.titulo` y `notificacion.cuerpo`. */
export const LARGO_MAXIMO_TITULO_AVISO = 120;
export const LARGO_MAXIMO_MENSAJE_AVISO = 500;

export const avisoGeneralSchema = z.object({
  titulo: z
    .string()
    .trim()
    .min(1, MENSAJES_AVISO.tituloObligatorio)
    .max(LARGO_MAXIMO_TITULO_AVISO, MENSAJES_AVISO.tituloLargo),
  mensaje: z
    .string()
    .trim()
    .min(1, MENSAJES_AVISO.mensajeObligatorio)
    .max(LARGO_MAXIMO_MENSAJE_AVISO, MENSAJES_AVISO.mensajeLargo),
  destinatario: z.enum(DESTINATARIO_AVISO),
});

/** Cuántas cuentas recibieron el aviso: lo muestra el panel al confirmar. */
export const resultadoAvisoGeneralSchema = z.object({
  destinatarios: z.number().int().min(0),
});

export type AvisoGeneralInput = z.infer<typeof avisoGeneralSchema>;
export type ResultadoAvisoGeneral = z.infer<typeof resultadoAvisoGeneralSchema>;
