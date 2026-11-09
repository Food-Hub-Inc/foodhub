import { Router } from 'express';
import { z } from 'zod';
import {
  crearCategoriaSchema,
  editarCategoriaSchema,
  filtrosCategoriaSchema,
  MENSAJES_CONFIGURACION,
} from '@foodhub/shared';
import { obtenerIp, sesionDe } from '../../lib/request.js';
import { requiereAutenticacion } from '../../middleware/auth.middleware.js';
import { soloAdministrador } from '../../middleware/rbac.middleware.js';
import * as categoriasService from './categorias.service.js';

/**
 * Rutas de categorias de platos (US-CFG-01, PAN-ADM-04).
 *
 * Exclusivo del administrador: es el ABM de una entidad de referencia, no una
 * consulta que otros roles necesiten. El desplegable de categoria que
 * consume el cocinero al publicar un plato (US-PUB-01) es un endpoint de
 * solo lectura aparte, sin restriccion de rol.
 */
export const categoriasRouter: Router = Router();

const idCategoriaSchema = z.uuid('El identificador de categoría no es válido.');

categoriasRouter.use(requiereAutenticacion, soloAdministrador);

categoriasRouter.get('/', async (req, res) => {
  const pagina = await categoriasService.listarCategorias(
    filtrosCategoriaSchema.parse(req.query),
  );
  res.json(pagina);
});

categoriasRouter.post('/', async (req, res) => {
  const categoria = await categoriasService.crearCategoria({
    datos: crearCategoriaSchema.parse(req.body),
    administradorId: sesionDe(req).id,
    ipOrigen: obtenerIp(req),
  });
  res.status(201).json(categoria);
});

categoriasRouter.patch('/:id', async (req, res) => {
  const categoria = await categoriasService.editarCategoria({
    categoriaId: idCategoriaSchema.parse(req.params.id),
    datos: editarCategoriaSchema.parse(req.body),
    administradorId: sesionDe(req).id,
    ipOrigen: obtenerIp(req),
  });
  res.json(categoria);
});

categoriasRouter.post('/:id/habilitacion', async (req, res) => {
  await categoriasService.establecerHabilitacionCategoria({
    categoriaId: idCategoriaSchema.parse(req.params.id),
    activo: true,
    administradorId: sesionDe(req).id,
    ipOrigen: obtenerIp(req),
  });
  res.json({ mensaje: MENSAJES_CONFIGURACION.categoriaHabilitada });
});

categoriasRouter.delete('/:id/habilitacion', async (req, res) => {
  await categoriasService.establecerHabilitacionCategoria({
    categoriaId: idCategoriaSchema.parse(req.params.id),
    activo: false,
    administradorId: sesionDe(req).id,
    ipOrigen: obtenerIp(req),
  });
  res.json({ mensaje: MENSAJES_CONFIGURACION.categoriaDeshabilitada });
});

categoriasRouter.delete('/:id', async (req, res) => {
  await categoriasService.eliminarCategoria({
    categoriaId: idCategoriaSchema.parse(req.params.id),
    administradorId: sesionDe(req).id,
    ipOrigen: obtenerIp(req),
  });
  res.json({ mensaje: MENSAJES_CONFIGURACION.categoriaEliminada });
});
