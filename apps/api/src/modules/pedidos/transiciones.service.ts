import { desc, eq } from 'drizzle-orm';
import { historialEstadoPedido, pedido } from '@foodhub/db';
import {
  MENSAJES_PEDIDO,
  motivoDeRechazoSuficiente,
  transicionValida,
  type EstadoPedido,
  type OrigenTransicion,
  type PedidoDetalle,
  type TipoUsuario,
} from '@foodhub/shared';
import { db } from '../../lib/db.js';
import { AppError, noEncontrado } from '../../middleware/error.middleware.js';
import { motivoCancelacionAplicable } from '../catalogo/catalogo.service.js';
import { obtenerMinutosDeCancelacion } from '../configuracion/parametrosSistema.service.js';
import { obtenerDetalle } from './pedidos.service.js';
import { todas } from './consultas.js';

/**
 * Cambios de estado del pedido (US-PED-03, US-PED-04, US-PED-05, US-PED-09).
 *
 * LAS CINCO OPERACIONES COMPARTEN EL MISMO ESQUELETO, y por eso viven juntas:
 *
 *   1. Se toma el pedido CON BLOQUEO DE FILA dentro de una transaccion.
 *   2. Se verifica que quien pide sea parte del pedido (404 si no lo es).
 *   3. Se verifica que el estado de origen sea el que la historia exige.
 *   4. Se valida la transicion contra `TRANSICIONES_PEDIDO`.
 *   5. Se actualiza el pedido y se escribe la fila del historial.
 *
 * El paso 1 no es adorno: sin `FOR UPDATE`, dos toques rapidos del boton
 * "Aceptar" -o el job de expiracion corriendo mientras el cocinero acepta-
 * leerian el mismo estado CREADO y escribirian dos transiciones, dejando dos
 * filas en la linea de tiempo para un unico cambio real. Con el bloqueo, la
 * segunda espera, vuelve a leer el estado ya cambiado y falla en el paso 3.
 *
 * El paso 5 nunca se hace por separado: `aplicarTransicion` actualiza la
 * cabecera y escribe el historial en la misma sentencia logica, porque un
 * pedido cuyo estado avanzo sin dejar rastro rompe la trazabilidad que pide el
 * cuarto punto de las reglas del modulo.
 */

type Transaccion = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Rol de quien provoca la transicion. El administrador no toca pedidos. */
type Parte = Extract<TipoUsuario, 'CLIENTE' | 'COCINERO'>;

/**
 * Toma el pedido y lo bloquea hasta el fin de la transaccion.
 *
 * La pertenencia se resuelve en el WHERE: un pedido ajeno "no existe" (404), no
 * "esta prohibido" (403). Mismo criterio que el resto del sistema, para no
 * confirmarle a nadie que ese numero de pedido existe.
 */
async function tomarPedido(
  tx: Transaccion,
  entrada: { pedidoId: string; usuarioId: string; rol: Parte },
) {
  const esPropio =
    entrada.rol === 'CLIENTE'
      ? eq(pedido.clientePedidoId, entrada.usuarioId)
      : eq(pedido.cocineroPedidoId, entrada.usuarioId);

  const [fila] = await tx
    .select({
      id: pedido.id,
      estado: pedido.estadoPedidoActual,
      fechaCreacion: pedido.fechaCreacion,
    })
    .from(pedido)
    .where(todas([eq(pedido.id, entrada.pedidoId), esPropio]))
    .limit(1)
    .for('update');

  if (!fila) throw noEncontrado('el pedido');
  return fila;
}

/**
 * Aplica una transicion ya autorizada: valida contra la maquina de estados,
 * actualiza la cabecera y deja la fila del historial.
 *
 * `camposExtra` es lo que cada historia agrega sobre la cabecera -el tiempo
 * comprometido al aceptar, el motivo y su origen al rechazar-. Va como
 * parametro y no como cinco funciones distintas para que la validacion de la
 * transicion sea imposible de saltear.
 */
