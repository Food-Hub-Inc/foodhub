import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';
import { MENSAJES_ERROR } from '@foodhub/shared';

/**
 * Limite reforzado para los endpoints publicos sensibles.
 *
 * El limitador global de app.ts (120 req/min) protege contra el abuso
 * automatizado generico, pero es demasiado permisivo para dos rutas concretas
 * que se pueden usar sin sesion:
 *
 *   POST /auth/recuperacion       revela si un correo tiene cuenta. Es una
 *                                 decision consciente del equipo (criterio de
 *                                 aceptacion textual de US-AUT-04), y el rate
 *                                 limit es la mitigacion acordada contra la
 *                                 enumeracion de usuarios.
 *   POST /seguridad/login-fallido escribe en `evento_seguridad` sin
 *                                 autenticacion. Sin tope, cualquiera infla la
 *                                 tabla hasta volver inutil la solapa de
 *                                 seguridad de PAN-AUD-01.
 *
 * DECISION SIN RESPALDO DOCUMENTAL: la documentacion pide "rate limit propio y
 * mas estricto" pero no fija numeros. 10 intentos cada 15 minutos por IP deja
 * lugar a un usuario que se equivoca varias veces seguidas y corta cualquier
 * intento de barrido.
 */
const VENTANA_MS = 15 * 60 * 1000;
const MAXIMO_POR_VENTANA = 10;

export const limitadorEstricto: RateLimitRequestHandler = rateLimit({
  windowMs: VENTANA_MS,
  limit: MAXIMO_POR_VENTANA,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: {
      codigo: 'DEMASIADAS_SOLICITUDES',
      mensaje: MENSAJES_ERROR.demasiadasSolicitudes,
    },
  },
});
