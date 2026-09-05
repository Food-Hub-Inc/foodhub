import { Router } from 'express';
import { z } from 'zod';
import {
  crearResenaSchema,
  editarResenaSchema,
  filtrosResenasSchema,
  MENSAJES_RESENA,
  reaccionarSchema,
  reportarResenaSchema,
  responderResenaSchema,
} from '@foodhub/shared';
import { sesionDe } from '../../lib/request.js';
import { requiereAutenticacion } from '../../middleware/auth.middleware.js';
import { requiereRol } from '../../middleware/rbac.middleware.js';
import * as clientes from './calificaciones.service.js';
import * as resenasService from './resenas.service.js';
import * as social from './social.service.js';

/**
 * Rutas del modulo de Resenas y Calificaciones (US-RES-01 a US-RES-07).
 *
 * LA RUTA NOMBRA AL OBJETO RESENADO, que es la regla del modelo hecha URL:
 *
 *   /resenas/publicaciones/:id   las resenas de un plato (RF019)
 *   /resenas/cocineros/:id/opiniones   las que le dejaron a un cocinero
 *   /resenas/cocineros/:id/platos      las de todos sus platos (PAN-RES-02)
 *   /resenas/clientes/:id        las que los cocineros le dejaron a un cliente
 *
 * NINGUNA CUELGA DE UN PEDIDO, y las que lo hacian se retiraron. El pedido
 * habilita el derecho a opinar y nada mas; que apareciera en la URL era la
 * forma visible del defecto que esta correccion revierte.
 *
 * `GET /resenas/cocineros/:id` TAMBIEN SE RETIRO, en vez de cambiarle el
 * significado: antes devolvia las resenas de sus PLATOS y ahora eso vive en
 * `/platos`. Conservar el path habria hecho que un bundle viejo recibiera otra
 * lista sin ningun error, y el equipo esta justo en esa situacion -Metro
 * corriendo contra una build anterior-. Un 404 se diagnostica; una lista
 * equivocada, no.
 *
 * NINGUNA RUTA RECIBE EL ID DEL AUTOR. Cliente y cocinero salen siempre de la
 * sesion; la pertenencia se verifica en el WHERE de cada consulta. Cambiar el
 * id de una resena en la URL devuelve 404, no la resena de otro.
 *
 * LAS RESENAS A UN CLIENTE SON EL UNICO CONTENIDO NO PUBLICO del modulo
 * (US-RES-02: "no es visible para el cliente calificado ni para otros
 * clientes"). Con las tres resenas en una tabla, esa privacidad ya no la da el
 * modelo: la dan el `requiereRol('COCINERO')` de sus dos rutas y la prueba de
 * router que lo verifica.
 *
 * US-RES-04, US-RES-05 y US-RES-06 -reacciones, respuestas y reportes- cuelgan
 * de `/:id/...` al final del archivo; la moderacion del administrador (RF086)
 * vive en su propio router, bajo `/moderacion`.
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
// Listados (US-RES-03, RF019, US-RES-02)
// ---------------------------------------------------------------------------

/**
 * LOS PREFIJOS LITERALES VAN ANTES QUE `/:id`, o Express interpretaria
 * "publicaciones", "cocineros" y "clientes" como el identificador de una
 * resena.
 *
 * Los tres primeros listados estan abiertos a CLIENTE y COCINERO: la
 * precondicion de US-RES-03 es "el usuario tiene sesion iniciada", sin acotar
 * el rol, y un cocinero mirando el perfil de otro es un caso legitimo.
 */

/** RF019 - Resenas de un plato. PAN-EXP-05. */
resenasRouter.get('/publicaciones/:publicacionId', async (req, res) => {
  const pagina = await resenasService.listarResenas({
    objeto: {
      tipo: 'PLATO',
      publicacionId: idUsuarioSchema.parse(req.params.publicacionId),
    },
    usuarioId: sesionDe(req).id,
    filtros: filtrosResenasSchema.parse(req.query),
  });
  res.json(pagina);
});

/**
 * US-RES-03 - Las resenas que le dejaron AL cocinero. PAN-EXP-04.
 *
 * El resumen que viaja con el listado -promedio, distribucion y total- es el
 * mismo que dibuja el bloque de arriba de la solapa. Antes ese bloque pedia su
 * numero a `/reputacion`, un endpoint aparte que consultaba otra tabla: por eso
 * podian discrepar. Ahora salen de la misma consulta y no pueden.
 */
