import { Router } from 'express';
import { z } from 'zod';
import {
  calificarClienteSchema,
  calificarCocineroSchema,
  crearResenaSchema,
  editarResenaSchema,
  filtrosResenasSchema,
} from '@foodhub/shared';
import { sesionDe } from '../../lib/request.js';
import { requiereAutenticacion } from '../../middleware/auth.middleware.js';
import { requiereRol } from '../../middleware/rbac.middleware.js';
import * as calificacionCocinero from './calificacionCocinero.service.js';
import * as calificaciones from './calificaciones.service.js';
import * as resenasService from './resenas.service.js';

/**
 * Rutas del modulo de Resenas y Calificaciones (US-RES-01 a US-RES-03).
 *
 * DOS RECURSOS DISTINTOS BAJO EL MISMO PREFIJO, y no es casual que no compartan
 * forma:
 *
 *   /resenas/...            la resena PUBLICA de un plato. Tiene id propio
 *                           porque se crea, se edita y se lista.
 *   /resenas/clientes/:id   la calificacion PRIVADA de un cliente. No tiene id
 *                           en la URL: hay una sola por par cocinero-cliente y
 *                           el cocinero sale de la sesion, asi que el par ya
 *                           esta completamente determinado. Por eso es un PUT
 *                           idempotente y no un POST.
 *
 * NINGUNA RUTA RECIBE EL ID DEL AUTOR. Cliente y cocinero salen siempre de la
 * sesion; la pertenencia se verifica en el WHERE de cada consulta. Cambiar el
 * id de una resena en la URL devuelve 404, no la resena de otro.
 *
 * US-RES-04, US-RES-05 y US-RES-06 -reacciones, respuestas y reportes- van en
 * el segundo PR y suman sus rutas aca.
 */
export const resenasRouter: Router = Router();

const idResenaSchema = z.uuid('El identificador de la reseña no es válido.');
const idUsuarioSchema = z.uuid('El identificador de usuario no es válido.');

/**
 * Lista de publicaciones para consultar el estado de resena de varias de una
 * vez (RF031). Llega como `?publicaciones=uuid,uuid,uuid`.
 *
 * El tope de 50 no es caprichoso: acota el costo de un endpoint que hace una
 * consulta de fechas por publicacion. Ningun pedido real tiene 50 platos
 * distintos, asi que el limite no recorta ningun caso legitimo.
 */
const idsDePublicacionesSchema = z
  .string()
  .transform((valor) =>
    valor
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  )
  .pipe(
    z.array(z.uuid('El identificador de publicación no es válido.')).max(50),
  );

resenasRouter.use(requiereAutenticacion);

// ---------------------------------------------------------------------------
// Perfil publico del cocinero (US-RES-03)
// ---------------------------------------------------------------------------

/**
 * US-RES-03 - Resenas y resumen de un cocinero. PAN-EXP-04.
 *
 * Abierta a CLIENTE y COCINERO: la precondicion de la historia es "el usuario
 * tiene sesion iniciada", sin acotar el rol, y un cocinero mirando el perfil de
 * otro es un caso legitimo. No se usa `requiereRol` justamente por eso.
 *
 * Va antes que `/:id` para que Express no interprete "cocineros" como el
 * identificador de una resena.
 */
resenasRouter.get('/cocineros/:cocineroId', async (req, res) => {
  const pagina = await resenasService.listarResenasDeCocinero({
    cocineroId: idUsuarioSchema.parse(req.params.cocineroId),
    filtros: filtrosResenasSchema.parse(req.query),
  });
  res.json(pagina);
});

/**
 * RF082 - Bloque de reputacion del perfil publico.
 *
 * SEPARADO DEL LISTADO A PROPOSITO. Son dos metricas independientes: el resumen
 * que viaja con el listado describe las RESENAS DE LOS PLATOS, y esto describe
 * las CALIFICACIONES AL COCINERO. Meterlas en la misma respuesta invitaria a
 * confundirlas, que es exactamente lo que la version corregida del modulo vino
 * a separar.
 *
 * Abierta a los dos roles por el mismo motivo que el listado.
 */
resenasRouter.get('/cocineros/:cocineroId/reputacion', async (req, res) => {
  const reputacion = await calificacionCocinero.reputacionDeCocinero(
    idUsuarioSchema.parse(req.params.cocineroId),
  );
  res.json(reputacion);
});

// ---------------------------------------------------------------------------
// Calificacion del cocinero al cliente (US-RES-02)
// ---------------------------------------------------------------------------

/** US-RES-02 - Lo que este cocinero ya opino de ese cliente, o `null`. */
resenasRouter.get(
  '/clientes/:clienteId/mi-calificacion',
  requiereRol('COCINERO'),
  async (req, res) => {
    const calificacion = await calificaciones.miCalificacionDeCliente({
      cocineroId: sesionDe(req).id,
      clienteId: idUsuarioSchema.parse(req.params.clienteId),
    });
    res.json(calificacion);
  },
);

/**
 * US-RES-02 - Reputacion agregada del cliente, para el detalle del pedido.
 *
 * Solo COCINERO: la calificacion del cliente "no es visible para el cliente
 * calificado ni para otros clientes". Exponerla a un CLIENTE romperia el
 * criterio aunque sea su propia reputacion, porque el criterio no la hace
 * visible ni para el.
 */
resenasRouter.get(
  '/clientes/:clienteId/reputacion',
  requiereRol('COCINERO'),
  async (req, res) => {
    const reputacion = await calificaciones.reputacionDeCliente(
      idUsuarioSchema.parse(req.params.clienteId),
    );
    res.json(reputacion);
  },
);

