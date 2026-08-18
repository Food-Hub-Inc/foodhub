import { Router } from 'express';
import { z } from 'zod';
import {
  guardarBorradorTerminosSchema,
  publicarVersionTerminosSchema,
  TIPO_VERSION_TERMINOS,
} from '@foodhub/shared';
import { obtenerIp, sesionDe } from '../../lib/request.js';
import { requiereAutenticacion } from '../../middleware/auth.middleware.js';
import { soloAdministrador } from '../../middleware/rbac.middleware.js';
import * as terminosService from './terminos.service.js';

/** Rutas de términos y condiciones / política de privacidad (US-CFG-04, PAN-ADM-04). Exclusivo del administrador. */
export const terminosRouter: Router = Router();

const tipoSchema = z.enum(TIPO_VERSION_TERMINOS, {
  message: 'El tipo de documento no es válido.',
});
const idVersionSchema = z.uuid('El identificador de versión no es válido.');

terminosRouter.use(requiereAutenticacion, soloAdministrador);

terminosRouter.get('/:tipo', async (req, res) => {
  const estado = await terminosService.obtenerEstado({
    tipo: tipoSchema.parse(req.params.tipo),
    administradorId: sesionDe(req).id,
  });
  res.json(estado);
});

terminosRouter.get('/:tipo/historial', async (req, res) => {
  const historial = await terminosService.listarHistorial(
    tipoSchema.parse(req.params.tipo),
  );
  res.json(historial);
});

terminosRouter.get('/:tipo/version/:id', async (req, res) => {
  const version = await terminosService.obtenerVersionCompleta({
    tipo: tipoSchema.parse(req.params.tipo),
    versionId: idVersionSchema.parse(req.params.id),
  });
  res.json(version);
});

terminosRouter.post('/:tipo/borrador', async (req, res) => {
  const borrador = await terminosService.guardarBorrador({
    tipo: tipoSchema.parse(req.params.tipo),
    contenidoHtml: guardarBorradorTerminosSchema.parse(req.body).contenidoHtml,
    administradorId: sesionDe(req).id,
    ipOrigen: obtenerIp(req),
  });
  res.json(borrador);
});

terminosRouter.post('/:tipo/publicar', async (req, res) => {
  const vigente = await terminosService.publicarVersion({
    tipo: tipoSchema.parse(req.params.tipo),
    contenidoHtml: publicarVersionTerminosSchema.parse(req.body).contenidoHtml,
    administradorId: sesionDe(req).id,
    ipOrigen: obtenerIp(req),
  });
  res.json(vigente);
});
