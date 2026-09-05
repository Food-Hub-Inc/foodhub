import { and, eq, max, sql, type SQL } from 'drizzle-orm';
import {
  historialEstadoPedido,
  itemPedido,
  pedido,
  publicacion,
  resena,
  usuario,
} from '@foodhub/db';
import {
  MENSAJES_RESENA,
  type AutorResena,
  type PlatoResenado,
  type ResenaPublica,
  type RespuestaCocinero,
  type SocialDeResena,
  type TipoReaccion,
  type TipoResena,
} from '@foodhub/shared';
import { db } from '../../lib/db.js';

/**
 * Vocabulario SQL del modulo de Resenas.
 *
 * TODO EL DERECHO A OPINAR SE RESUELVE CONTRA EL HISTORIAL, NO CONTRA LA
 * CABECERA DEL PEDIDO. `pedido.estado_pedido_actual` dice donde esta el pedido
 * HOY; lo que habilita a resenar o a calificar es haber PASADO por un estado,
 * que es un hecho del pasado y no se puede deshacer. La diferencia importa en
 * los dos sentidos:
 *
 *   US-RES-02  el cocinero califica al cliente desde que el pedido alcanzo
 *              ACEPTADO "aun cuando posteriormente sea cancelado". Mirando la
 *              cabecera, un pedido aceptado y despues cancelado figura como
 *              RECHAZADO y el cocinero perderia el derecho justo en el caso
 *              que la historia quiere cubrir: dejar constancia del
 *              incumplimiento.
 *   US-RES-01  el cliente resena un plato de un pedido COMPLETADO, y ese es un
 *              estado terminal: para el la cabecera alcanzaria. Se resuelve
 *              igual contra el historial porque ademas hace falta la FECHA de
 *              completado -de ella dependen los dos plazos del modulo- y esa
 *              solo esta ahi: `fecha_ultima_transicion` la pisa cualquier
 *              cambio posterior.
 */

/** Une condiciones en un `AND`, con el tipo estrechado a `SQL`. Igual que en Pedidos. */
export function todas(condiciones: SQL[]): SQL {
  return and(...condiciones)!;
}

// ---------------------------------------------------------------------------
// Derecho a opinar
// ---------------------------------------------------------------------------

/**
 * Fecha en que se completo, por ultima vez, un pedido de este cliente que
 * incluia esta publicacion. `null` si no hay ninguno.
 *
 * ES EL DATO CENTRAL DEL MODULO: de el dependen los dos plazos.
 *
 *   crear   se puede hasta `resena_limite_dias_para_resenar` dias despues.
 *   editar  la ventana de 48 horas se reabre desde esta fecha cada vez que un
 *           pedido nuevo con el mismo plato se completa.
 *
 * Se toma el MAXIMO y no el primero: un cliente que pidio el mismo plato tres
 * veces tiene derecho a opinar sobre la ultima experiencia, no sobre la
 * primera.
 *
 * SE USA EL `max` DE DRIZZLE Y NO UN `sql<Date>` ESCRITO A MANO. La plantilla
 * `sql<T>` es una AFIRMACION de tipo, no una conversion: el compilador cree lo
 * que se le declara y el driver igual devuelve el `timestamp` como string, con
 * lo cual `.getTime()` revienta recien en ejecucion. `max()` conoce la columna y
 * aplica su mapeador, asi que el `Date` que promete el tipo es el que llega.
 */
export async function ultimoCompletadoDelPlato(entrada: {
  clienteId: string;
  publicacionId: string;
}): Promise<Date | null> {
  const [fila] = await db
    .select({
      fecha: max(historialEstadoPedido.fechaTransicion),
    })
    .from(itemPedido)
    .innerJoin(pedido, eq(pedido.id, itemPedido.pedidoId))
    .innerJoin(
      historialEstadoPedido,
      todas([
        eq(historialEstadoPedido.pedidoId, pedido.id),
        eq(historialEstadoPedido.estadoPedidoActual, 'COMPLETADO'),
      ]),
    )
    .where(
      todas([
        eq(itemPedido.publicacionId, entrada.publicacionId),
        eq(pedido.clientePedidoId, entrada.clienteId),
      ]),
    );

  return fila?.fecha ?? null;
}

/**
 * `true` si el cocinero tuvo con ese cliente al menos un pedido que ALCANZO el
 * estado ACEPTADO (US-RES-02).
 *
 * "Alcanzo" y no "esta en": ver la nota de la cabecera de este archivo.
 */
