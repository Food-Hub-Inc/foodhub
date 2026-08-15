import { Router, type Response } from 'express';
import {
  filtrosAuditoriaSchema,
  filtrosEventoSeguridadSchema,
} from '@foodhub/shared';
import { requiereAutenticacion } from '../../middleware/auth.middleware.js';
import { soloAdministrador } from '../../middleware/rbac.middleware.js';
import * as auditoriaService from './auditoria.service.js';

/**
 * Consulta del historial de auditoria (US-AUD-02) y de los eventos de
 * seguridad (US-AUD-01), las dos solapas de PAN-AUD-01.
 *
 * Todo el modulo exige rol ADMINISTRADOR. La restriccion se declara una sola
 * vez con `router.use`, y no ruta por ruta, para que agregar un endpoint nuevo
 * no pueda quedar accidentalmente publico.
 */
export const auditoriaRouter: Router = Router();

auditoriaRouter.use(requiereAutenticacion, soloAdministrador);

/**
 * Prepara la respuesta como descarga.
 *
 * `Content-Disposition: attachment` es lo que hace que el navegador guarde el
 * archivo en lugar de mostrarlo como texto. El nombre lleva la fecha para que
 * dos exportaciones sucesivas no se pisen en la carpeta de descargas.
 */
function responderCsv(res: Response, prefijo: string, contenido: string): void {
  const fecha = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${prefijo}-${fecha}.csv"`,
  );
  res.send(contenido);
}

auditoriaRouter.get('/', async (req, res) => {
  const pagina = await auditoriaService.listarRegistros(
    filtrosAuditoriaSchema.parse(req.query),
  );
  res.json(pagina);
});

auditoriaRouter.get('/exportar', async (req, res) => {
  const csv = await auditoriaService.exportarRegistrosCsv(
    filtrosAuditoriaSchema.parse(req.query),
  );
  responderCsv(res, 'auditoria', csv);
});

auditoriaRouter.get('/seguridad', async (req, res) => {
  const pagina = await auditoriaService.listarEventos(
    filtrosEventoSeguridadSchema.parse(req.query),
  );
  res.json(pagina);
});

auditoriaRouter.get('/seguridad/exportar', async (req, res) => {
  const csv = await auditoriaService.exportarEventosCsv(
    filtrosEventoSeguridadSchema.parse(req.query),
  );
  responderCsv(res, 'eventos-seguridad', csv);
});
