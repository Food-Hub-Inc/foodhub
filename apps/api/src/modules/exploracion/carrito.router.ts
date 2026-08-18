import { Router } from 'express';
import { z } from 'zod';
import {
  agregarAlCarritoSchema,
  cambiarCantidadItemSchema,
} from '@foodhub/shared';
import { sesionDe } from '../../lib/request.js';
import { requiereAutenticacion } from '../../middleware/auth.middleware.js';
import { requiereRol } from '../../middleware/rbac.middleware.js';
import * as carritoService from './carrito.service.js';

/**
 * Rutas del carrito (US-EXP-07).
 *
 * Router propio, montado en `/carrito` y no dentro de `/exploracion`: el carrito
 * es un recurso del cliente, no un resultado de explorar, y su pantalla es
 * PAN-PED-01 -del modulo de Pedidos-. Cuando US-PED-01 exista, va a leer de
 * estas mismas rutas.
 *
 * NINGUNA ruta recibe el id del carrito. Hay un solo carrito activo por cliente
 * (`carrito_cliente_uq`) y el cliente sale de la sesion, asi que el carrito
 * queda determinado. El unico id que viaja por la URL es el del ITEM, y
 * `exigirItemPropio` verifica que pertenezca al carrito de quien lo pide.
 */
export const carritoRouter: Router = Router();

const idItemSchema = z.uuid('El identificador del plato no es válido.');

carritoRouter.use(requiereAutenticacion, requiereRol('CLIENTE'));

/**
 * US-EXP-07 - Carrito vigente.
 *
 * Cada lectura depura los platos que dejaron de estar disponibles y devuelve
 * cuales quitó, para que la pantalla pueda mostrar la advertencia al entrar
 * (penultimo criterio de la historia).
 */
carritoRouter.get('/', async (req, res) => {
  const respuesta = await carritoService.obtenerCarrito(sesionDe(req).id);
  res.json(respuesta);
});

/**
 * US-EXP-05 - Agrega un plato, o le suma 1 si ya estaba.
 *
 * Responde 409 `CARRITO_DE_OTRO_COCINERO` cuando el carrito vigente es de otro
 * cocinero y el body no trae `reemplazarCarrito`. Ese 409 no es un fallo: es la
 * pregunta "¿Querés vaciarlo y comenzar uno nuevo?" que el criterio exige, y la
 * app la responde repitiendo el POST con la bandera si el cliente confirma.
 */
carritoRouter.post('/items', async (req, res) => {
  const datos = agregarAlCarritoSchema.parse(req.body);
  const respuesta = await carritoService.agregarAlCarrito({
    clienteId: sesionDe(req).id,
    publicacionId: datos.publicacionId,
    reemplazarCarrito: datos.reemplazarCarrito,
  });
  res.status(201).json(respuesta);
});

/** US-EXP-07 - Botones "+" y "−" de un item. */
carritoRouter.patch('/items/:id', async (req, res) => {
  const respuesta = await carritoService.cambiarCantidadItem({
    clienteId: sesionDe(req).id,
    itemId: idItemSchema.parse(req.params.id),
    cantidad: cambiarCantidadItemSchema.parse(req.body).cantidad,
  });
  res.json(respuesta);
});

/** US-EXP-07 - Botón "x", o "−" con cantidad 1. */
carritoRouter.delete('/items/:id', async (req, res) => {
  const respuesta = await carritoService.quitarItem({
    clienteId: sesionDe(req).id,
    itemId: idItemSchema.parse(req.params.id),
  });
  res.json(respuesta);
});

/** US-EXP-07 - Botón "Vaciar carrito". */
carritoRouter.delete('/', async (req, res) => {
  const respuesta = await carritoService.vaciarCarrito(sesionDe(req).id);
  res.json(respuesta);
});
