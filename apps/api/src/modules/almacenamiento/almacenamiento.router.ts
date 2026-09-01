import { Router } from 'express';
import { z } from 'zod';
import {
  solicitarUrlCargaAdjuntoTicketSchema,
  solicitarUrlDeCargaCategoriaSchema,
  solicitarUrlDeCargaImagenChatSchema,
  solicitarUrlDeCargaPlatoSchema,
  solicitarUrlDeCargaSchema,
} from '@foodhub/shared';
import { sesionDe } from '../../lib/request.js';
import { requiereAutenticacion } from '../../middleware/auth.middleware.js';
import {
  requiereRol,
  soloAdministrador,
} from '../../middleware/rbac.middleware.js';
import { obtenerConversacion } from '../mensajeria/mensajeria.service.js';
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

const idCategoriaSchema = z.uuid('El identificador de categoría no es válido.');
const idConversacionSchema = z.uuid(
  'El identificador de la conversación no es válido.',
);

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

/**
 * US-CFG-01 - Imagen representativa de una categoria. Exclusivo del panel de
 * administracion: a diferencia de la foto de perfil, no depende de la sesion
 * del que sube el archivo sino de la categoria afectada.
 */
almacenamientoRouter.post(
  '/imagen-categoria',
  soloAdministrador,
  async (req, res) => {
    const urlDeCarga =
      await almacenamientoService.crearUrlDeCargaDeImagenCategoria({
        categoriaId: null,
        datos: solicitarUrlDeCargaCategoriaSchema.parse(req.body),
      });
    res.status(201).json(urlDeCarga);
  },
);

/** US-CFG-01 - Igual que arriba, pero reemplazando la imagen de una categoria existente. */
almacenamientoRouter.post(
  '/imagen-categoria/:categoriaId',
  soloAdministrador,
  async (req, res) => {
    const urlDeCarga =
      await almacenamientoService.crearUrlDeCargaDeImagenCategoria({
        categoriaId: idCategoriaSchema.parse(req.params.categoriaId),
        datos: solicitarUrlDeCargaCategoriaSchema.parse(req.body),
      });
    res.status(201).json(urlDeCarga);
  },
);

/** US-CFG-03 - Logo de la plataforma (Información institucional). */
almacenamientoRouter.post(
  '/logo-plataforma',
  soloAdministrador,
  async (req, res) => {
    const urlDeCarga =
      await almacenamientoService.crearUrlDeCargaDeLogoPlataforma(
        solicitarUrlDeCargaCategoriaSchema.parse(req.body),
      );
    res.status(201).json(urlDeCarga);
  },
);

/**
 * US-MSG-03 - Imagen de una conversacion del chat.
 *
 * Es la unica ruta de este router que valida algo ademas de la sesion: antes de
 * firmar, `obtenerConversacion` comprueba que quien pide participe de esa
 * conversacion y responde 404 si no. Las otras cuatro arman la ruta del archivo
 * a partir de la sesion o del rol, asi que no hay nada ajeno que proteger; aca
 * la carpeta la nombra un id que viene del cliente.
 *
 * No exige un rol puntual: los dos lados del chat mandan imagenes (US-MSG-03
 * tiene como actor a "Cliente / Cocinero"), y el filtro de rol ya lo aplica el
 * router de mensajeria sobre la lectura de la conversacion.
 */
almacenamientoRouter.post('/imagen-chat/:conversacionId', async (req, res) => {
  const conversacionId = idConversacionSchema.parse(req.params.conversacionId);
  await obtenerConversacion(sesionDe(req).id, conversacionId);

  const urlDeCarga = await almacenamientoService.crearUrlDeCargaDeImagenChat({
    conversacionId,
    datos: solicitarUrlDeCargaImagenChatSchema.parse(req.body),
  });
  res.status(201).json(urlDeCarga);
});

/**
 * US-AYU-03 - Adjunto JPG/PNG/PDF de hasta 5 MB para una consulta al soporte.
 *
 * Cualquier cliente o cocinero autenticado puede pedir una URL de carga: el
 * ticket lo va a crear el mismo usuario mas tarde en `POST /soporte/tickets`,
 * y el id de la fila en `adjunto_ticket` lo resuelve la API mirando el
 * `url` que devuelve el cliente.
 *
 * Mismo criterio que `/foto-perfil`: la ruta del archivo la arma el servicio
 * con `req.usuario.id`, asi que un cliente no puede pisar el adjunto de otro
 * ni manipular la URL. La validacion de tamano y formato la hace `zod`
 * (ver `solicitarUrlCargaAdjuntoTicketSchema`), y un rechazo del schema se
 * traduce en un 400 con el mensaje literal del criterio.
 */
almacenamientoRouter.post(
  '/adjunto-ticket',
  requiereRol('CLIENTE', 'COCINERO'),
  async (req, res) => {
    const urlDeCarga =
      await almacenamientoService.crearUrlDeCargaDeAdjuntoTicket({
        usuarioId: sesionDe(req).id,
        datos: solicitarUrlCargaAdjuntoTicketSchema.parse(req.body),
      });
    res.status(201).json(urlDeCarga);
  },
);
