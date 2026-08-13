import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { esProduccion } from '../config/env.js';
import { logger } from '../lib/logger.js';

/**
 * Error de negocio con codigo HTTP asociado.
 *
 * Distingue lo que el usuario debe ver de lo que no: un AppError lanzado por un
 * servicio lleva un mensaje pensado para el usuario final; cualquier otra
 * excepcion es un fallo no previsto y se responde de forma generica.
 */
export class AppError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly codigo?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const noEncontrado = (recurso: string) =>
  new AppError(404, `No se encontró ${recurso}.`, 'NO_ENCONTRADO');

export const noAutorizado = (mensaje = 'No tenés permiso para esta acción.') =>
  new AppError(403, mensaje, 'NO_AUTORIZADO');

/** Handler de rutas inexistentes. Debe registrarse despues de todos los routers. */
export function rutaNoEncontrada(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      codigo: 'RUTA_NO_ENCONTRADA',
      mensaje: `No existe ${req.method} ${req.path}.`,
    },
  });
}

/**
 * Manejador central de errores.
 *
 * Cumple el requisito del modulo de seguridad (alcance 2.2.2.2.1): "manejo
 * controlado de errores sin exponer informacion tecnica al usuario final". El
 * stack trace y el detalle van al log; al cliente solo le llega un mensaje
 * accionable. Filtrar mensajes de error de la base es una via habitual de
 * reconocimiento previo a un ataque.
 *
 * Express 5 identifica este middleware por su aridad de 4 parametros: hay que
 * declarar `_next` aunque no se use, o deja de reconocerlo como error handler.
 */
export function manejadorErrores(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // --- Errores de validacion de entrada ------------------------------------
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        codigo: 'VALIDACION',
        mensaje: 'Revisá los datos ingresados.',
        campos: err.issues.map((i) => ({
          campo: i.path.join('.'),
          mensaje: i.message,
        })),
      },
    });
    return;
  }

  // --- Errores de negocio esperados ----------------------------------------
  if (err instanceof AppError) {
    logger.warn(
      { err, path: req.path, status: err.status },
      'error de negocio',
    );
    res.status(err.status).json({
      error: { codigo: err.codigo ?? 'ERROR', mensaje: err.message },
    });
    return;
  }

  // --- Fallos no previstos --------------------------------------------------
  logger.error(
    { err, path: req.path, method: req.method },
    'error no controlado',
  );
  res.status(500).json({
    error: {
      codigo: 'ERROR_INTERNO',
      mensaje:
        'Ocurrió un error inesperado. Intentá nuevamente en unos minutos.',
      // El detalle tecnico solo se expone fuera de produccion.
      ...(esProduccion
        ? {}
        : { detalle: err instanceof Error ? err.message : String(err) }),
    },
  });
}