export async function hubopedidoAceptado(entrada: {
  cocineroId: string;
  clienteId: string;
}): Promise<boolean> {
  const [fila] = await db
    .select({ existe: sql<number>`1` })
    .from(pedido)
    .innerJoin(
      historialEstadoPedido,
      todas([
        eq(historialEstadoPedido.pedidoId, pedido.id),
        eq(historialEstadoPedido.estadoPedidoActual, 'ACEPTADO'),
      ]),
    )
    .where(
      todas([
        eq(pedido.cocineroPedidoId, entrada.cocineroId),
        eq(pedido.clientePedidoId, entrada.clienteId),
      ]),
    )
    .limit(1);

  return fila !== undefined;
}

/**
 * `true` si el cliente tuvo con ese cocinero al menos un pedido que ALCANZO el
 * estado COMPLETADO (US-RES-07).
 *
 * ES POR COCINERO Y NO POR PEDIDO, y ahi estaba el defecto que esta correccion
 * revierte: la resena al cocinero se anclaba al pedido, con lo cual un cliente
 * podia dejar una por cada pedido y multiplicar su peso sobre la reputacion.
 * El pedido solo habilita; la resena es una sola por cocinero.
 *
 * Alcanza con que exista UNO: no interesa cual ni cuando, solo el derecho.
 */
export async function existePedidoCompletadoConCocinero(entrada: {
  clienteId: string;
  cocineroId: string;
}): Promise<boolean> {
  const [fila] = await db
    .select({ existe: sql<number>`1` })
    .from(pedido)
    .innerJoin(
      historialEstadoPedido,
      todas([
        eq(historialEstadoPedido.pedidoId, pedido.id),
        eq(historialEstadoPedido.estadoPedidoActual, 'COMPLETADO'),
      ]),
    )
    .where(
      todas([
        eq(pedido.clientePedidoId, entrada.clienteId),
        eq(pedido.cocineroPedidoId, entrada.cocineroId),
      ]),
    )
    .limit(1);

  return fila !== undefined;
}

/**
 * Pedidos COMPLETADOS que acumula un cliente en toda la plataforma.
 *
 * Es el umbral de "Cliente nuevo" (US-RES-02). Cuenta pedidos, no
 * calificaciones recibidas: un cliente puede tener diez pedidos y ninguna
 * calificacion, y aun asi no es nuevo.
 *
 * Se cuenta sobre la cabecera y no sobre el historial porque COMPLETADO es
 * terminal: un pedido que llego ahi se queda ahi, con lo cual las dos lecturas
 * coinciden y la cabecera esta cubierta por `pedido_cliente_idx`.
 */
export async function pedidosCompletadosDelCliente(
  clienteId: string,
): Promise<number> {
  const [fila] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(pedido)
    .where(
      todas([
        eq(pedido.clientePedidoId, clienteId),
        eq(pedido.estadoPedidoActual, 'COMPLETADO'),
      ]),
    );

  return fila?.total ?? 0;
}

// ---------------------------------------------------------------------------
// Identidad de lo que se muestra
// ---------------------------------------------------------------------------

/**
 * Columnas de una resena, cualquiera sea su tipo.
 *
 * `nombrePlato` y `publicacionActiva` NO son columnas de `resena`: salen del
 * LEFT JOIN con `publicacion` y son `null` salvo en las de tipo PLATO. El join
 * tiene que ser LEFT y no INNER justamente por eso -una resena a un cocinero o
 * a un cliente no tiene plato-, y con INNER esas filas desaparecerian del
 * listado sin dar ningun error.
 *
 * La baja de un plato es logica: la resena sobrevive y sigue promediando, pero
 * deja de tener a donde enlazar.
 */
export const columnasResena = {
  id: resena.id,
  tipoResena: resena.tipoResena,
  publicacionId: resena.publicacionId,
  calificacion: resena.calificacion,
  comentario: resena.comentario,
  tags: resena.tags,
  fotoUrl: resena.fotoUrl,
  editada: resena.editada,
  fechaPublicacion: resena.fechaPublicacion,
  nombrePlato: publicacion.nombre,
  publicacionActiva: publicacion.activo,
  autorId: usuario.id,
  autorNombre: usuario.nombre,
  autorApellido: usuario.apellido,
  autorFotoPerfilUrl: usuario.fotoPerfilUrl,
  autorEstadoCuenta: usuario.estadoCuenta,
};

export interface FilaResena {
  id: string;
  tipoResena: TipoResena;
  publicacionId: string | null;
  calificacion: number;
  comentario: string | null;
  tags: string[] | null;
  fotoUrl: string | null;
  editada: boolean;
  fechaPublicacion: Date;
  nombrePlato: string | null;
  publicacionActiva: boolean | null;
  autorId: string;
  autorNombre: string;
  autorApellido: string;
  autorFotoPerfilUrl: string | null;
  autorEstadoCuenta: string;
}

