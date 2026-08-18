import { Router } from 'express';
import { z } from 'zod';
import {
  coordenadasOpcionalesSchema,
  filtrosFeedSchema,
  zonaVisibleSchema,
} from '@foodhub/shared';
import { sesionDe } from '../../lib/request.js';
import { requiereAutenticacion } from '../../middleware/auth.middleware.js';
import { requiereRol } from '../../middleware/rbac.middleware.js';
import type { Coordenadas } from './consultas.js';
import * as exploracionService from './exploracion.service.js';
import * as favoritosService from './favoritos.service.js';

/**
 * Rutas del modulo de Exploracion y busqueda (US-EXP-01 a US-EXP-06).
 *
 * TODAS son exclusivas del CLIENTE, asi que `requiereRol('CLIENTE')` se monta
 * una sola vez para el router entero en lugar de repetirse ruta por ruta - mismo
 * criterio que `publicacionesRouter`, que hace lo propio con 'COCINERO'.
 *
 * Que el cocinero no entre no es una restriccion arbitraria: el feed, el mapa y
 * los favoritos se resuelven CONTRA EL ID DE LA SESION (que cocineros marco como
 * favoritos, que carrito tiene). Un cocinero no tiene nada que ver ahi, y
 * abrirle la ruta obligaria a inventar que significa "sus favoritos".
 *
 * El id del cliente nunca viaja por parametro ni por body: sale de `sesionDe`.
 */
export const exploracionRouter: Router = Router();

const idCocineroSchema = z.uuid('El identificador de cocinero no es válido.');
const idPublicacionSchema = z.uuid(
  'El identificador de publicación no es válido.',
);

exploracionRouter.use(requiereAutenticacion, requiereRol('CLIENTE'));

/** Coordenadas de la query, o `null` si el cliente no comparte su ubicacion. */
function coordenadasDeLaQuery(query: unknown): Coordenadas | null {
  const { lat, lng } = coordenadasOpcionalesSchema.parse(query);
  return lat !== undefined && lng !== undefined ? { lat, lng } : null;
}

/** US-EXP-01 y US-EXP-03 - Feed de platos, con busqueda y filtros. */
exploracionRouter.get('/feed', async (req, res) => {
  const pagina = await exploracionService.listarFeed(
    sesionDe(req).id,
    filtrosFeedSchema.parse(req.query),
  );
  res.json(pagina);
});

/**
 * US-EXP-02 - Cocineros con marcador en la zona visible del mapa.
 *
 * Va ANTES de `/cocineros/:id`: Express resuelve por orden de declaracion, y con
 * el orden invertido la palabra "mapa" entraria como valor de `:id` y fallaria
 * la validacion de uuid.
 */
exploracionRouter.get('/cocineros/mapa', async (req, res) => {
  const cocineros = await exploracionService.listarCocinerosDelMapa(
    zonaVisibleSchema.parse(req.query),
  );
  res.json(cocineros);
});

/** US-EXP-04 - Perfil publico de un cocinero. */
exploracionRouter.get('/cocineros/:id', async (req, res) => {
  const perfil = await exploracionService.obtenerCocineroPublico({
    clienteId: sesionDe(req).id,
    cocineroId: idCocineroSchema.parse(req.params.id),
    coordenadas: coordenadasDeLaQuery(req.query),
  });
  res.json(perfil);
});

/** US-EXP-05 - Detalle publico de un plato. */
exploracionRouter.get('/publicaciones/:id', async (req, res) => {
  const detalle = await exploracionService.obtenerPublicacionPublica({
    clienteId: sesionDe(req).id,
    publicacionId: idPublicacionSchema.parse(req.params.id),
  });
  res.json(detalle);
});

/** US-EXP-06 - Las dos pestanas de "Mis favoritos". */
exploracionRouter.get('/favoritos', async (req, res) => {
  const favoritos = await favoritosService.obtenerFavoritos(sesionDe(req).id);
  res.json(favoritos);
});

/**
 * US-EXP-06 - Alta y baja de favoritos.
 *
 * PUT y DELETE, no POST: la operacion es idempotente en las dos direcciones
 * -tocar dos veces el corazon deja el mismo estado que tocarlo una-, y el
 * indice unico de la base lo garantiza. Con POST, un segundo toque por doble
 * pulsacion tendria que devolver un error que al usuario no le dice nada.
 */
exploracionRouter.put('/favoritos/cocineros/:id', async (req, res) => {
  const resultado = await favoritosService.marcarCocineroFavorito({
    clienteId: sesionDe(req).id,
    cocineroId: idCocineroSchema.parse(req.params.id),
  });
  res.json(resultado);
});

exploracionRouter.delete('/favoritos/cocineros/:id', async (req, res) => {
  const resultado = await favoritosService.desmarcarCocineroFavorito({
    clienteId: sesionDe(req).id,
    cocineroId: idCocineroSchema.parse(req.params.id),
  });
  res.json(resultado);
});

exploracionRouter.put('/favoritos/publicaciones/:id', async (req, res) => {
  const resultado = await favoritosService.marcarPublicacionFavorita({
    clienteId: sesionDe(req).id,
    publicacionId: idPublicacionSchema.parse(req.params.id),
  });
  res.json(resultado);
});

exploracionRouter.delete('/favoritos/publicaciones/:id', async (req, res) => {
  const resultado = await favoritosService.desmarcarPublicacionFavorita({
    clienteId: sesionDe(req).id,
    publicacionId: idPublicacionSchema.parse(req.params.id),
  });
  res.json(resultado);
});
