import { Router } from 'express';
import { z } from 'zod';
import {
  aceptarPedidoSchema,
  cancelarPedidoSchema,
  confirmarPedidoSchema,
  filtrosPedidoClienteSchema,
  filtrosPedidoCocineroSchema,
  filtrosPedidosConClienteSchema,
  rechazarPedidoSchema,
} from '@foodhub/shared';
import { sesionDe } from '../../lib/request.js';
import { requiereAutenticacion } from '../../middleware/auth.middleware.js';
import { requiereRol } from '../../middleware/rbac.middleware.js';
import { noAutorizado } from '../../middleware/error.middleware.js';
import * as pedidosService from './pedidos.service.js';
import * as transiciones from './transiciones.service.js';

/**
 * Rutas del modulo de Pedidos (US-PED-01 a US-PED-09).
 *
 * UNA RUTA POR ACCION, y no un unico `PATCH /:id/estado` con el destino en el
 * cuerpo. Cada transicion la puede provocar un rol distinto y exige datos
 * distintos -el tiempo comprometido al aceptar, el motivo al rechazar-, asi que
 * un endpoint generico tendria que decidir por dentro quien puede hacer que:
 * `requiereRol` dejaria de decir la verdad y la autorizacion quedaria escondida
 * en un `switch`. Con rutas separadas, el permiso se lee en la propia
 * definicion.
 *
 * NINGUNA RUTA RECIBE EL ID DE UNA DE LAS PARTES. Cliente y cocinero salen
 * siempre de la sesion, y la pertenencia del pedido se verifica en el WHERE de
 * cada consulta: cambiar el id del pedido en la URL devuelve 404, no el pedido
 * de otro.
 *
 * US-PED-10 (expiracion automatica) NO tiene ruta: es un proceso periodico que
 * corre con pg_cron dentro de la base (migracion 0010), sin pasar por la API.
 */
export const pedidosRouter: Router = Router();

const idPedidoSchema = z.uuid('El identificador del pedido no es válido.');

pedidosRouter.use(requiereAutenticacion);

// ---------------------------------------------------------------------------
// Cliente
// ---------------------------------------------------------------------------

/**
 * US-PED-01 - Confirma el pedido con el contenido del carrito (PAN-PED-01).
 *
 * Devuelve el detalle completo y no solo el id: la app navega directo a la
 * pantalla de seguimiento (PAN-PED-03.0) y con esta respuesta ya la puede
 * dibujar sin una segunda vuelta.
 */
pedidosRouter.post('/', requiereRol('CLIENTE'), async (req, res) => {
  const datos = confirmarPedidoSchema.parse(req.body);
  const detalle = await pedidosService.confirmarPedido({
    clienteId: sesionDe(req).id,
    instruccionesCliente: datos.instruccionesCliente,
  });
  res.status(201).json(detalle);
});

/** US-PED-06 - Historial del cliente, por pestana (PAN-PED-05). */
pedidosRouter.get('/', requiereRol('CLIENTE'), async (req, res) => {
  const filtros = filtrosPedidoClienteSchema.parse(req.query);
  const pagina = await pedidosService.listarPedidosDelCliente(
    sesionDe(req).id,
    filtros,
  );
  res.json(pagina);
});

// ---------------------------------------------------------------------------
// Cocinero
// ---------------------------------------------------------------------------

/**
 * US-PED-03 y US-PED-08 - Bandeja del cocinero, por pestana (PAN-PED-04).
 *
 * Va antes que `/:id` a proposito: Express evalua las rutas en orden y, si
 * `/:id` estuviera primero, "recibidos" entraria como identificador y la
 * validacion del uuid responderia 400 en vez de atender la bandeja.
 */
pedidosRouter.get('/recibidos', requiereRol('COCINERO'), async (req, res) => {
  const filtros = filtrosPedidoCocineroSchema.parse(req.query);
  const pagina = await pedidosService.listarPedidosDelCocinero(
    sesionDe(req).id,
    filtros,
  );
  res.json(pagina);
});

/**
 * US-DASH-03 - Los pedidos que un cliente le hizo a este cocinero.
 *
 * Va antes que `/:id` por el mismo motivo que `/recibidos`: Express evalua en
 * orden y "con-cliente" entraria como identificador.
 *
 * El cocinero sale de la sesion y no de la URL, asi que un cocinero no puede
 * pedir el historial de otro cambiando un parametro.
 */