async function aplicarTransicion(
  tx: Transaccion,
  entrada: {
    pedidoId: string;
    estadoActual: EstadoPedido;
    destino: EstadoPedido;
    origen: OrigenTransicion;
    usuarioResponsableId: string | null;
    motivo?: string | null;
    camposExtra?: Partial<typeof pedido.$inferInsert>;
  },
): Promise<void> {
  if (!transicionValida(entrada.estadoActual, entrada.destino)) {
    throw new AppError(
      409,
      MENSAJES_PEDIDO.transicionInvalida,
      'TRANSICION_INVALIDA',
    );
  }

  await tx
    .update(pedido)
    .set({
      estadoPedidoActual: entrada.destino,
      fechaUltimaTransicion: new Date(),
      ...entrada.camposExtra,
    })
    .where(eq(pedido.id, entrada.pedidoId));

  await tx.insert(historialEstadoPedido).values({
    pedidoId: entrada.pedidoId,
    estadoPedidoAnterior: entrada.estadoActual,
    estadoPedidoActual: entrada.destino,
    origenTransicion: entrada.origen,
    usuarioResponsableId: entrada.usuarioResponsableId,
    motivo: entrada.motivo ?? null,
  });
}

// ---------------------------------------------------------------------------
// US-PED-03 - Aceptar
// ---------------------------------------------------------------------------

/**
 * US-PED-03 - El cocinero acepta y compromete un tiempo de preparacion.
 *
 * "Cambie el estado interno del pedido a Aceptado y traslada la tarjeta del
 * pedido a la pestana Preparando."
 *
 * El tiempo estimado ya vino validado por `aceptarPedidoSchema` (obligatorio y
 * dentro de las opciones del selector): aceptar sin el es el quinto criterio de
 * la historia y se corta antes de llegar al servicio.
 */
export async function aceptarPedido(entrada: {
  cocineroId: string;
  pedidoId: string;
  tiempoEstimadoPreparacionMin: number;
}): Promise<PedidoDetalle> {
  await db.transaction(async (tx) => {
    const actual = await tomarPedido(tx, {
      pedidoId: entrada.pedidoId,
      usuarioId: entrada.cocineroId,
      rol: 'COCINERO',
    });

    await aplicarTransicion(tx, {
      pedidoId: actual.id,
      estadoActual: actual.estado,
      destino: 'ACEPTADO',
      origen: 'COCINERO',
      usuarioResponsableId: entrada.cocineroId,
      camposExtra: {
        tiempoEstimadoPreparacionMin: entrada.tiempoEstimadoPreparacionMin,
      },
    });
  });

  return obtenerDetalle({
    pedidoId: entrada.pedidoId,
    usuarioId: entrada.cocineroId,
    rol: 'COCINERO',
  });
}

// ---------------------------------------------------------------------------
// US-PED-05 - Listo y Completado
// ---------------------------------------------------------------------------

/**
 * US-PED-05 - El cocinero marca el pedido como listo para retirar.
 *
 * Ademas de avanzar el estado guarda `tiempoFinalPreparacionMin`: cuanto tardo
 * de verdad, medido entre la aceptacion y este momento. Es el dato que despues
 * alimenta el dashboard del cocinero (modulo DASH) y el unico momento en que se
 * puede calcular sin recorrer el historial.
 */
export async function marcarPedidoListo(entrada: {
  cocineroId: string;
  pedidoId: string;
}): Promise<PedidoDetalle> {
  await db.transaction(async (tx) => {
    const actual = await tomarPedido(tx, {
      pedidoId: entrada.pedidoId,
      usuarioId: entrada.cocineroId,
      rol: 'COCINERO',
    });

    await aplicarTransicion(tx, {
      pedidoId: actual.id,
      estadoActual: actual.estado,
      destino: 'LISTO',
      origen: 'COCINERO',
      usuarioResponsableId: entrada.cocineroId,
      camposExtra: {
        tiempoFinalPreparacionMin: await minutosDesdeLaAceptacion(
          tx,
          actual.id,
        ),
      },
    });
  });

  return obtenerDetalle({
    pedidoId: entrada.pedidoId,
    usuarioId: entrada.cocineroId,
    rol: 'COCINERO',
  });
}

/**
 * Minutos transcurridos desde que el cocinero acepto.
 *
 * Sale del historial y no de una columna de `pedido` porque la cabecera no
 * guarda cuando se acepto: `fecha_ultima_transicion` ya fue pisada por
 * cualquier cambio posterior. `null` si no encuentra el evento, caso que no
 * deberia darse -a LISTO solo se llega desde ACEPTADO- pero que no vale la pena
 * convertir en una excepcion: perder una metrica no justifica abortar la
 * entrega de un pedido.
 */