resenasRouter.get('/cocineros/:cocineroId/opiniones', async (req, res) => {
  const pagina = await resenasService.listarResenas({
    objeto: {
      tipo: 'COCINERO',
      cocineroId: idUsuarioSchema.parse(req.params.cocineroId),
    },
    usuarioId: sesionDe(req).id,
    filtros: filtrosResenasSchema.parse(req.query),
  });
  res.json(pagina);
});

/** US-RES-03 - Las resenas de los PLATOS de un cocinero. PAN-RES-02. */
resenasRouter.get('/cocineros/:cocineroId/platos', async (req, res) => {
  const pagina = await resenasService.listarResenas({
    objeto: {
      tipo: 'PLATOS_DEL_COCINERO',
      cocineroId: idUsuarioSchema.parse(req.params.cocineroId),
    },
    usuarioId: sesionDe(req).id,
    filtros: filtrosResenasSchema.parse(req.query),
  });
  res.json(pagina);
});

/** US-RES-03 - Que puede hacer el cliente de la sesion con ese cocinero. */
resenasRouter.get(
  '/cocineros/:cocineroId/mi-resena',
  requiereRol('CLIENTE'),
  async (req, res) => {
    const estado = await resenasService.estadoDeResenaSobrePersona({
      autorId: sesionDe(req).id,
      personaId: idUsuarioSchema.parse(req.params.cocineroId),
      tipo: 'COCINERO',
    });
    res.json(estado);
  },
);

// ---------------------------------------------------------------------------
// El cliente resenado (US-RES-02)
// ---------------------------------------------------------------------------

/**
 * LAS TRES SON `requiereRol('COCINERO')`, y no por simetria: US-RES-02 dice que
 * la resena de un cliente "no es visible para el cliente calificado ni para
 * otros clientes". Exponerla a un CLIENTE romperia el criterio AUNQUE FUERA SU
 * PROPIA REPUTACION, porque el criterio no la hace visible ni para el.
 */

/** US-RES-02 - Las resenas que los cocineros le dejaron a un cliente. */
resenasRouter.get(
  '/clientes/:clienteId',
  requiereRol('COCINERO'),
  async (req, res) => {
    const pagina = await resenasService.listarResenas({
      objeto: {
        tipo: 'CLIENTE',
        clienteId: idUsuarioSchema.parse(req.params.clienteId),
      },
      usuarioId: sesionDe(req).id,
      filtros: filtrosResenasSchema.parse(req.query),
    });
    res.json(pagina);
  },
);

/** US-RES-02 - Que puede hacer el cocinero de la sesion con ese cliente. */
resenasRouter.get(
  '/clientes/:clienteId/mi-resena',
  requiereRol('COCINERO'),
  async (req, res) => {
    const estado = await resenasService.estadoDeResenaSobrePersona({
      autorId: sesionDe(req).id,
      personaId: idUsuarioSchema.parse(req.params.clienteId),
      tipo: 'CLIENTE',
    });
    res.json(estado);
  },
);

/** US-DASH-03 - Ficha del perfil publico del cliente. */
resenasRouter.get(
  '/clientes/:clienteId/perfil',
  requiereRol('COCINERO'),
  async (req, res) => {
    const perfil = await clientes.perfilPublicoDeCliente(
      idUsuarioSchema.parse(req.params.clienteId),
    );
    res.json(perfil);
  },
);