pedidosRouter.get(
  '/con-cliente/:clienteId',
  requiereRol('COCINERO'),
  async (req, res) => {
    const pagina = await pedidosService.listarPedidosConCliente({
      cocineroId: sesionDe(req).id,
      clienteId: idPedidoSchema.parse(req.params.clienteId),
      filtros: filtrosPedidosConClienteSchema.parse(req.query),
    });
    res.json(pagina);
  },
);

// ---------------------------------------------------------------------------
// Detalle, compartido por las dos partes
// ---------------------------------------------------------------------------

/**
 * US-PED-07 (cliente) y US-PED-08 (cocinero) - Detalle completo del pedido.
 *
 * El rol sale de la sesion y decide a quien se muestra como participante. Un
 * administrador no entra: el panel no tiene pantalla de pedidos y darle acceso
 * seria ampliar el alcance por comodidad.
 */
pedidosRouter.get('/:id', async (req, res) => {
  const sesion = sesionDe(req);
  if (sesion.tipo !== 'CLIENTE' && sesion.tipo !== 'COCINERO') {
    throw noAutorizado();
  }

  const detalle = await pedidosService.obtenerDetalle({
    pedidoId: idPedidoSchema.parse(req.params.id),
    usuarioId: sesion.id,
    rol: sesion.tipo,
  });
  res.json(detalle);
});

// ---------------------------------------------------------------------------
// Transiciones
// ---------------------------------------------------------------------------

/** US-PED-03 - "Aceptar" desde el detalle de un pedido nuevo (PAN-PED-04.4). */
pedidosRouter.post(
  '/:id/aceptar',
  requiereRol('COCINERO'),
  async (req, res) => {
    const datos = aceptarPedidoSchema.parse(req.body);
    const detalle = await transiciones.aceptarPedido({
      cocineroId: sesionDe(req).id,
      pedidoId: idPedidoSchema.parse(req.params.id),
      tiempoEstimadoPreparacionMin: datos.tiempoEstimadoPreparacionMin,
    });
    res.json(detalle);
  },
);

/** US-PED-04 - "Confirmar rechazo" (PAN-PED-04.5). */
pedidosRouter.post(
  '/:id/rechazar',
  requiereRol('COCINERO'),
  async (req, res) => {
    const datos = rechazarPedidoSchema.parse(req.body);
    const detalle = await transiciones.rechazarPedido({
      cocineroId: sesionDe(req).id,
      pedidoId: idPedidoSchema.parse(req.params.id),
      motivoCancelacionId: datos.motivoCancelacionId,
      motivoTexto: datos.motivoTexto,
    });
    res.json(detalle);
  },
);

/** US-PED-05 - Boton "Listo" de la pestana Preparando (PAN-PED-04.1). */
pedidosRouter.post('/:id/listo', requiereRol('COCINERO'), async (req, res) => {
  const detalle = await transiciones.marcarPedidoListo({
    cocineroId: sesionDe(req).id,
    pedidoId: idPedidoSchema.parse(req.params.id),
  });
  res.json(detalle);
});

/** US-PED-05 - Boton "Entregado" de la pestana Listos (PAN-PED-04.2). */
pedidosRouter.post(
  '/:id/completar',
  requiereRol('COCINERO'),
  async (req, res) => {
    const detalle = await transiciones.completarPedido({
      cocineroId: sesionDe(req).id,
      pedidoId: idPedidoSchema.parse(req.params.id),
    });
    res.json(detalle);
  },
);

/** US-PED-09 - "Sí, cancelar" del dialogo de cancelacion (PAN-PED-03.0.1). */
pedidosRouter.post(
  '/:id/cancelar',
  requiereRol('CLIENTE'),
  async (req, res) => {
    const datos = cancelarPedidoSchema.parse(req.body);
    const detalle = await transiciones.cancelarPedido({
      clienteId: sesionDe(req).id,
      pedidoId: idPedidoSchema.parse(req.params.id),
      motivoCancelacionId: datos.motivoCancelacionId,
      motivoTexto: datos.motivoTexto,
    });
    res.json(detalle);
  },
);
