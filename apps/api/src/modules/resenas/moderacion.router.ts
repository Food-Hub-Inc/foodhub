import { Router } from 'express';
import { z } from 'zod';
import { resolverReporteSchema } from '@foodhub/shared';
import { sesionDe } from '../../lib/request.js';
import { requiereAutenticacion } from '../../middleware/auth.middleware.js';
import { soloAdministrador } from '../../middleware/rbac.middleware.js';
import * as moderacion from './moderacion.service.js';

/**
 * Bandeja de moderación de reseñas — RF086, PAN-ADM-02.
 *
 * ROUTER APARTE Y NO RUTAS DENTRO DE `/resenas`, por dos motivos:
 *
 *   El público es otro. `/resenas` lo consume la app y todas sus rutas exigen
 *   sesión de CLIENTE o COCINERO; esto lo consume el panel web y es exclusivo
 *   del ADMINISTRADOR. Montarlo aparte deja `soloAdministrador` en la raíz del
 *   router en lugar de repetirlo ruta por ruta, que es donde se olvida.
 *
 *   El recurso es otro. Lo que se lista no son reseñas sino REPORTES agrupados
 *   por reseña, con su cantidad y sus motivos. Colgarlo de `/resenas` sugeriría
 *   que devuelve lo mismo que el listado público, y no se parece en nada.
 */
export const moderacionRouter: Router = Router();

const idResenaSchema = z.uuid('El identificador de la reseña no es válido.');

const paginacionSchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce
    .number()
    .int()
    .min(1)
    .max(50)
    .default(moderacion.REPORTES_POR_PAGINA),
});

moderacionRouter.use(requiereAutenticacion, soloAdministrador);

/** RF086 - Reportes pendientes, la más denunciada primero. */
moderacionRouter.get('/reportes', async (req, res) => {
  const pagina = await moderacion.listarReportesPendientes(
    paginacionSchema.parse(req.query),
  );
  res.json(pagina);
});

/**
 * RF086 - Aprueba o rechaza TODOS los reportes pendientes de una reseña.
 *
 * La ruta se dirige por RESEÑA y no por reporte porque la decisión es sobre la
 * reseña: aprobar una denuncia y rechazar otra sobre la misma reseña no
 * significaría nada.
 */
moderacionRouter.post('/reportes/:resenaId/resolucion', async (req, res) => {
  const { aprobar } = resolverReporteSchema.parse(req.body);

  await moderacion.resolverReportesDeResena({
    resenaId: idResenaSchema.parse(req.params.resenaId),
    adminId: sesionDe(req).id,
    aprobar,
  });

  res.status(204).send();
});
