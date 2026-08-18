import { Router } from 'express';
import {
  parametrosBusquedaSchema,
  parametrosInstitucionalesSchema,
  parametrosPedidosSchema,
  parametrosResenasSchema,
} from '@foodhub/shared';
import { obtenerIp, sesionDe } from '../../lib/request.js';
import { requiereAutenticacion } from '../../middleware/auth.middleware.js';
import { soloAdministrador } from '../../middleware/rbac.middleware.js';
import * as parametrosService from './parametrosSistema.service.js';

/** Rutas de parámetros generales del sistema (US-CFG-03, PAN-ADM-04). Exclusivo del administrador. */
export const parametrosSistemaRouter: Router = Router();

parametrosSistemaRouter.use(requiereAutenticacion, soloAdministrador);

parametrosSistemaRouter.get('/', async (_req, res) => {
  res.json(await parametrosService.obtenerParametrosSistema());
});

parametrosSistemaRouter.patch('/busqueda', async (req, res) => {
  const actualizado = await parametrosService.actualizarParametrosBusqueda({
    datos: parametrosBusquedaSchema.parse(req.body),
    administradorId: sesionDe(req).id,
    ipOrigen: obtenerIp(req),
  });
  res.json(actualizado);
});

parametrosSistemaRouter.post('/busqueda/restaurar', async (req, res) => {
  const restaurado = await parametrosService.restaurarParametrosBusqueda({
    administradorId: sesionDe(req).id,
    ipOrigen: obtenerIp(req),
  });
  res.json(restaurado);
});

parametrosSistemaRouter.patch('/pedidos', async (req, res) => {
  const actualizado = await parametrosService.actualizarParametrosPedidos({
    datos: parametrosPedidosSchema.parse(req.body),
    administradorId: sesionDe(req).id,
    ipOrigen: obtenerIp(req),
  });
  res.json(actualizado);
});

parametrosSistemaRouter.post('/pedidos/restaurar', async (req, res) => {
  const restaurado = await parametrosService.restaurarParametrosPedidos({
    administradorId: sesionDe(req).id,
    ipOrigen: obtenerIp(req),
  });
  res.json(restaurado);
});

parametrosSistemaRouter.patch('/resenas', async (req, res) => {
  const actualizado = await parametrosService.actualizarParametrosResenas({
    datos: parametrosResenasSchema.parse(req.body),
    administradorId: sesionDe(req).id,
    ipOrigen: obtenerIp(req),
  });
  res.json(actualizado);
});

parametrosSistemaRouter.post('/resenas/restaurar', async (req, res) => {
  const restaurado = await parametrosService.restaurarParametrosResenas({
    administradorId: sesionDe(req).id,
    ipOrigen: obtenerIp(req),
  });
  res.json(restaurado);
});

parametrosSistemaRouter.patch('/institucional', async (req, res) => {
  const actualizado =
    await parametrosService.actualizarParametrosInstitucionales({
      datos: parametrosInstitucionalesSchema.parse(req.body),
      administradorId: sesionDe(req).id,
      ipOrigen: obtenerIp(req),
    });
  res.json(actualizado);
});

parametrosSistemaRouter.post('/institucional/restaurar', async (req, res) => {
  const restaurado = await parametrosService.restaurarParametrosInstitucionales(
    {
      administradorId: sesionDe(req).id,
      ipOrigen: obtenerIp(req),
    },
  );
  res.json(restaurado);
});
