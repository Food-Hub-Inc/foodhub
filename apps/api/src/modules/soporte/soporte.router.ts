import { Router } from 'express';
import { enviarConsultaSchema, votoFaqInputSchema } from '@foodhub/shared';
import { z } from 'zod';
import { requiereAutenticacion } from '../../middleware/auth.middleware.js';
import { requiereRol } from '../../middleware/rbac.middleware.js';
import { obtenerIp, sesionDe } from '../../lib/request.js';
import * as soporteService from './soporte.service.js';

/**
 * Endpoints del modulo de Ayuda y soporte.
 *
 * El router aplica `requiereRol('CLIENTE', 'COCINERO')` al montaje: tanto
 * las FAQ (US-AYU-02) como el envio de consultas (US-AYU-03) son
 * funcionalidades de los dos roles de la app movil. El administrador no
 * tiene pantalla de ayuda en su panel, asi que excluirlo es una
 * decision de alcance, no un descuido.
 */
export const soporteRouter: Router = Router();

soporteRouter.use(requiereAutenticacion, requiereRol('CLIENTE', 'COCINERO'));

// ---------------------------------------------------------------------------
// US-AYU-02 · FAQ
// ---------------------------------------------------------------------------

soporteRouter.get('/faqs', async (req, res) => {
  const rol = sesionDe(req).tipo;
  soporteService.validarRolFaq(rol);
  const faqs = await soporteService.listarFaqPorRol(rol);
  res.json(faqs);
});

soporteRouter.post('/faqs/:id/voto', async (req, res) => {
  const rol = sesionDe(req).tipo;
  soporteService.validarRolFaq(rol);
  const id = z.uuid().parse(req.params.id);
  const datos = votoFaqInputSchema.parse(req.body);
  await soporteService.registrarVotoFaq(id, datos.util, rol);
  res.status(204).send();
});

// ---------------------------------------------------------------------------
// US-AYU-01 · Manual de usuario
// ---------------------------------------------------------------------------

/**
 * US-AYU-01 - Manual correspondiente al rol autenticado. El contenido lo
 * administra US-AYU-05 desde el panel; la app solo lo lee, de modo que una
 * edicion publicada se ve sin un despliegue nuevo.
 */
soporteRouter.get('/manual', async (req, res) => {
  const rol = sesionDe(req).tipo;
  soporteService.validarRolFaq(rol);
  const manual = await soporteService.listarManualPorRol(rol);
  res.json(manual);
});

// ---------------------------------------------------------------------------
// US-AYU-03 · Envio de consulta al soporte
// ---------------------------------------------------------------------------

/**
 * US-AYU-03 - Crea un ticket de soporte a partir de los datos del formulario
 * "Contactar al soporte" (PAN-AYU-03).
 *
 * La validacion del body la hace `enviarConsultaSchema.parse`, asi que
 * cualquier campo fuera de formato o de longitud llega como 400 con
 * `campos[].mensaje` apuntando al campo que fallo. Es la misma validacion
 * que corre en la app antes de abrir el dialogo de confirmacion, asi que
 * un error aca es o un bug del cliente o un intento de evadir la UI.
 *
 * Responde 201 con `{ id, mensaje }`. El id es el del ticket nuevo; el
 * mensaje es la confirmacion que la app muestra en su dialogo de exito
 * (en realidad la app construye el dialogo a partir del criterio, pero
 * dejamos el `mensaje` para depuracion y consistencia con el resto de
 * la API).
 */
soporteRouter.post('/tickets', async (req, res) => {
  const sesion = sesionDe(req);
  const datos = enviarConsultaSchema.parse(req.body);
  const resultado = await soporteService.crearTicketSoporte({
    usuarioId: sesion.id,
    datos,
    ipOrigen: obtenerIp(req),
  });
  res.status(201).json(resultado);
});