/** US-RES-02 - Reputacion agregada del cliente, para el detalle del pedido. */
resenasRouter.get(
  '/clientes/:clienteId/reputacion',
  requiereRol('COCINERO'),
  async (req, res) => {
    const reputacion = await clientes.reputacionDeCliente(
      idUsuarioSchema.parse(req.params.clienteId),
    );
    res.json(reputacion);
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

/**
 * Alta de una resena, cualquiera sea su objeto. PAN-RES-01, PAN-RES-02 y
 * PAN-RES-03.
 *
 * UN SOLO ENDPOINT PARA LOS TRES CASOS, discriminado por `tipo` en el cuerpo.
 * El destino no va en la URL porque no es siempre del mismo recurso -una vez es
 * una publicacion y dos veces una persona-, y tres rutas para el mismo hecho
 * habrian obligado a la app a elegir cual llamar antes de saber que esta
 * haciendo.
 *
 * SIN `requiereRol`: quien resena un plato o un cocinero es un cliente y quien
 * resena a un cliente es un cocinero, asi que el rol depende del cuerpo. El
 * servicio lo verifica donde de verdad importa -contra el historial de pedidos
 * del autor-, que es un control mas fuerte que el rol: un cocinero sin pedidos
 * con ese cliente tampoco puede.
 */
resenasRouter.post('/', async (req, res) => {
  const resena = await resenasService.crearResena({
    autorId: sesionDe(req).id,
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
    sesionDe(req).id,
  );
  res.json(resena);
});

/**
 * Edicion de una resena propia. Sin `requiereRol` por el mismo motivo que el
 * alta: el rol depende de que se resenó, y el servicio verifica lo que importa
 * -que la resena sea del autor de la sesion-.
 */
resenasRouter.patch('/:id', async (req, res) => {
  const resena = await resenasService.editarResena({
    autorId: sesionDe(req).id,
    resenaId: idResenaSchema.parse(req.params.id),
    datos: editarResenaSchema.parse(req.body),
  });
  res.json(resena);
});

// ---------------------------------------------------------------------------
// US-RES-04, US-RES-05 y US-RES-06 — sobre una resena puntual
// ---------------------------------------------------------------------------

/**
 * ESTAS VAN AL FINAL Y NO ANTES DE `/:id`, al reves que `/cocineros` y
 * `/pedidos`. No hay ambiguedad posible: `/:id/reaccion` tiene dos segmentos y
 * `/:id` uno solo, asi que Express nunca confunde una con la otra.
 */

/** US-RES-04 - Marca, cambia o quita la reaccion. `tipo: null` desmarca. */
resenasRouter.put('/:id/reaccion', async (req, res) => {
  await social.reaccionar({
    usuarioId: sesionDe(req).id,
    resenaId: idResenaSchema.parse(req.params.id),
    datos: reaccionarSchema.parse(req.body),
  });
  res.status(204).send();
});

/** US-RES-05 - El cocinero responde una resena de uno de sus platos. */
resenasRouter.post(
  '/:id/respuesta',
  requiereRol('COCINERO'),
  async (req, res) => {
    const respuesta = await social.responderResena({
      cocineroId: sesionDe(req).id,
      resenaId: idResenaSchema.parse(req.params.id),
      datos: responderResenaSchema.parse(req.body),
    });
    res.status(201).json(respuesta);
  },
);

/**
 * US-RES-05 - Edicion dentro de las 24 horas.
 *
 * Cuelga de `/respuestas/:id` y no de `/:resenaId/respuesta` porque lo que se
 * modifica es la respuesta, que tiene identidad propia; la resena solo dice de
 * donde salio.
 */
resenasRouter.patch(
  '/respuestas/:id',
  requiereRol('COCINERO'),
  async (req, res) => {
    const respuesta = await social.editarRespuesta({
      cocineroId: sesionDe(req).id,
      respuestaId: idResenaSchema.parse(req.params.id),
      datos: responderResenaSchema.parse(req.body),
    });
    res.json(respuesta);
  },
);

/** US-RES-06 - Reporta una resena ajena. Sin rol: cualquiera con sesion. */
resenasRouter.post('/:id/reporte', async (req, res) => {
  await social.reportarResena({
    usuarioId: sesionDe(req).id,
    resenaId: idResenaSchema.parse(req.params.id),
    datos: reportarResenaSchema.parse(req.body),
  });
  res.status(201).json({ mensaje: MENSAJES_RESENA.reporteEnviado });
});

/**
 * US-RES-06 - El autor retira su propia resena.
 *
 * DELETE, aunque por dentro sea un UPDATE de estado: para quien llama, la
 * resena deja de existir. Exponerlo como PATCH obligaria al cliente a conocer
 * el enum `ELIMINADA_AUTOR`, que es un detalle de como se implementa la baja.
 */
resenasRouter.delete('/:id', requiereRol('CLIENTE'), async (req, res) => {
  await social.eliminarMiResena({
    clienteId: sesionDe(req).id,
    resenaId: idResenaSchema.parse(req.params.id),
  });
  res.status(204).send();
});
