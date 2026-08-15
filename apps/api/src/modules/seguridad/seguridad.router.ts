import { Router } from 'express';
import { reportarLoginFallidoSchema } from '@foodhub/shared';
import { obtenerIp } from '../../lib/request.js';
import { limitadorEstricto } from '../../middleware/rate-limit.middleware.js';
import { registrarLoginFallido } from '../auditoria/auditoria.service.js';

/**
 * Reporte de intentos de login fallidos (US-AUD-01, segundo criterio).
 *
 * El login va del cliente directo a GoTrue y nunca pasa por la API, asi que el
 * backend no puede observar el fallo por si mismo: es la app la que avisa
 * cuando `signInWithPassword` rechaza las credenciales.
 *
 * El endpoint es publico por necesidad (quien falla el login no tiene sesion) y
 * por eso lleva el limitador estricto: sin tope, cualquiera podria inflar
 * `evento_seguridad` hasta volver inutil la solapa de seguridad del panel.
 */
export const seguridadRouter: Router = Router();

seguridadRouter.post('/login-fallido', limitadorEstricto, async (req, res) => {
  const { email } = reportarLoginFallidoSchema.parse(req.body);

  // Se espera la escritura pero se responde 204 aunque falle: es un reporte, no
  // una operacion de la que dependa el usuario, y devolverle un error por algo
  // que no puede resolver solo agregaria ruido a una pantalla de login que ya
  // esta mostrando un fallo. `registrarLoginFallido` nunca propaga: loguea.
  await registrarLoginFallido({ email, ipOrigen: obtenerIp(req) });

  res.status(204).end();
});
