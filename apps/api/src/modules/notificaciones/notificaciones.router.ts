import { Router } from 'express';
import { z } from 'zod';
import {
  bajaDispositivoSchema,
  filtrosHistorialNotificacionesSchema,
  marcarLeidasSchema,
  marcarPresenciaSchema,
  registrarDispositivoSchema,
} from '@foodhub/shared';
import { sesionDe } from '../../lib/request.js';
import { requiereAutenticacion } from '../../middleware/auth.middleware.js';
import { requiereRol } from '../../middleware/rbac.middleware.js';
import {
  darDeBajaDispositivo,
  registrarDispositivo,
} from './dispositivos.service.js';
import {
  contarNoLeidas,
  listarHistorial,
  marcarLeidas,
  obtenerNotificacion,
} from './notificaciones.service.js';
import { registrarPresencia } from './presencia.service.js';

const idNotificacionSchema = z.uuid(
  'El identificador de la notificación no es válido.',
);

/**
 * Rutas del modulo de Notificaciones y Alertas (US-NOT-07, US-NOT-08 y el
 * registro de dispositivos del punto 1.3.1.11).
 *
 * TODO EL MODULO ES DE CLIENTE Y COCINERO. El administrador opera desde el
 * panel web, no recibe push ni tiene PAN-NOT-01. Mismo criterio y mismo filtro
 * unico sobre el router que en Mensajeria y en las preferencias de US-CFG-05.
 *
 * NINGUNA RUTA RECIBE EL ID DE QUIEN CONSULTA: sale del JWT, y toda lectura y
 * escritura se acota a `usuario_destino_id = <sesion>`.
 *
 * La EMISION de notificaciones no tiene ruta aca: la disparan otros modulos
 * (pedidos, mensajeria, publicaciones, moderacion) al ocurrir el evento, y los
 * avisos generales del administrador (US-NOT-04) van por `avisos.router.ts`.
 */
export const notificacionesRouter: Router = Router();

notificacionesRouter.use(
  requiereAutenticacion,
  requiereRol('CLIENTE', 'COCINERO'),
);

// --- Historial (US-NOT-07, PAN-NOT-01) -----------------------------------

notificacionesRouter.get('/', async (req, res) => {
  const filtros = filtrosHistorialNotificacionesSchema.parse(req.query);
  const pagina = await listarHistorial(sesionDe(req).id, filtros);
  res.json(pagina);
});

/** Globo de la campana del encabezado del feed (PAN-EXP-01). */
notificacionesRouter.get('/no-leidas', async (req, res) => {
  const noLeidas = await contarNoLeidas(sesionDe(req).id);
  res.json({ noLeidas });
});

/**
 * PAN-NOT-03 - Detalle de una notificacion propia (el aviso del
 * administrador). Va DESPUES de `/no-leidas`: Express resuelve en orden y
 * `/:id` se tragaria esa ruta.
 */
notificacionesRouter.get('/:id', async (req, res) => {
  const detalle = await obtenerNotificacion(
    sesionDe(req).id,
    idNotificacionSchema.parse(req.params.id),
  );
  res.json(detalle);
});

/**
 * Marca como leidas. Sin `ids` = todas (al abrir PAN-NOT-01); con `ids` = solo
 * esas (al tocar una). POST y no PATCH: no lleva un recurso en la URL y el
 * efecto lo decide el servidor.
 */
notificacionesRouter.post('/marcar-leidas', async (req, res) => {
  const { ids } = marcarLeidasSchema.parse(req.body);
  await marcarLeidas(sesionDe(req).id, ids);
  res.status(204).end();
});

// --- Dispositivos push (punto 1.3.1.11) --------------------------------

/** Alta o renovacion del Expo Push Token. La app la llama al iniciar sesion. */
notificacionesRouter.post('/dispositivos', async (req, res) => {
  const datos = registrarDispositivoSchema.parse(req.body);
  await registrarDispositivo({ usuarioId: sesionDe(req).id, datos });
  res.status(204).end();
});

/** Baja del token. La app la llama al cerrar sesion. */
notificacionesRouter.delete('/dispositivos', async (req, res) => {
  const { expoPushToken } = bajaDispositivoSchema.parse(req.body);
  await darDeBajaDispositivo({ usuarioId: sesionDe(req).id, expoPushToken });
  res.status(204).end();
});

// --- Presencia en el chat (US-NOT-02) --------------------------------

/**
 * El cliente declara que conversacion esta mirando (o `null` al salir). La API
 * lo usa para NO mandar push de un mensaje si el destinatario ya lo esta
 * viendo. Ver `presencia.service.ts` para la limitacion conocida.
 */
notificacionesRouter.put('/presencia', (req, res) => {
  // Sincrono: la presencia vive en memoria. Express 5 reenvia igual un throw
  // sincrono (el de `parse`) al manejador de errores.
  const datos = marcarPresenciaSchema.parse(req.body);
  registrarPresencia(sesionDe(req).id, datos);
  res.status(204).end();
});
