import { Router } from 'express';
import { z } from 'zod';
import {
  abrirConversacionSchema,
  acusarEntregaSchema,
  archivadoConversacionSchema,
  enviarMensajeSchema,
  filtrosConversacionesSchema,
  historialDeMensajesSchema,
} from '@foodhub/shared';
import { sesionDe } from '../../lib/request.js';
import { requiereAutenticacion } from '../../middleware/auth.middleware.js';
import { requiereRol } from '../../middleware/rbac.middleware.js';
import * as mensajeriaService from './mensajeria.service.js';

/**
 * Rutas del modulo de Mensajeria directa (US-MSG-01 a US-MSG-07).
 *
 * NINGUNA RUTA RECIBE EL ID DE QUIEN ESCRIBE. Sale siempre del JWT, y la
 * pertenencia a la conversacion se verifica dentro de cada consulta: cambiar el
 * id de la URL devuelve 404, no el hilo de otra persona. Mismo criterio que el
 * router de Pedidos.
 *
 * TODO EL MODULO ES DE CLIENTE Y COCINERO. El administrador no tiene pantallas
 * de chat -PAN-MSG-01 y PAN-MSG-02 no figuran en su navegacion- y su rol es
 * moderar, no conversar. El filtro se declara una sola vez, sobre el router
 * entero, en lugar de repetirlo en cada ruta y arriesgarse a olvidarlo en la
 * proxima que se agregue.
 *
 * US-MSG-07 NO TIENE RUTA PROPIA. El bloqueo por baja no es una accion que
 * alguien invoque: lo dispara la baja de la cuenta, dentro de la misma
 * transaccion que la marca como ELIMINADA (ver `usuarios.service.ts`).
 */
export const mensajeriaRouter: Router = Router();

const idConversacionSchema = z.uuid(
  'El identificador de la conversación no es válido.',
);
const idUsuarioSchema = z.uuid('El identificador del usuario no es válido.');

mensajeriaRouter.use(requiereAutenticacion, requiereRol('CLIENTE', 'COCINERO'));

// ---------------------------------------------------------------------------
// Conversaciones
// ---------------------------------------------------------------------------

/**
 * US-MSG-04 - Listado de PAN-MSG-01, por filtro y con busqueda.
 *
 * Sin paginacion: los criterios no la piden y el listado esta acotado por la
 * cantidad de gente con la que uno efectivamente hablo, que en este dominio se
 * mide en decenas. El scroll infinito que si tiene el modulo es el del historial
 * de UNA conversacion (US-MSG-05), donde el volumen no tiene techo.
 */
mensajeriaRouter.get('/conversaciones', async (req, res) => {
  const filtros = filtrosConversacionesSchema.parse(req.query);
  const conversaciones = await mensajeriaService.listarConversaciones(
    sesionDe(req).id,
    filtros,
  );
  res.json(conversaciones);
});

/**
 * US-MSG-01 - Abre el chat con alguien, creandolo si hace falta.
 *
 * POST y no PUT aunque sea idempotente: el recurso que crea es una conversacion
 * con id propio, no una fila cuya clave venga en la URL. Responde 200 y no 201
 * porque la mayoria de las veces no crea nada -devuelve el hilo de siempre- y
 * el cliente no necesita distinguir los dos casos: navega a la misma pantalla.
 */
mensajeriaRouter.post('/conversaciones', async (req, res) => {
  const datos = abrirConversacionSchema.parse(req.body);
  const conversacion = await mensajeriaService.abrirConversacion(
    sesionDe(req).id,
    datos.destinatarioId,
  );
  res.json(conversacion);
});

/**
 * US-MSG-06 - El hilo con otra persona, sin crearlo.
 *
 * Lo consulta el boton "Mensajes del pedido" de PAN-PED-03 y PAN-PED-06 con el
 * id de la contraparte del pedido. Responde 204 cuando todavia no hay hilo: el
 * boton se muestra igual, pero sin contador y abriendo el chat recien al
 * tocarlo.
 *
 * Va ANTES de `/conversaciones/:conversacionId`: Express evalua las rutas en
 * orden y `con` encajaria como un id de conversacion, devolviendo un 400 de
 * validacion en lugar de entrar aca.
 */
