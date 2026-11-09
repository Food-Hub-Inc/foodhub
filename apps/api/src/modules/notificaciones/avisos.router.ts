import { Router } from 'express';
import { avisoGeneralSchema } from '@foodhub/shared';
import { obtenerIp, sesionDe } from '../../lib/request.js';
import { requiereAutenticacion } from '../../middleware/auth.middleware.js';
import { soloAdministrador } from '../../middleware/rbac.middleware.js';
import { emitirAvisoGeneral } from './avisos.service.js';

/**
 * Avisos generales — US-NOT-04 / RF037 (sección "Avisos" del panel).
 *
 * Router aparte de `/notificaciones` porque aquél es del cliente y el
 * cocinero, que reciben; éste es del administrador, que emite. Con
 * `soloAdministrador` en la raíz no hay ruta que se olvide de exigirlo.
 */
export const avisosRouter: Router = Router();

avisosRouter.use(requiereAutenticacion, soloAdministrador);

/** Emite un aviso y devuelve a cuántas cuentas llegó. */
avisosRouter.post('/', async (req, res) => {
  const resultado = await emitirAvisoGeneral({
    aviso: avisoGeneralSchema.parse(req.body),
    adminId: sesionDe(req).id,
    ipOrigen: obtenerIp(req),
  });
  res.status(201).json(resultado);
});