/**
 * Lo que se le agrega a una fila para armar la resena publica completa.
 *
 * VIAJA APARTE DE `FilaResena` porque no sale de la misma consulta ni tiene el
 * mismo alcance: `FilaResena` describe la resena, y esto describe la relacion
 * del USUARIO DE LA SESION con ella. La misma resena da un `contexto` distinto
 * para cada persona que la mira, y esa diferencia se pierde si se mezclan.
 */
export interface ContextoDeResena {
  meGusta: number;
  noMeGusta: number;
  miReaccion: TipoReaccion | null;
  respuesta: RespuestaCocinero | null;
  esMia: boolean;
  reportadaPorMi: boolean;
}

/** Contexto de una resena que nadie tocó todavía, para los casos sin agregados. */
export const CONTEXTO_VACIO: ContextoDeResena = {
  meGusta: 0,
  noMeGusta: 0,
  miReaccion: null,
  respuesta: null,
  esMia: false,
  reportadaPorMi: false,
};

/**
 * Identidad del autor, o el anonimo de la cuenta dada de baja.
 *
 * US-RES-04 lo fija para las reacciones -"muestre el autor como 'Usuario
 * eliminado'"- y aplica igual al listado: la baja es logica, la resena sigue
 * contando para el promedio y lo unico que desaparece es quien la escribio.
 *
 * Funcion PURA: la decision se prueba sin base.
 */
export function aAutor(fila: FilaResena): AutorResena {
  if (fila.autorEstadoCuenta === 'ELIMINADA') {
    return { id: null, nombre: 'Usuario eliminado', fotoPerfilUrl: null };
  }
  return {
    id: fila.autorId,
    nombre: `${fila.autorNombre} ${fila.autorApellido}`.trim(),
    fotoPerfilUrl: fila.autorFotoPerfilUrl,
  };
}

/**
 * El plato resenado, o `null` si esta resena no es sobre un plato.
 *
 * Funcion PURA. Devuelve `null` en dos casos que conviene no confundir: la
 * resena no es de tipo PLATO -no hay plato del que hablar-, y la resena es de
 * plato pero el join no trajo la publicacion, que no deberia pasar y por eso
 * se trata igual que la ausencia en vez de romper el listado entero.
 */
export function aPlatoResenado(fila: FilaResena): PlatoResenado | null {
  if (fila.tipoResena !== 'PLATO') return null;
  if (fila.publicacionId === null || fila.nombrePlato === null) return null;

  const activa = fila.publicacionActiva ?? false;
  return {
    publicacionId: fila.publicacionId,
    nombre: activa ? fila.nombrePlato : MENSAJES_RESENA.platoNoDisponible,
    enlaceHabilitado: activa,
  };
}

/**
 * La conversacion publica alrededor de la resena, o `null` si su tipo no la
 * admite.
 *
 * LAS RESENAS A UN CLIENTE NO LA TIENEN: el cliente no las ve, asi que no hay
 * reacciones, respuesta ni reporte que mostrar. Devolver `null` -y no un
 * objeto en cero- es lo que le permite a la tarjeta no dibujar el pie social
 * en vez de dibujarlo vacio.
 */
export function aSocialDeResena(
  fila: FilaResena,
  contexto: ContextoDeResena,
): SocialDeResena | null {
  if (fila.tipoResena === 'CLIENTE') return null;

  return {
    reacciones: {
      meGusta: contexto.meGusta,
      noMeGusta: contexto.noMeGusta,
      mia: contexto.miReaccion,
    },
    respuesta: contexto.respuesta,
    reportadaPorMi: contexto.reportadaPorMi,
  };
}

/** Mapeador PURO de una fila al contrato publico de la resena. */
export function aResenaPublica(
  fila: FilaResena,
  contexto: ContextoDeResena = CONTEXTO_VACIO,
): ResenaPublica {
  return {
    id: fila.id,
    tipo: fila.tipoResena,
    autor: aAutor(fila),
    plato: aPlatoResenado(fila),
    calificacion: fila.calificacion,
    comentario: fila.comentario,
    tags: fila.tags ?? [],
    fotoUrl: fila.fotoUrl,
    editada: fila.editada,
    fechaPublicacion: fila.fechaPublicacion.toISOString(),
    social: aSocialDeResena(fila, contexto),
    esMia: contexto.esMia,
  };
}
