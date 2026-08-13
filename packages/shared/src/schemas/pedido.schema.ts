import { z } from 'zod';
import {
  ESTADO_PEDIDO,
  ORIGEN_TRANSICION,
  TRANSICIONES_PEDIDO,
  type EstadoPedido,
} from '../constants/enums.js';

/**
 * Contratos del modulo de Pedidos (alcance 2.2.2.2.2).
 *
 * El pedido es el proceso transaccional central del sistema, asi que sus
 * invariantes se declaran aca y no en cada endpoint: un pedido siempre tiene
 * al menos un item, todos los items pertenecen a un mismo cocinero y el estado
 * solo avanza por las transiciones declaradas en TRANSICIONES_PEDIDO.
 */

export const itemPedidoInputSchema = z.object({
  publicacionId: z.uuid(),
  cantidad: z
    .number()
    .int('La cantidad debe ser un número entero.')
    .min(1, 'La cantidad mínima es 1.')
    .max(20, 'La cantidad máxima por plato es 20.'),
});

/**
 * Alta de pedido. El carrito solo admite platos de un mismo cocinero
 * (alcance 2.2.2.2.2: "carrito simple para pedir diferentes platos de un mismo
 * cocinero"), por eso `cocineroId` va a nivel del pedido y no de cada item.
 *
 * Los precios NO se reciben del cliente: se resuelven en el servidor contra la
 * publicacion vigente y recien ahi se congelan como snapshot en ItemPedido.
 * Aceptar el precio del cliente permitiria manipular el total del pedido.
 */
export const crearPedidoSchema = z.object({
  cocineroId: z.uuid(),
  items: z
    .array(itemPedidoInputSchema)
    .min(1, 'El pedido debe incluir al menos un plato.')
    .max(50, 'El pedido no puede superar los 50 ítems.'),
  instruccionesCliente: z
    .string()
    .trim()
    .max(300, 'Las instrucciones no pueden superar los 300 caracteres.')
    .optional(),
});

/**
 * Cambio de estado de un pedido.
 *
 * El `superRefine` traduce a validacion la maquina de estados: si el destino
 * no figura entre las transiciones permitidas desde el origen, el request se
 * rechaza antes de llegar al servicio. Asi la regla vive en un solo lugar y no
 * repartida entre los handlers de aceptar, rechazar y completar.
 */
export const cambiarEstadoPedidoSchema = z
  .object({
    estadoActual: z.enum(ESTADO_PEDIDO),
    estadoDestino: z.enum(ESTADO_PEDIDO),
    origen: z.enum(ORIGEN_TRANSICION),
    motivo: z.string().trim().max(300).optional(),
    motivoCancelacionId: z.uuid().optional(),
  })
  .superRefine((data, ctx) => {
    const permitidos: readonly EstadoPedido[] =
      TRANSICIONES_PEDIDO[data.estadoActual];

    if (!permitidos.includes(data.estadoDestino)) {
      ctx.addIssue({
        code: 'custom',
        path: ['estadoDestino'],
        message: `No se puede pasar de ${data.estadoActual} a ${data.estadoDestino}.`,
      });
    }

    // Un rechazo sin motivo deja al cliente sin saber que paso; el modulo de
    // pedidos exige distinguir los motivos de cancelacion (alcance 2.2.2.2.2).
    if (data.estadoDestino === 'RECHAZADO' && !data.motivoCancelacionId) {
      ctx.addIssue({
        code: 'custom',
        path: ['motivoCancelacionId'],
        message: 'Indicá el motivo del rechazo.',
      });
    }
  });

/** Filtros del historial de pedidos, compartidos por cliente y cocinero. */
export const filtrosPedidoSchema = z.object({
  estado: z.enum(ESTADO_PEDIDO).optional(),
  desde: z.iso.datetime().optional(),
  hasta: z.iso.datetime().optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(50).default(20),
});

export type ItemPedidoInput = z.infer<typeof itemPedidoInputSchema>;
export type CrearPedidoInput = z.infer<typeof crearPedidoSchema>;
export type CambiarEstadoPedidoInput = z.infer<
  typeof cambiarEstadoPedidoSchema
>;
export type FiltrosPedido = z.infer<typeof filtrosPedidoSchema>;