mensajeriaRouter.get('/conversaciones/con/:usuarioId', async (req, res) => {
  const conversacion = await mensajeriaService.obtenerConversacionCon(
    sesionDe(req).id,
    idUsuarioSchema.parse(req.params.usuarioId),
  );
  if (!conversacion) {
    res.status(204).end();
    return;
  }
  res.json(conversacion);
});

/** US-MSG-05 - Cabecera de PAN-MSG-02 y estado del campo de entrada. */
mensajeriaRouter.get('/conversaciones/:conversacionId', async (req, res) => {
  const conversacion = await mensajeriaService.obtenerConversacion(
    sesionDe(req).id,
    idConversacionSchema.parse(req.params.conversacionId),
  );
  res.json(conversacion);
});

/** US-MSG-04 - Archivar o devolver al listado principal. */
mensajeriaRouter.patch(
  '/conversaciones/:conversacionId/archivado',
  async (req, res) => {
    const datos = archivadoConversacionSchema.parse(req.body);
    const conversacion = await mensajeriaService.cambiarArchivado(
      sesionDe(req).id,
      idConversacionSchema.parse(req.params.conversacionId),
      datos.archivada,
    );
    res.json(conversacion);
  },
);

// ---------------------------------------------------------------------------
// Mensajes
// ---------------------------------------------------------------------------

/** US-MSG-05 - Un bloque del historial, hacia atras en el tiempo. */
mensajeriaRouter.get(
  '/conversaciones/:conversacionId/mensajes',
  async (req, res) => {
    const paginado = historialDeMensajesSchema.parse(req.query);
    const pagina = await mensajeriaService.listarMensajes(
      sesionDe(req).id,
      idConversacionSchema.parse(req.params.conversacionId),
      paginado,
    );
    res.json(pagina);
  },
);

/**
 * US-MSG-02 y US-MSG-03 - Enviar texto o imagen.
 *
 * Un solo endpoint para los dos subtipos, discriminados por `tipo` en el
 * cuerpo. Es el mismo criterio con el que la base los guarda en una sola tabla:
 * comparten destinatario, pertenencia, contadores y desarchivado, y separarlos
 * duplicaria toda esa maquinaria para cambiar dos columnas.
 */
mensajeriaRouter.post(
  '/conversaciones/:conversacionId/mensajes',
  async (req, res) => {
    const datos = enviarMensajeSchema.parse(req.body);
    const enviado = await mensajeriaService.enviarMensaje(
      sesionDe(req).id,
      idConversacionSchema.parse(req.params.conversacionId),
      datos,
    );
    res.status(201).json(enviado);
  },
);

/**
 * US-MSG-05 - Marca como leidos los mensajes recibidos y pone el contador en 0.
 *
 * POST y no PATCH porque no modifica un campo que el cliente elija: no lleva
 * cuerpo, y el efecto -que mensajes cambian de estado- lo decide el servidor.
 */
mensajeriaRouter.post(
  '/conversaciones/:conversacionId/leidos',
  async (req, res) => {
    const conversacion = await mensajeriaService.marcarLeidos(
      sesionDe(req).id,
      idConversacionSchema.parse(req.params.conversacionId),
    );
    res.json(conversacion);
  },
);

/**
 * US-MSG-02 - Acuse de entrega en lote (ENVIADO -> ENTREGADO).
 *
 * NO cuelga de una conversacion: el telefono acusa de una vez todo lo que le
 * llego por Realtime, que puede abarcar varios hilos. La pertenencia de cada
 * mensaje se verifica igual, dentro de la propia sentencia.
 *
 * Responde 204: al cliente no le sirve el resultado. Los mensajes que ya
 * estaban LEIDO o que no le corresponden simplemente no se tocan, y eso no es
 * un error que deba enterarse.
 */
mensajeriaRouter.post('/acuses', async (req, res) => {
  const datos = acusarEntregaSchema.parse(req.body);
  await mensajeriaService.acusarEntrega(sesionDe(req).id, datos.mensajeIds);
  res.status(204).end();
});