/**
 * US-RES-02 - Alta o edicion de la calificacion. PAN-RES-02.
 *
 * PUT y no POST: hay una sola calificacion por par cocinero-cliente y el par lo
 * determinan la sesion y la URL, asi que la operacion es idempotente. Enviarla
 * dos veces deja el mismo estado, que es exactamente lo que un POST no
 * garantiza.
 */
resenasRouter.put(
  '/clientes/:clienteId/calificacion',
  requiereRol('COCINERO'),
  async (req, res) => {
    const calificacion = await calificaciones.calificarCliente({
      cocineroId: sesionDe(req).id,
      clienteId: idUsuarioSchema.parse(req.params.clienteId),
      datos: calificarClienteSchema.parse(req.body),
    });
    res.json(calificacion);
  },
);

// ---------------------------------------------------------------------------
// Calificacion al cocinero (US-RES-07, RF087)
// ---------------------------------------------------------------------------

/**
 * LAS CUATRO RUTAS VAN ANTES QUE `/:id` por el mismo motivo que `/cocineros` y
 * `/clientes`: Express interpretaria "calificaciones" o "pedidos" como el
 * identificador de una resena.
 *
 * Cuelgan de `/pedidos/:pedidoId` y no de `/cocineros/:id` porque la unicidad
 * es por PEDIDO: el recurso que se crea es "la calificacion de este pedido", no
 * "mi calificacion de este cocinero".
 */

/** RF031 - Que accion corresponde para la calificacion al cocinero del pedido. */
resenasRouter.get(
  '/pedidos/:pedidoId/calificacion',
  requiereRol('CLIENTE'),
  async (req, res) => {
    const estado = await calificacionCocinero.estadoDeCalificacionDeCocinero({
      clienteId: sesionDe(req).id,
      pedidoId: idResenaSchema.parse(req.params.pedidoId),
    });
    res.json(estado);
  },
);

/** US-RES-07 - Alta de la calificacion al cocinero. PAN-RES-03. */
resenasRouter.post(
  '/pedidos/:pedidoId/calificacion',
  requiereRol('CLIENTE'),
  async (req, res) => {
    const calificacion = await calificacionCocinero.calificarCocinero({
      clienteId: sesionDe(req).id,
      pedidoId: idResenaSchema.parse(req.params.pedidoId),
      datos: calificarCocineroSchema.parse(req.body),
    });
    res.status(201).json(calificacion);
  },
);

/**
 * US-RES-07 - Una calificacion puntual, para precargar la edicion o verla en
 * modo solo lectura.
 *
 * Con `requiereRol('CLIENTE')` a diferencia de `GET /resenas/:id`: la
 * calificacion al cocinero no es contenido publico. En el perfil se muestra
 * agregada en el bloque de reputacion, nunca fila por fila.
 */
resenasRouter.get(
  '/calificaciones/:id',
  requiereRol('CLIENTE'),
  async (req, res) => {
    const calificacion = await calificacionCocinero.leerCalificacionDeCocinero({
      clienteId: sesionDe(req).id,
      calificacionId: idResenaSchema.parse(req.params.id),
    });
    res.json(calificacion);
  },
);

/** US-RES-07 - Edicion dentro de la ventana de 48 horas, que no se reabre. */
resenasRouter.patch(
  '/calificaciones/:id',
  requiereRol('CLIENTE'),
  async (req, res) => {
    const calificacion =
      await calificacionCocinero.editarCalificacionDeCocinero({
        clienteId: sesionDe(req).id,
        calificacionId: idResenaSchema.parse(req.params.id),
        datos: calificarCocineroSchema.parse(req.body),
      });
    res.json(calificacion);
  },
);

// ---------------------------------------------------------------------------
// Resena del plato (US-RES-01)
// ---------------------------------------------------------------------------

/**
 * RF031 - Que boton corresponde sobre cada plato de un pedido.
 *
 * Va antes que `/:id` por el mismo motivo que `/cocineros`.
 */
resenasRouter.get('/estado', requiereRol('CLIENTE'), async (req, res) => {
  const publicacionIds = idsDePublicacionesSchema.parse(
    typeof req.query.publicaciones === 'string' ? req.query.publicaciones : '',
  );
  const datos = await resenasService.estadoDeResenas({
    clienteId: sesionDe(req).id,
    publicacionIds,
  });
  res.json({ datos });
});

/** US-RES-01 - Alta de la resena de un plato. PAN-RES-01. */
resenasRouter.post('/', requiereRol('CLIENTE'), async (req, res) => {
  const resena = await resenasService.crearResena({
    clienteId: sesionDe(req).id,
    datos: crearResenaSchema.parse(req.body),
  });
  res.status(201).json(resena);
});

/**
 * US-RES-01 - Una resena puntual, para precargar el formulario de edicion y
 * para el modo solo lectura de "Ver mi resena".
 *
 * Sin `requiereRol`: la resena es contenido publico del perfil del cocinero, y
 * el propio cocinero tiene que poder abrirla. Va DESPUES de `/estado`,
 * `/cocineros/...` y `/clientes/...` para que Express no interprete esos
 * prefijos como un identificador.
 */
resenasRouter.get('/:id', async (req, res) => {
  const resena = await resenasService.leerResenaPublica(
    idResenaSchema.parse(req.params.id),
  );
  res.json(resena);
});

/** US-RES-01 - Edicion dentro de la ventana de 48 horas. */
resenasRouter.patch('/:id', requiereRol('CLIENTE'), async (req, res) => {
  const resena = await resenasService.editarResena({
    clienteId: sesionDe(req).id,
    resenaId: idResenaSchema.parse(req.params.id),
    datos: editarResenaSchema.parse(req.body),
  });
  res.json(resena);
});