async function minutosDesdeLaAceptacion(
  tx: Transaccion,
  pedidoId: string,
): Promise<number | null> {
  const [evento] = await tx
    .select({ fecha: historialEstadoPedido.fechaTransicion })
    .from(historialEstadoPedido)
    .where(
      todas([
        eq(historialEstadoPedido.pedidoId, pedidoId),
        eq(historialEstadoPedido.estadoPedidoActual, 'ACEPTADO'),
      ]),
    )
    .orderBy(desc(historialEstadoPedido.fechaTransicion))
    .limit(1);

  if (!evento) return null;
  return Math.max(
    0,
    Math.round((Date.now() - evento.fecha.getTime()) / 60_000),
  );
}

/**
 * US-PED-05 - El cocinero confirma la entrega.
 *
 * El dialogo "Confirmar entrega?" con sus dos botones es responsabilidad de la
 * pantalla (PAN-PED-04.2): al servicio solo llega la confirmacion.
 */
export async function completarPedido(entrada: {
  cocineroId: string;
  pedidoId: string;
}): Promise<PedidoDetalle> {
  await db.transaction(async (tx) => {
    const actual = await tomarPedido(tx, {
      pedidoId: entrada.pedidoId,
      usuarioId: entrada.cocineroId,
      rol: 'COCINERO',
    });

    await aplicarTransicion(tx, {
      pedidoId: actual.id,
      estadoActual: actual.estado,
      destino: 'COMPLETADO',
      origen: 'COCINERO',
      usuarioResponsableId: entrada.cocineroId,
    });
  });

  return obtenerDetalle({
    pedidoId: entrada.pedidoId,
    usuarioId: entrada.cocineroId,
    rol: 'COCINERO',
  });
}

// ---------------------------------------------------------------------------
// US-PED-04 - Rechazar / US-PED-09 - Cancelar
// ---------------------------------------------------------------------------

/**
 * Motivo compuesto de una salida hacia RECHAZADO: el del catalogo, el texto
 * libre, o los dos.
 *
 * `motivoParaHistorial` deja en la linea de tiempo un texto legible para la
 * otra parte, que es lo que US-PED-04 pide registrar "en el historial del
 * pedido con el identificador del cocinero y la marca de tiempo". Cuando hay
 * las dos cosas se guardan juntas: el motivo rapido dice el que y el texto
 * libre el por que.
 */
async function resolverMotivo(entrada: {
  rol: Parte;
  motivoCancelacionId?: string | undefined;
  motivoTexto?: string | undefined;
}): Promise<{
  motivoCancelacionId: string | null;
  motivoTexto: string | null;
}> {
  // `|| null` y no `?? null`: un texto que quedo vacio despues del trim -por
  // ejemplo solo espacios- es lo mismo que no haber escrito nada, y `??` lo
  // dejaria pasar como cadena vacia hasta la columna.
  const texto = entrada.motivoTexto?.trim();
  const motivoTexto = texto === undefined || texto === '' ? null : texto;

  if (!entrada.motivoCancelacionId) {
    return { motivoCancelacionId: null, motivoTexto };
  }

  const aplicable = await motivoCancelacionAplicable(
    entrada.rol,
    entrada.motivoCancelacionId,
  );
  if (!aplicable) {
    throw new AppError(
      400,
      'El motivo seleccionado no es válido.',
      'MOTIVO_NO_APLICABLE',
    );
  }

  return { motivoCancelacionId: entrada.motivoCancelacionId, motivoTexto };
}

/**
 * US-PED-04 - El cocinero rechaza un pedido entrante.
 *
 * SOLO DESDE CREADO. El tercer criterio es explicito: "el sistema no permita la
 * accion de rechazo" sobre un pedido ya Aceptado o Listo, que "solo pueden
 * avanzar hacia Completado". `TRANSICIONES_PEDIDO` sí admite
 * ACEPTADO -> RECHAZADO porque el ciclo de vida del diagrama lo contempla, pero
 * ninguna historia autoriza hoy a nadie a provocarlo: la restriccion mas
 * estricta se aplica aca, donde se sabe quien la pide y desde donde.
 *
 * EL MOTIVO ES OBLIGATORIO y ya vino validado por `rechazarPedidoSchema`
 * (motivo del catalogo o al menos cinco palabras). Se vuelve a comprobar por si
 * alguna vez se llama al servicio desde otro lugar: la regla que protege al
 * cliente de un rechazo sin explicacion no puede depender de que el llamador
 * haya usado el schema correcto.
 */
