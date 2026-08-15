import { Router } from 'express';
import { z } from 'zod';
import {
  cambiarPasswordSchema,
  crearUsuarioPanelSchema,
  editarPerfilSchema,
  editarUsuarioPanelSchema,
  eliminarCuentaPropiaSchema,
  eliminarUsuarioPanelSchema,
  filtrosUsuarioSchema,
  suspenderUsuarioSchema,
  MENSAJES_USUARIO,
} from '@foodhub/shared';
import { extraerToken, obtenerIp, sesionDe } from '../../lib/request.js';
import { requiereAutenticacion } from '../../middleware/auth.middleware.js';
import { soloAdministrador } from '../../middleware/rbac.middleware.js';
import * as usuariosService from './usuarios.service.js';

/**
 * Rutas del modulo de Gestion de Usuarios, Roles y Permisos.
 *
 * Estan agrupadas en dos bloques con reglas de acceso distintas:
 *
 *   /usuarios/yo   perfil propio (PAN-GURP-01). Operan SIEMPRE sobre el id de
 *                  la sesion y nunca reciben un id por parametro: no existe la
 *                  posibilidad de tocar el perfil ajeno cambiando un numero en
 *                  la URL.
 *   /usuarios/...  panel de administracion (PAN-ADM-01). Exigen rol
 *                  ADMINISTRADOR y dejan constancia del intento denegado
 *                  cuando el rol no alcanza.
 *
 * El orden de declaracion importa: `/yo` va antes que `/:id` o Express
 * interpretaria "yo" como un identificador.
 */
export const usuariosRouter: Router = Router();

const idUsuarioSchema = z.uuid('El identificador de usuario no es válido.');

usuariosRouter.use(requiereAutenticacion);

// --- Perfil propio (US-GURP-01 a US-GURP-04) -------------------------------

usuariosRouter.get('/yo', async (req, res) => {
  const perfil = await usuariosService.obtenerPerfil(sesionDe(req).id);
  res.json(perfil);
});

usuariosRouter.patch('/yo', async (req, res) => {
  const sesion = sesionDe(req);
  const perfil = await usuariosService.editarPerfil({
    usuarioId: sesion.id,
    tipo: sesion.tipo,
    datos: editarPerfilSchema.parse(req.body),
    ipOrigen: obtenerIp(req),
  });
  res.json(perfil);
});

usuariosRouter.post('/yo/password', async (req, res) => {
  const sesion = sesionDe(req);
  await usuariosService.cambiarPassword({
    usuarioId: sesion.id,
    email: sesion.email,
    datos: cambiarPasswordSchema.parse(req.body),
    ipOrigen: obtenerIp(req),
  });
  res.json({ mensaje: MENSAJES_USUARIO.contrasenaActualizada });
});

usuariosRouter.delete('/yo', async (req, res) => {
  eliminarCuentaPropiaSchema.parse(req.body);
  const sesion = sesionDe(req);
  await usuariosService.eliminarCuentaPropia({
    usuarioId: sesion.id,
    tipo: sesion.tipo,
    // Presente por definicion: `requiereAutenticacion` ya lo verifico.
    accessToken: extraerToken(req) ?? '',
    ipOrigen: obtenerIp(req),
  });
  res.json({ mensaje: MENSAJES_USUARIO.cuentaEliminada });
});

// --- Panel de administracion (US-GURP-05 a US-GURP-09) ---------------------

usuariosRouter.get('/', soloAdministrador, async (req, res) => {
  const pagina = await usuariosService.listarUsuarios(
    filtrosUsuarioSchema.parse(req.query),
  );
  res.json(pagina);
});

usuariosRouter.post('/', soloAdministrador, async (req, res) => {
  const perfil = await usuariosService.crearUsuarioPanel({
    datos: crearUsuarioPanelSchema.parse(req.body),
    administradorId: sesionDe(req).id,
    ipOrigen: obtenerIp(req),
  });
  res.status(201).json(perfil);
});

usuariosRouter.get('/:id', soloAdministrador, async (req, res) => {
  const perfil = await usuariosService.obtenerPerfil(
    idUsuarioSchema.parse(req.params.id),
  );
  res.json(perfil);
});

usuariosRouter.patch('/:id', soloAdministrador, async (req, res) => {
  const perfil = await usuariosService.editarUsuarioPanel({
    usuarioId: idUsuarioSchema.parse(req.params.id),
    datos: editarUsuarioPanelSchema.parse(req.body),
    administradorId: sesionDe(req).id,
    ipOrigen: obtenerIp(req),
  });
  res.json(perfil);
});

usuariosRouter.post('/:id/suspension', soloAdministrador, async (req, res) => {
  const { motivo } = suspenderUsuarioSchema.parse(req.body);
  await usuariosService.suspenderUsuario({
    usuarioId: idUsuarioSchema.parse(req.params.id),
    motivo,
    administradorId: sesionDe(req).id,
    ipOrigen: obtenerIp(req),
  });
  res.json({ mensaje: MENSAJES_USUARIO.usuarioSuspendido });
});

usuariosRouter.delete(
  '/:id/suspension',
  soloAdministrador,
  async (req, res) => {
    await usuariosService.rehabilitarUsuario({
      usuarioId: idUsuarioSchema.parse(req.params.id),
      administradorId: sesionDe(req).id,
      ipOrigen: obtenerIp(req),
    });
    res.json({ mensaje: MENSAJES_USUARIO.usuarioRehabilitado });
  },
);

usuariosRouter.delete('/:id', soloAdministrador, async (req, res) => {
  eliminarUsuarioPanelSchema.parse(req.body);
  await usuariosService.eliminarUsuarioPanel({
    usuarioId: idUsuarioSchema.parse(req.params.id),
    administradorId: sesionDe(req).id,
    ipOrigen: obtenerIp(req),
  });
  res.json({ mensaje: MENSAJES_USUARIO.usuarioEliminado });
});
