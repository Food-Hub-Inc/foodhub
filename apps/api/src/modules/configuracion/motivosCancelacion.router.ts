import { Router } from 'express';
import { z } from 'zod';
import {
  crearMotivoCancelacionSchema,
  editarMotivoCancelacionSchema,
  filtrosMotivoCancelacionSchema,
  MENSAJES_CONFIGURACION,
} from '@foodhub/shared';
import { obtenerIp, sesionDe } from '../../lib/request.js';
import { requiereAutenticacion } from '../../middleware/auth.middleware.js';
import { soloAdministrador } from '../../middleware/rbac.middleware.js';
import * as motivosService from './motivosCancelacion.service.js';

/** Rutas de motivos de cancelación de pedido (US-CFG-02, PAN-ADM-04). Exclusivo del administrador. */
export const motivosCancelacionRouter: Router = Router();

const idMotivoSchema = z.uuid('El identificador de motivo no es válido.');

motivosCancelacionRouter.use(requiereAutenticacion, soloAdministrador);

motivosCancelacionRouter.get('/', async (req, res) => {
  const pagina = await motivosService.listarMotivosCancelacion(
    filtrosMotivoCancelacionSchema.parse(req.query),
  );
  res.json(pagina);
});

motivosCancelacionRouter.post('/', async (req, res) => {
  const motivo = await motivosService.crearMotivoCancelacion({
    datos: crearMotivoCancelacionSchema.parse(req.body),
    administradorId: sesionDe(req).id,
    ipOrigen: obtenerIp(req),
  });
  res.status(201).json(motivo);
});

motivosCancelacionRouter.patch('/:id', async (req, res) => {
  await motivosService.editarMotivoCancelacion({
    motivoId: idMotivoSchema.parse(req.params.id),
    datos: editarMotivoCancelacionSchema.parse(req.body),
    administradorId: sesionDe(req).id,
    ipOrigen: obtenerIp(req),
  });
  res.json({ mensaje: MENSAJES_CONFIGURACION.motivoActualizado });
});

motivosCancelacionRouter.post('/:id/habilitacion', async (req, res) => {
  await motivosService.establecerHabilitacionMotivo({
    motivoId: idMotivoSchema.parse(req.params.id),
    activo: true,
    administradorId: sesionDe(req).id,
    ipOrigen: obtenerIp(req),
  });
  res.json({ mensaje: MENSAJES_CONFIGURACION.motivoHabilitado });
});

motivosCancelacionRouter.delete('/:id/habilitacion', async (req, res) => {
  await motivosService.establecerHabilitacionMotivo({
    motivoId: idMotivoSchema.parse(req.params.id),
    activo: false,
    administradorId: sesionDe(req).id,
    ipOrigen: obtenerIp(req),
  });
  res.json({ mensaje: MENSAJES_CONFIGURACION.motivoDeshabilitado });
});