export async function rechazarPedido(entrada: {
  cocineroId: string;
  pedidoId: string;
  motivoCancelacionId?: string | undefined;
  motivoTexto?: string | undefined;
}): Promise<PedidoDetalle> {
  if (!motivoDeRechazoSuficiente(entrada)) {
    throw new AppError(
      400,
      MENSAJES_PEDIDO.motivoRechazoRequerido,
      'MOTIVO_REQUERIDO',
    );
  }

  const motivo = await resolverMotivo({ rol: 'COCINERO', ...entrada });

  await db.transaction(async (tx) => {
    const actual = await tomarPedido(tx, {
      pedidoId: entrada.pedidoId,
      usuarioId: entrada.cocineroId,
      rol: 'COCINERO',
    });

    if (actual.estado !== 'CREADO') {
      throw new AppError(
        409,
        MENSAJES_PEDIDO.rechazoFueraDeEstado,
        'RECHAZO_FUERA_DE_ESTADO',
      );
    }

    await aplicarTransicion(tx, {
      pedidoId: actual.id,
      estadoActual: actual.estado,
      destino: 'RECHAZADO',
      origen: 'COCINERO',
      usuarioResponsableId: entrada.cocineroId,
      motivo: motivo.motivoTexto,
      camposExtra: {
        origenRechazo: 'COCINERO',
        motivoRechazo: motivo.motivoTexto,
        motivoCancelacionId: motivo.motivoCancelacionId,
        usuarioOrigenRechazoId: entrada.cocineroId,
      },
    });
  });

  return obtenerDetalle({
    pedidoId: entrada.pedidoId,
    usuarioId: entrada.cocineroId,
    rol: 'COCINERO',
  });
}

/**
 * US-PED-09 - El cliente cancela un pedido que el cocinero todavia no respondio.
 *
 * DOS CONDICIONES, Y LAS DOS SE VERIFICAN EN EL SERVIDOR:
 *
 *   Estado CREADO      "La cancelacion solo esta disponible para pedidos en
 *                      estado Creado" (ultimo criterio).
 *   Dentro del plazo   "siempre que no haya transcurrido el tiempo maximo de
 *                      cancelacion configurado en los parametros del sistema
 *                      (RF057). Superado ese tiempo, oculte el boton y, ante un
 *                      intento de cancelacion via API, responda: 'El tiempo para
 *                      cancelar este pedido ha expirado.'". El criterio nombra
 *                      explicitamente el intento por API: ocultar el boton no
 *                      alcanza.
 *
 * EL MOTIVO ES OPCIONAL, al reves que en el rechazo del cocinero: "El cliente
 * presiona 'Si, cancelar' en el dialogo (con o sin motivo ingresado)".
 *
 * El estado interno resultante es RECHAZADO -no hay un estado CANCELADO en el
 * ciclo de vida-; lo que distingue una cancelacion de un rechazo es
 * `origen_rechazo = 'CLIENTE'`, que es de donde sale la etiqueta "Cancelado por
 * vos" de US-PED-06.
 */
export async function cancelarPedido(entrada: {
  clienteId: string;
  pedidoId: string;
  motivoCancelacionId?: string | undefined;
  motivoTexto?: string | undefined;
}): Promise<PedidoDetalle> {
  const motivo = await resolverMotivo({ rol: 'CLIENTE', ...entrada });
  const minutosLimite = await obtenerMinutosDeCancelacion();

  await db.transaction(async (tx) => {
    const actual = await tomarPedido(tx, {
      pedidoId: entrada.pedidoId,
      usuarioId: entrada.clienteId,
      rol: 'CLIENTE',
    });

    if (actual.estado !== 'CREADO') {
      throw new AppError(
        409,
        MENSAJES_PEDIDO.cancelacionFueraDeEstado,
        'CANCELACION_FUERA_DE_ESTADO',
      );
    }

    const limite = actual.fechaCreacion.getTime() + minutosLimite * 60_000;
    if (Date.now() > limite) {
      throw new AppError(
        409,
        MENSAJES_PEDIDO.cancelacionExpirada,
        'CANCELACION_EXPIRADA',
      );
    }

    await aplicarTransicion(tx, {
      pedidoId: actual.id,
      estadoActual: actual.estado,
      destino: 'RECHAZADO',
      origen: 'CLIENTE',
      usuarioResponsableId: entrada.clienteId,
      motivo: motivo.motivoTexto,
      camposExtra: {
        origenRechazo: 'CLIENTE',
        motivoRechazo: motivo.motivoTexto,
        motivoCancelacionId: motivo.motivoCancelacionId,
        usuarioOrigenRechazoId: entrada.clienteId,
      },
    });
  });

  return obtenerDetalle({
    pedidoId: entrada.pedidoId,
    usuarioId: entrada.clienteId,
    rol: 'CLIENTE',
  });
}
