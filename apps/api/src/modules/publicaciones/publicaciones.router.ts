import { Router } from 'express';
import { z } from 'zod';
import {
  cambiarDisponibilidadPublicacionSchema,
  crearPublicacionSchema,
  editarPublicacionSchema,
  filtrosPublicacionSchema,
  MENSAJES_PUBLICACION,
} from '@foodhub/shared';
import { sesionDe } from '../../lib/request.js';
import { requiereAutenticacion } from '../../middleware/auth.middleware.js';
import { requiereRol } from '../../middleware/rbac.middleware.js';
import * as publicacionesService from './publicaciones.service.js';

/**
 * Rutas del modulo de Publicaciones (US-PUB-01 a US-PUB-05) - PAN-PUB-01.
 *
 * TODAS las rutas del modulo son exclusivas del cocinero: a diferencia de
 * `usuariosRouter` (que mezcla `/yo`, abierto a cualquier rol, con el panel,
 * restringido a administrador), aca no hay una superficie publica que
 * distinguir. Por eso `requiereRol('COCINERO')` se monta una unica vez para
 * todo el router en lugar de repetirse ruta por ruta.
 *
 * US-PUB-05 crea el router con el listado y el detalle; las historias
 * siguientes fueron agregando sus propias rutas aca (alta, edicion,
 * disponibilidad, y por ultimo la baja logica de US-PUB-03), sin tocar las
 * que ya estaban probadas.
 */
export const publicacionesRouter: Router = Router();

const idPublicacionSchema = z.uuid(
  'El identificador de publicación no es válido.',
);

publicacionesRouter.use(requiereAutenticacion, requiereRol('COCINERO'));

/** US-PUB-05 - Listado paginado y filtrado de "Mis publicaciones". */
publicacionesRouter.get('/', async (req, res) => {
  const pagina = await publicacionesService.listarPublicacionesPropias(
    sesionDe(req).id,
    filtrosPublicacionSchema.parse(req.query),
  );
  res.json(pagina);
});

/** US-PUB-05 - Detalle de una publicación propia. */
publicacionesRouter.get('/:id', async (req, res) => {
  const detalle = await publicacionesService.obtenerPublicacionPropia(
    sesionDe(req).id,
    idPublicacionSchema.parse(req.params.id),
  );
  res.json(detalle);
});

/** US-PUB-01 - Alta de una publicación. */
publicacionesRouter.post('/', async (req, res) => {
  const detalle = await publicacionesService.crearPublicacion({
    cocineroId: sesionDe(req).id,
    datos: crearPublicacionSchema.parse(req.body),
  });
  res.status(201).json(detalle);
});

/**
 * US-PUB-04 - Cambio de disponibilidad. Ruta propia, sin pasar por el PATCH
 * general que agrega US-PUB-02: el criterio de aceptación exige que se
 * aplique "sin necesidad de confirmación adicional", así que no comparte
 * validación con la edición completa del plato.
 */
publicacionesRouter.patch('/:id/disponibilidad', async (req, res) => {
  const resultado = await publicacionesService.cambiarDisponibilidad({
    cocineroId: sesionDe(req).id,
    publicacionId: idPublicacionSchema.parse(req.params.id),
    estadoPublicacion: cambiarDisponibilidadPublicacionSchema.parse(req.body)
      .estadoPublicacion,
  });
  res.json(resultado);
});

/** US-PUB-02 - Edición parcial de una publicación propia. */
publicacionesRouter.patch('/:id', async (req, res) => {
  const detalle = await publicacionesService.editarPublicacion({
    cocineroId: sesionDe(req).id,
    publicacionId: idPublicacionSchema.parse(req.params.id),
    datos: editarPublicacionSchema.parse(req.body),
  });
  res.json(detalle);
});

/** US-PUB-03 - Baja lógica de una publicación propia. */
publicacionesRouter.delete('/:id', async (req, res) => {
  await publicacionesService.eliminarPublicacion({
    cocineroId: sesionDe(req).id,
    publicacionId: idPublicacionSchema.parse(req.params.id),
  });
  res.json({ mensaje: MENSAJES_PUBLICACION.publicacionEliminada });
});
