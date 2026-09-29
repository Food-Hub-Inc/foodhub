import { Router } from 'express';
import { consultaMetricasSchema } from '@foodhub/shared';
import { requiereAutenticacion } from '../../middleware/auth.middleware.js';
import { soloAdministrador } from '../../middleware/rbac.middleware.js';
import * as metricasService from './metricas.service.js';

/**
 * Métricas generales del panel — US-ADM-05 (PAN-ADM-03).
 *
 * Exclusivo del ADMINISTRADOR (último criterio: "Rechace el acceso y no
 * exponga métricas generales del sistema"). `soloAdministrador` además deja
 * constancia del intento denegado en `evento_seguridad` (US-AUD-01).
 */
export const metricasRouter: Router = Router();

metricasRouter.use(requiereAutenticacion, soloAdministrador);

/** Todo PAN-ADM-03 para el período que manda el panel, en una respuesta. */
metricasRouter.get('/', async (req, res) => {
  const metricas = await metricasService.obtenerMetricas(
    consultaMetricasSchema.parse(req.query),
  );
  res.json(metricas);
});
