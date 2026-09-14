import { Router } from 'express';
import { z } from 'zod';
import {
  crearCapituloAyudaSchema,
  crearFaqAdminSchema,
  editarCapituloAyudaSchema,
  editarFaqAdminSchema,
  filtrosCapitulosAyudaSchema,
  filtrosFaqsAdminSchema,
  MENSAJES_AYUDA,
} from '@foodhub/shared';
import { obtenerIp, sesionDe } from '../../lib/request.js';
import { requiereAutenticacion } from '../../middleware/auth.middleware.js';
import { soloAdministrador } from '../../middleware/rbac.middleware.js';
import * as ayudaService from './ayuda.service.js';

/**
 * Rutas de gestion del contenido de ayuda (US-AYU-05).
 *
 * Va en un modulo aparte de `/soporte` porque aquel excluye explicitamente al
 * administrador: `/soporte` es la ayuda que consume la app movil, y este es el
 * ABM del panel web. Mismo criterio que la separacion entre `/resenas` y
 * `/moderacion`.
 */
export const ayudaRouter: Router = Router();

const idSchema = z.uuid('El identificador no es válido.');

ayudaRouter.use(requiereAutenticacion, soloAdministrador);

// ---------------------------------------------------------------------------
// Manual de usuario
// ---------------------------------------------------------------------------

ayudaRouter.get('/capitulos', async (req, res) => {
  const pagina = await ayudaService.listarCapitulos(
    filtrosCapitulosAyudaSchema.parse(req.query),
  );
  res.json(pagina);
});

/** US-AYU-05 - Capitulo puntual para la pagina de edicion del panel. */
ayudaRouter.get('/capitulos/:id', async (req, res) => {
  const capitulo = await ayudaService.obtenerCapitulo(
    idSchema.parse(req.params.id),
  );
  res.json(capitulo);
});

ayudaRouter.post('/capitulos', async (req, res) => {
  const capitulo = await ayudaService.crearCapitulo({
    datos: crearCapituloAyudaSchema.parse(req.body),
    administradorId: sesionDe(req).id,
    ipOrigen: obtenerIp(req),
  });
  res.status(201).json(capitulo);
});

ayudaRouter.patch('/capitulos/:id', async (req, res) => {
  await ayudaService.editarCapitulo({
    capituloId: idSchema.parse(req.params.id),
    datos: editarCapituloAyudaSchema.parse(req.body),
    administradorId: sesionDe(req).id,
    ipOrigen: obtenerIp(req),
  });
  res.json({ mensaje: MENSAJES_AYUDA.admin.capituloActualizado });
});

ayudaRouter.post('/capitulos/:id/habilitacion', async (req, res) => {
  await ayudaService.establecerHabilitacionCapitulo({
    capituloId: idSchema.parse(req.params.id),
    activo: true,
    administradorId: sesionDe(req).id,
    ipOrigen: obtenerIp(req),
  });
  res.json({ mensaje: MENSAJES_AYUDA.admin.capituloHabilitado });
});

ayudaRouter.delete('/capitulos/:id/habilitacion', async (req, res) => {
  await ayudaService.establecerHabilitacionCapitulo({
    capituloId: idSchema.parse(req.params.id),
    activo: false,
    administradorId: sesionDe(req).id,
    ipOrigen: obtenerIp(req),
  });
  res.json({ mensaje: MENSAJES_AYUDA.admin.capituloDeshabilitado });
});

// ---------------------------------------------------------------------------
// Preguntas frecuentes
// ---------------------------------------------------------------------------

ayudaRouter.get('/faqs', async (req, res) => {
  const pagina = await ayudaService.listarFaqs(
    filtrosFaqsAdminSchema.parse(req.query),
  );
  res.json(pagina);
});

ayudaRouter.post('/faqs', async (req, res) => {
  const faq = await ayudaService.crearFaq({
    datos: crearFaqAdminSchema.parse(req.body),
    administradorId: sesionDe(req).id,
    ipOrigen: obtenerIp(req),
  });
  res.status(201).json(faq);
});

ayudaRouter.patch('/faqs/:id', async (req, res) => {
  await ayudaService.editarFaq({
    faqId: idSchema.parse(req.params.id),
    datos: editarFaqAdminSchema.parse(req.body),
    administradorId: sesionDe(req).id,
    ipOrigen: obtenerIp(req),
  });
  res.json({ mensaje: MENSAJES_AYUDA.admin.faqActualizada });
});

ayudaRouter.post('/faqs/:id/habilitacion', async (req, res) => {
  await ayudaService.establecerHabilitacionFaq({
    faqId: idSchema.parse(req.params.id),
    activo: true,
    administradorId: sesionDe(req).id,
    ipOrigen: obtenerIp(req),
  });
  res.json({ mensaje: MENSAJES_AYUDA.admin.faqHabilitada });
});

ayudaRouter.delete('/faqs/:id/habilitacion', async (req, res) => {
  await ayudaService.establecerHabilitacionFaq({
    faqId: idSchema.parse(req.params.id),
    activo: false,
    administradorId: sesionDe(req).id,
    ipOrigen: obtenerIp(req),
  });
  res.json({ mensaje: MENSAJES_AYUDA.admin.faqDeshabilitada });
});
