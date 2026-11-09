import type { NextFunction, Request, Response } from 'express';
import { eventoSeguridad } from '@foodhub/db';
import {
  MENSAJES_AUTH,
  MENSAJES_USUARIO,
  type TipoUsuario,
} from '@foodhub/shared';
import { db } from '../lib/db.js';
import { logger } from '../lib/logger.js';
import { obtenerIp } from '../lib/request.js';
import { AppError } from './error.middleware.js';

/**
 * Control de acceso basado en roles (RBAC).
 *
 * Implementa dos requisitos a la vez:
 *
 *   - Modulo de seguridad (alcance 2.2.2.2.1): "control de acceso por rol en
 *     cada pantalla y operacion".
 *   - US-AUD-01, segundo criterio: "un usuario intenta acceder a una
 *     funcionalidad sin permisos suficientes -> registre el intento de acceso
 *     indicando usuario, fecha, hora y recurso solicitado".
 *
 * El registro del intento denegado se hace aca, en un unico punto, y no en
 * cada handler: si dependiera de que cada endpoint se acuerde de registrarlo,
 * la auditoria tendria huecos.
 */

/**
 * Deja pasar solo a los roles indicados.
 *
 * Se usa SIEMPRE despues de `requiereAutenticacion`: si no hay usuario en el
 * request, responde 401 y no 403, porque la causa es la falta de sesion y no
 * la falta de permisos.
 *
 * @example
 *   router.post('/publicaciones', requiereAutenticacion, requiereRol('COCINERO'), crear);
 */
export function requiereRol(...rolesPermitidos: TipoUsuario[]) {
  // Nombrada y no anonima: es lo que permite comprobar, inspeccionando la pila
  // de un router, que una ruta sensible no quedo sin su guarda de rol. Lo usa
  // `resenas.router.test.ts` para US-RES-02, y de paso mejora los stack traces.
  return function verificarRol(
    req: Request,
    _res: Response,
    next: NextFunction,
  ): void {
    if (!req.usuario) {
      next(new AppError(401, MENSAJES_AUTH.sesionRequerida, 'SIN_SESION'));
      return;
    }

    if (rolesPermitidos.includes(req.usuario.tipo)) {
      next();
      return;
    }

    void registrarAccesoDenegado(req, rolesPermitidos);
    next(
      new AppError(
        403,
        MENSAJES_USUARIO.accesoNoAutorizado,
        'ROL_INSUFICIENTE',
      ),
    );
  };
}

/** Atajo legible para los endpoints exclusivos del panel de administracion. */
export const soloAdministrador = requiereRol('ADMINISTRADOR');

/**
 * Deja constancia del intento denegado en `evento_seguridad`.
 *
 * Es deliberadamente "fire and forget": si la escritura de auditoria falla, se
 * loguea el problema pero NO se altera la respuesta al usuario, que ya fue
 * rechazado correctamente. Un fallo del registro no debe convertir un 403 en
 * un 500 ni, mucho menos, dejar pasar el acceso.
 */
async function registrarAccesoDenegado(
  req: Request,
  rolesPermitidos: TipoUsuario[],
): Promise<void> {
  try {
    await db.insert(eventoSeguridad).values({
      tipoEvento: 'ACCESO_DENEGADO',
      usuarioId: req.usuario?.id ?? null,
      emailIntentado: req.usuario?.email ?? null,
      recursoSolicitado: `${req.method} ${req.originalUrl}`,
      ipOrigen: obtenerIp(req),
      motivo: `Rol ${req.usuario?.tipo ?? 'desconocido'}; se requiere ${rolesPermitidos.join(' o ')}.`,
    });
  } catch (error) {
    logger.error({ err: error }, 'no se pudo registrar el acceso denegado');
  }
}
