import { avg, count, eq } from 'drizzle-orm';
import { calificacionCocinero } from '@foodhub/db';
import {
  MENSAJES_RESENA,
  MINIMO_PEDIDOS_PARA_REPUTACION_CLIENTE,
  type CalificarClienteInput,
  type MiCalificacionCliente,
  type ReputacionCliente,
} from '@foodhub/shared';
import { db } from '../../lib/db.js';
import { AppError } from '../../middleware/error.middleware.js';
import {
  hubopedidoAceptado,
  pedidosCompletadosDelCliente,
  todas,
} from './consultas.js';

/**
 * Modulo de Resenas y Calificaciones — la calificacion del cocinero al cliente
 * (US-RES-02, RF081).
 *
 * ES LA DIRECCION PRIVADA DE LA REPUTACION. A diferencia de la resena, esta
 * calificacion no es publica: el cliente calificado NO la ve, y otros clientes
 * tampoco. Solo la ven el cocinero que la escribio y, de forma agregada, los
 * demas cocineros cuando reciben un pedido de esa persona.
 *
 * UNA POR PAR COCINERO-CLIENTE, no una por pedido. El cocinero califica a la
 * PERSONA, no a la transaccion: si vuelve a venderle, actualiza la que ya tiene
 * para que refleje el estado actual de la relacion. Lo garantiza el indice
 * `calificacion_cocinero_uq` y por eso el endpoint es un PUT.
 */

/**
 * US-RES-02 - Alta o actualizacion de la calificacion de un cliente.
 *
 * EL HITO HABILITANTE ES "ACEPTADO", NO "COMPLETADO", y es deliberado: la
 * historia quiere que el cocinero pueda "dejar constancia del incumplimiento
 * del cliente aun cuando el pedido no haya llegado a completarse" —la no
 * concurrencia al retiro es justamente el caso en que el pedido termina
 * cancelado—. Por eso `hubopedidoAceptado` mira el historial y no el estado
 * actual del pedido.
 *
 * El upsert va contra el indice unico en lugar de un "leer y decidir": dos
 * envios rapidos del formulario chocarian en la base igual, y `onConflictDoUpdate`
 * los resuelve como lo que son, la segunda edicion de la misma calificacion.
 */
export async function calificarCliente(entrada: {
  cocineroId: string;
  clienteId: string;
  datos: CalificarClienteInput;
}): Promise<MiCalificacionCliente> {
  const { cocineroId, clienteId, datos } = entrada;

  if (cocineroId === clienteId) {
    throw new AppError(
      400,
      MENSAJES_RESENA.sinDerechoACalificar,
      'SIN_DERECHO_A_CALIFICAR',
    );
  }

  if (!(await hubopedidoAceptado({ cocineroId, clienteId }))) {
    throw new AppError(
      403,
      MENSAJES_RESENA.sinDerechoACalificar,
      'SIN_DERECHO_A_CALIFICAR',
    );
  }

  const [fila] = await db
    .insert(calificacionCocinero)
    .values({
      cocineroEvaluadorId: cocineroId,
      clienteEvaluadoId: clienteId,
      calificacion: datos.calificacion,
      comentario: datos.comentario ?? null,
      tags: datos.tags,
    })
    .onConflictDoUpdate({
      target: [
        calificacionCocinero.cocineroEvaluadorId,
        calificacionCocinero.clienteEvaluadoId,
      ],
      set: {
        calificacion: datos.calificacion,
        comentario: datos.comentario ?? null,
        tags: datos.tags,
      },
    })
    .returning({
      calificacion: calificacionCocinero.calificacion,
      comentario: calificacionCocinero.comentario,
      tags: calificacionCocinero.tags,
      fechaPublicacion: calificacionCocinero.fechaPublicacion,
    });

  if (!fila) throw new Error('la calificación no devolvió ninguna fila');

  return {
    calificacion: fila.calificacion,
    comentario: fila.comentario,
    tags: fila.tags ?? [],
    fechaPublicacion: fila.fechaPublicacion.toISOString(),
  };
}

/**
 * US-RES-02 - La calificacion que ESTE cocinero le puso a ese cliente.
 *
 * Es lo que decide si el formulario aparece vacio con el boton "Calificar
 * cliente" o precargado con "Editar calificacion". Devuelve `null` -y no 404-
 * cuando todavia no calificó: la ausencia es un estado esperado de la pantalla,
 * no un error.
 */
export async function miCalificacionDeCliente(entrada: {
  cocineroId: string;
  clienteId: string;
}): Promise<MiCalificacionCliente | null> {
  const [fila] = await db
    .select({
      calificacion: calificacionCocinero.calificacion,
      comentario: calificacionCocinero.comentario,
      tags: calificacionCocinero.tags,
      fechaPublicacion: calificacionCocinero.fechaPublicacion,
    })
    .from(calificacionCocinero)
    .where(
      todas([
        eq(calificacionCocinero.cocineroEvaluadorId, entrada.cocineroId),
        eq(calificacionCocinero.clienteEvaluadoId, entrada.clienteId),
      ]),
    )
    .limit(1);

  if (!fila) return null;

  return {
    calificacion: fila.calificacion,
    comentario: fila.comentario,
    tags: fila.tags ?? [],
    fechaPublicacion: fila.fechaPublicacion.toISOString(),
  };
}

/**
 * US-RES-02 - Reputacion agregada de un cliente, para OTRO cocinero.
 *
 * "Muestre en el detalle del pedido el promedio de estrellas del cliente y la
 * cantidad total de cocineros que lo calificaron. Si el cliente registra menos
 * de 3 pedidos completados en la plataforma, muestre 'Cliente nuevo'."
 *
 * EL UMBRAL SON PEDIDOS COMPLETADOS, NO CALIFICACIONES RECIBIDAS. Son dos
 * cantidades distintas y el criterio nombra la primera: un cliente con diez
 * pedidos y ninguna calificacion no es nuevo, solo no tiene reputacion todavia.
 * Por eso `esClienteNuevo` no se deriva de `cantidadCocineros`.
 *
 * Cuando es nuevo se devuelve el promedio en `null`: si viajara igual, cualquier
 * pantalla que se olvide de mirar la bandera lo mostraria, y la regla que
 * protege al cliente recien llegado dependeria de que nadie se distraiga.
 */
export async function reputacionDeCliente(
  clienteId: string,
): Promise<ReputacionCliente> {
  const [[agregado], completados] = await Promise.all([
    db
      .select({
        promedio: avg(calificacionCocinero.calificacion),
        cantidad: count(),
      })
      .from(calificacionCocinero)
      .where(eq(calificacionCocinero.clienteEvaluadoId, clienteId)),
    pedidosCompletadosDelCliente(clienteId),
  ]);

  const esClienteNuevo = completados < MINIMO_PEDIDOS_PARA_REPUTACION_CLIENTE;
  const promedioCrudo = agregado?.promedio ?? null;

  return {
    promedio:
      esClienteNuevo || promedioCrudo === null
        ? null
        : Math.round(Number(promedioCrudo) * 10) / 10,
    cantidadCocineros: agregado?.cantidad ?? 0,
    esClienteNuevo,
  };
}
