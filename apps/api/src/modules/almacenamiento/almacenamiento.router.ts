import { Router } from 'express';
import {
  solicitarUrlDeCargaPlatoSchema,
  solicitarUrlDeCargaSchema,
} from '@foodhub/shared';
import { sesionDe } from '../../lib/request.js';
import { requiereAutenticacion } from '../../middleware/auth.middleware.js';
import { requiereRol } from '../../middleware/rbac.middleware.js';
import * as almacenamientoService from './almacenamiento.service.js';

/**
 * Emision de URLs de carga para Supabase Storage.
 *
 * EXIGE SESION, incluso en el registro. Cuando el usuario toca "Registrarme"
 * todavia no hay cuenta ni token, asi que la app crea primero la cuenta, inicia
 * sesion y recien entonces pide esta URL: la foto de perfil se sube contra el
 * id que la API saca del JWT. Un endpoint publico de subida dejaria que
 * cualquiera sin cuenta escribiera en el bucket.
 *
 * La ruta del archivo NUNCA viene del cliente. La arma el servicio con
 * `req.usuario.id`, de modo que no existe forma de escribir en la carpeta de
 * otro usuario manipulando la request.
 */
export const almacenamientoRouter: Router = Router();

almacenamientoRouter.use(requiereAutenticacion);

/** US-AUT-01, US-AUT-02 y US-GURP-02 - Foto de perfil del usuario autenticado. */
almacenamientoRouter.post('/foto-perfil', async (req, res) => {
  const urlDeCarga = await almacenamientoService.crearUrlDeCargaDeFotoPerfil({
    usuarioId: sesionDe(req).id,
    datos: solicitarUrlDeCargaSchema.parse(req.body),
  });
  res.status(201).json(urlDeCarga);
});

/**
 * US-PUB-01 - Foto de un plato del cocinero autenticado.
 *
 * A diferencia de `/foto-perfil` (cualquier tipo de usuario), exige rol
 * COCINERO: solo un cocinero publica platos, y el resto de los roles no tiene
 * ninguna carpeta propia en el bucket de publicaciones que llenar.
 */
almacenamientoRouter.post(
  '/foto-plato',
  requiereRol('COCINERO'),
  async (req, res) => {
    const urlDeCarga = await almacenamientoService.crearUrlDeCargaDeFotoPlato({
      cocineroId: sesionDe(req).id,
      datos: solicitarUrlDeCargaPlatoSchema.parse(req.body),
    });
    res.status(201).json(urlDeCarga);
  },
);
