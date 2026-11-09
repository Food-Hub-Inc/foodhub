import { Router } from 'express';
import { z } from 'zod';
import { rangoDashboardSchema } from '@foodhub/shared';
import { sesionDe } from '../../lib/request.js';
import { requiereAutenticacion } from '../../middleware/auth.middleware.js';
import { requiereRol } from '../../middleware/rbac.middleware.js';
import * as dashboardService from './dashboard.service.js';

/**
 * Rutas del modulo de Dashboard del cocinero (US-DASH-01 a US-DASH-05) -
 * PAN-DASH-01.
 *
 * TODO EL MODULO ES DEL COCINERO Y SOLO DE SUS PROPIOS DATOS, asi que
 * `requiereRol('COCINERO')` se monta una unica vez para el router entero, igual
 * que en `publicacionesRouter`. No hay superficie publica que distinguir.
 *
 * NINGUNA RUTA RECIBE UN ID DE COCINERO. El unico cocinero consultable es el de
 * la sesion: aceptarlo por parametro convertiria el dashboard en una forma de
 * leer la facturacion y la clientela de la competencia.
 */
export const dashboardRouter: Router = Router();

dashboardRouter.use(requiereAutenticacion, requiereRol('COCINERO'));

/**
 * US-DASH-01 a US-DASH-05 - Las cuatro secciones de "Mi actividad", en una sola
 * respuesta y para el periodo que manda el cliente.
 */
dashboardRouter.get('/actividad', async (req, res) => {
  const rango = rangoDashboardSchema.parse(req.query);
  const actividad = await dashboardService.obtenerActividad(
    sesionDe(req).id,
    rango,
  );
  res.json(actividad);
});

const idPublicacionSchema = z.uuid('El identificador del plato no es válido.');

/**
 * Evolución de un plato en el período (corrección del 20/10/2026). Se entra
 * tocando un plato del ranking de US-DASH-02, con el mismo período.
 *
 * Este id SÍ viene por parámetro, pero es de un plato y no de un cocinero: el
 * servicio solo lo encuentra si es de la sesión.
 */
dashboardRouter.get('/platos/:publicacionId/evolucion', async (req, res) => {
  const rango = rangoDashboardSchema.parse(req.query);
  const evolucion = await dashboardService.obtenerEvolucionDePlato(
    sesionDe(req).id,
    idPublicacionSchema.parse(req.params.publicacionId),
    rango,
  );
  res.json(evolucion);
});
