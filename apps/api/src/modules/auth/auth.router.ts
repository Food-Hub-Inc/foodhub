import { Router } from 'express';
import {
  registroClienteSchema,
  registroCocineroSchema,
  solicitarRecuperacionSchema,
} from '@foodhub/shared';
import { obtenerIp } from '../../lib/request.js';
import { limitadorEstricto } from '../../middleware/rate-limit.middleware.js';
import * as authService from './auth.service.js';

/**
 * Rutas publicas de autenticacion (US-AUT-01, US-AUT-02, US-AUT-04).
 *
 * Ninguna exige sesion, por definicion: son las tres operaciones que se hacen
 * antes de tenerla. El login (US-AUT-03) y el cierre de sesion (US-AUT-05) no
 * figuran porque los resuelve el SDK de Supabase contra GoTrue sin pasar por la
 * API.
 *
 * El router solo traduce HTTP a dominio: valida el body con el schema
 * compartido y delega. Las reglas viven en auth.service.ts.
 */
export const authRouter: Router = Router();

authRouter.post('/registro/cliente', async (req, res) => {
  const datos = registroClienteSchema.parse(req.body);
  const perfil = await authService.registrarCliente({
    datos,
    ipOrigen: obtenerIp(req),
  });
  res.status(201).json(perfil);
});

authRouter.post('/registro/cocinero', async (req, res) => {
  const datos = registroCocineroSchema.parse(req.body);
  const perfil = await authService.registrarCocinero({
    datos,
    ipOrigen: obtenerIp(req),
  });
  res.status(201).json(perfil);
});

// El limitador estricto va antes del handler para que cuente tambien los
// intentos con un cuerpo invalido: si solo contara los validos, bastaria con
// alternar cuerpos rotos para sondear correos sin consumir el cupo.
authRouter.post('/recuperacion', limitadorEstricto, async (req, res) => {
  const { email } = solicitarRecuperacionSchema.parse(req.body);
  const respuesta = await authService.solicitarRecuperacion({
    email,
    ipOrigen: obtenerIp(req),
  });
  res.json(respuesta);
});
