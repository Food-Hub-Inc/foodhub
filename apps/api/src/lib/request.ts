import type { Request } from 'express';
import { MENSAJES_AUTH } from '@foodhub/shared';
import type { UsuarioAutenticado } from '../middleware/auth.middleware.js';
import { AppError } from '../middleware/error.middleware.js';

/**
 * IP real del cliente.
 *
 * Detras del proxy de Railway, `req.ip` devuelve la IP del propio proxy salvo
 * que Express confie en el encabezado X-Forwarded-For. Por eso
 * `app.set('trust proxy', 1)` en app.ts: sin eso, todos los registros de
 * auditoria y los eventos de seguridad quedarian con la misma IP y el dato
 * seria inutil como evidencia.
 *
 * Vive en `lib/` y no en un middleware porque la consumen tres modulos
 * distintos (RBAC, auditoria y seguridad) y una copia por modulo se
 * desincroniza en cuanto cambie la forma de resolver la IP.
 */
export function obtenerIp(req: Request): string | null {
  return req.ip ?? req.socket.remoteAddress ?? null;
}

/**
 * Access token con el que llego la request.
 *
 * Se necesita fuera del middleware de autenticacion en un solo caso: la baja
 * de la cuenta propia (US-GURP-04) tiene que revocar las sesiones en GoTrue, y
 * la API admin de Supabase revoca a partir de un token valido del usuario, no
 * de su id.
 */
export function extraerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

/**
 * Sesion asociada a la request, ya verificada por `requiereAutenticacion`.
 *
 * El tipo de `req.usuario` incluye undefined porque el middleware de
 * autenticacion opcional lo deja vacio a proposito. En una ruta protegida ese
 * caso no puede darse, pero se contempla igual en lugar de forzar el tipo: si
 * alguien monta un handler protegido sin el middleware, la respuesta es un 401
 * y no una excepcion de acceso a undefined en produccion.
 */
export function sesionDe(req: Request): UsuarioAutenticado {
  if (!req.usuario) {
    throw new AppError(401, MENSAJES_AUTH.sesionRequerida, 'SIN_SESION');
  }
  return req.usuario;
}
