import { Router } from 'express';
import { z } from 'zod';
import {
  eliminarPublicacionAdminSchema,
  filtrosPublicacionAdminSchema,
} from '@foodhub/shared';
import { obtenerIp, sesionDe } from '../../lib/request.js';
import { requiereAutenticacion } from '../../middleware/auth.middleware.js';
import { soloAdministrador } from '../../middleware/rbac.middleware.js';
import * as moderacion from './moderacion.service.js';

/**
 * Moderación de publicaciones — US-ADM-04 (PAN-ADM-02).
 *
 * Router aparte de `/publicaciones` por el mismo motivo que la bandeja de
 * reseñas: aquél es del cocinero y opera solo sobre lo propio; éste es del
 * panel, opera sobre lo de todos y es exclusivo del ADMINISTRADOR. Con
 * `soloAdministrador` en la raíz no hay ruta que se olvide de exigirlo.
 */
export const moderacionPublicacionesRouter: Router = Router();

const idPublicacionSchema = z.uuid(
  'El identificador de la publicación no es válido.',
);

moderacionPublicacionesRouter.use(requiereAutenticacion, soloAdministrador);

/** RF050 - Listado de publicaciones activas con búsqueda y filtros. */
moderacionPublicacionesRouter.get('/', async (req, res) => {
  const pagina = await moderacion.listarPublicaciones(
    filtrosPublicacionAdminSchema.parse(req.query),
  );
  res.json(pagina);
});

/** US-ADM-04, tercer criterio - Detalle de una publicación. */
moderacionPublicacionesRouter.get('/:id', async (req, res) => {
  const detalle = await moderacion.obtenerPublicacion(
    idPublicacionSchema.parse(req.params.id),
  );
  res.json(detalle);
});

/**
 * RF051 - Baja por moderación. El motivo viaja en el cuerpo: un DELETE con
 * cuerpo es válido en HTTP y deja la operación con el verbo que corresponde.
 */
moderacionPublicacionesRouter.delete('/:id', async (req, res) => {
  const { motivo } = eliminarPublicacionAdminSchema.parse(req.body);

  await moderacion.eliminarPublicacion({
    publicacionId: idPublicacionSchema.parse(req.params.id),
    adminId: sesionDe(req).id,
    motivo,
    ipOrigen: obtenerIp(req),
  });

  res.status(204).send();
});
