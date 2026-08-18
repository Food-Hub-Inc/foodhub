import { Router } from 'express';
import { votoFaqInputSchema } from '@foodhub/shared';
import { requiereAutenticacion } from '../../middleware/auth.middleware.js';
import { requiereRol } from '../../middleware/rbac.middleware.js';
import { sesionDe } from '../../lib/request.js';
import * as soporteService from './soporte.service.js';
import { z } from 'zod';

/** Endpoints de ayuda destinados a clientes y cocineros autenticados. */
export const soporteRouter: Router = Router();

soporteRouter.use(requiereAutenticacion, requiereRol('CLIENTE', 'COCINERO'));

soporteRouter.get('/faqs', async (req, res) => {
  const rol = sesionDe(req).tipo;
  soporteService.validarRolFaq(rol);
  const faqs = await soporteService.listarFaqPorRol(rol);
  res.json(faqs);
});

soporteRouter.post('/faqs/:id/voto', async (req, res) => {
  const rol = sesionDe(req).tipo;
  soporteService.validarRolFaq(rol);
  const id = z.uuid().parse(req.params.id);
  const datos = votoFaqInputSchema.parse(req.body);
  await soporteService.registrarVotoFaq(id, datos.util, rol);
  res.status(204).send();
});
