import { and, asc, avg, count, eq, inArray, sql, type SQL } from 'drizzle-orm';
import {
  calificacionACliente,
  itemPedido,
  pedido,
  resena,
  usuario,
} from '@foodhub/db';
import type {
  ContadoresPedido,
  EstadoPedido,
  ItemPedido,
  OrigenTransicion,
  PedidoResumen,
} from '@foodhub/shared';
import { db } from '../../lib/db.js';
import { aValoracion } from '../../lib/valoraciones.js';

/**
 * Vocabulario SQL del modulo de Pedidos.
 *
 * Los dos historiales -el del cliente (US-PED-06) y el del cocinero
 * (US-PED-08)- dibujan la MISMA tarjeta con la otra parte del pedido: uno ve al
 * cocinero y el otro al cliente. Las consultas se escriben una sola vez y se
 * parametrizan por que columna del pedido hace de "participante", en lugar de
 * duplicar cada listado con los joins invertidos.
 */

/** Une condiciones en un `AND`, con el tipo estrechado a `SQL`. */
export function todas(condiciones: SQL[]): SQL {
  return and(...condiciones)!;
}

// ---------------------------------------------------------------------------
// Numero visible del pedido
// ---------------------------------------------------------------------------

/**
 * Siguiente numero de pedido, con el formato "FH-00001" que fija RF022.
 *
 * Lo entrega la secuencia `pedido_numero_seq` (migracion 0009) y no un
 * `max(numero) + 1`: `nextval` es atomico y no bloquea, mientras que calcularlo
 * leyendo la tabla abriria una carrera entre dos clientes que confirman a la
 * vez y el indice unico de `numero_pedido` la convertiria en un error visible.
 *
 * `lpad` a cinco digitos: el formato del documento es "prefijo FH- seguido de un
 * secuencial de cinco digitos con ceros a la izquierda". Pasado el pedido
 * 99.999 el numero crece a seis digitos en lugar de reiniciarse; perder la
 * unicidad seria peor que perder el ancho fijo.
 */
export const siguienteNumeroPedido = sql<string>`'FH-' || lpad(nextval('pedido_numero_seq')::text, 5, '0')`;

// ---------------------------------------------------------------------------
// Reputacion de cada parte
// ---------------------------------------------------------------------------

/**
 * Promedio de las calificaciones que los cocineros le pusieron a cada cliente
 * (US-RES-02).
 *
 * Es el equivalente, en el sentido inverso, de
 * `subconsultaValoracionPorCocinero`: lo necesita PAN-PED-04.6, donde el
 * cocinero ve "datos del cliente (foto, nombre, calificacion promedio)" antes de
 * decidir. Vive aca y no en `lib/valoraciones.ts` porque, por ahora, el unico
 * modulo que muestra la reputacion de un cliente es este.
 */
export function subconsultaValoracionPorCliente() {
  const tabla = db
    .select({
      clienteId: calificacionACliente.clienteEvaluadoId,
      promedio: avg(calificacionACliente.calificacion).as(
        'valoracion_promedio',
      ),
      cantidad: count().as('cantidad_calificaciones'),
    })
    .from(calificacionACliente)
    .groupBy(calificacionACliente.clienteEvaluadoId)
    .as('valoracion_por_cliente');

  return { tabla, promedio: tabla.promedio };
}

// ---------------------------------------------------------------------------
// Que queda por calificar
// ---------------------------------------------------------------------------

/**
 * El cliente todavia tiene algo que resenar de este pedido (US-PED-06,
 * US-PED-07).
 *
 * LA RESENA ES POR PLATO, NO POR PEDIDO (US-RES-01, cambio del 2026-08-18), asi
 * que "el pedido ya tiene resena" no es una pregunta directa: se traduce a "no
 * queda ningun plato del pedido sin resenar por este cliente". Con la lectura
 * contraria -alcanza con haber resenado uno- un pedido de tres platos ocultaria
 * el boton despues del primero y los otros dos no se podrian calificar nunca.
 *
 * No filtra por `estado_resena`: el indice `resena_cliente_publicacion_uq` no
 * deja insertar una segunda resena del mismo cliente y plato aunque la primera
 * se haya ocultado o retirado, asi que lo que corresponde es editarla y no
 * ofrecer "Dejar resena" de nuevo.
 */
export function clienteTienePlatosSinResenar(clienteId: string): SQL<boolean> {
  return sql<boolean>`exists (
    select 1
      from ${itemPedido}
     where ${itemPedido.pedidoId} = ${pedido.id}
       and not exists (
         select 1
           from ${resena}
          where ${resena.publicacionId} = ${itemPedido.publicacionId}
            and ${resena.clienteResId} = ${clienteId}
       )
  )`;
}

/**
 * El cocinero todavia no califico al cliente de este pedido (US-PED-08).
 *
 * La calificacion es UNA POR PAR cocinero-cliente
 * (`calificacion_cocinero_uq`), no una por pedido: si el cocinero ya califico a
 * ese cliente en un pedido anterior, el boton "Calificar cliente" no vuelve a
 * aparecer, y lo que corresponde es editar la calificacion que ya existe.
 */
export const cocineroNoCalificoAlCliente = sql<boolean>`not exists (
  select 1
    from ${calificacionACliente}
   where ${calificacionACliente.cocineroEvaluadorId} = ${pedido.cocineroPedidoId}
     and ${calificacionACliente.clienteEvaluadoId} = ${pedido.clientePedidoId}
)`;

/**
 * Total del pedido, sumado EN LA BASE.
 *
 * Sumar en JavaScript obligaria a convertir los `numeric` a `number` y
 * reintroduciria el error de punto flotante que esa columna fue elegida para
 * evitar. Mismo criterio que el total del carrito.
 */
export const totalDelPedido = sql<string>`(
  select coalesce(sum(${itemPedido.precioUnitarioSnapshot} * ${itemPedido.cantidad}), 0)::text
    from ${itemPedido}
   where ${itemPedido.pedidoId} = ${pedido.id}
)`;

// ---------------------------------------------------------------------------
// Columnas y mapeo
// ---------------------------------------------------------------------------

/** Columnas de la cabecera del pedido, comunes a la tarjeta y al detalle. */
export const columnasPedido = {
  id: pedido.id,
  numeroPedido: pedido.numeroPedido,
  estado: pedido.estadoPedidoActual,
  origenRechazo: pedido.origenRechazo,
  fechaCreacion: pedido.fechaCreacion,
  fechaUltimaTransicion: pedido.fechaUltimaTransicion,
  total: totalDelPedido,
};

/** Identidad de la otra parte, sea el cliente o el cocinero. */
export const columnasParticipante = {
  participanteId: usuario.id,
  participanteNombre: usuario.nombre,
  participanteApellido: usuario.apellido,
  participanteFotoPerfilUrl: usuario.fotoPerfilUrl,
};

export interface FilaPedido {
  id: string;
  numeroPedido: string;
  estado: EstadoPedido;
  origenRechazo: OrigenTransicion | null;
  fechaCreacion: Date;
  fechaUltimaTransicion: Date;
  total: string;
  participanteId: string;
  participanteNombre: string;
  participanteApellido: string;
  participanteFotoPerfilUrl: string | null;
  participanteValoracion: string | null;
  puedeCalificar: boolean;
}

/** Una linea del pedido, ya con su snapshot congelado. */
export interface FilaItem {
  id: string;
  pedidoId: string;
  publicacionId: string;
  nombre: string;
  precioUnitario: string;
  cantidad: number;
  imagenUrl: string | null;
  yaResenado: boolean;
}

/**
 * Lee los items de varios pedidos de una sola vez.
 *
 * Un `IN` con todos los ids de la pagina y no una consulta por pedido: la
 * bandeja del cocinero muestra hasta veinte tarjetas y una consulta por tarjeta
 * seria el problema N+1 de manual.
 *
 * EL ORDEN NO ES EL DE SELECCION. US-PED-06 pide que la tarjeta muestre "el
 * primero que fue seleccionado" cuando el pedido tiene varios platos, pero ni
 * `item_carrito` ni `item_pedido` guardan cuando se agrego cada uno y su id es
 * aleatorio: el orden de insercion no es recuperable. Se ordena por nombre,
 * igual que el carrito, de modo que el "primer plato" que ve el cliente en la
 * tarjeta sea EL MISMO que encabezaba su carrito al confirmar. Es un orden
 * estable y coherente entre las dos pantallas, que es lo que el criterio busca.
 */
export async function leerItemsDePedidos(
  pedidoIds: string[],
  clienteIdParaResenas: string | null,
): Promise<FilaItem[]> {
  if (pedidoIds.length === 0) return [];

  const yaResenado = clienteIdParaResenas
    ? sql<boolean>`exists (
        select 1 from ${resena}
         where ${resena.publicacionId} = ${itemPedido.publicacionId}
           and ${resena.clienteResId} = ${clienteIdParaResenas}
      )`
    : sql<boolean>`false`;

  return db
    .select({
      id: itemPedido.id,
      pedidoId: itemPedido.pedidoId,
      publicacionId: itemPedido.publicacionId,
      nombre: itemPedido.nombrePlatoSnapshot,
      precioUnitario: itemPedido.precioUnitarioSnapshot,
      cantidad: itemPedido.cantidad,
      imagenUrl: itemPedido.imagenSnapshot,
      yaResenado,
    })
    .from(itemPedido)
    .where(inArray(itemPedido.pedidoId, pedidoIds))
    .orderBy(asc(itemPedido.nombrePlatoSnapshot), asc(itemPedido.id));
}

/** Mapeador PURO de una linea del pedido al contrato publico. */
export function aItemPedido(fila: FilaItem): ItemPedido {
  return {
    id: fila.id,
    publicacionId: fila.publicacionId,
    nombre: fila.nombre,
    precioUnitario: fila.precioUnitario,
    cantidad: fila.cantidad,
    imagenUrl: fila.imagenUrl,
    yaResenado: fila.yaResenado,
  };
}

/**
 * Mapeador PURO de una fila de pedido a la tarjeta de los listados.
 *
 * Recibe los items del pedido ya leidos en vez de consultarlos: sin acceso a
 * `db` la funcion se prueba sola, y ademas es lo que permite resolver toda la
 * pagina con dos consultas en lugar de una por tarjeta.
 */
export function aPedidoResumen(
  fila: FilaPedido,
  items: readonly FilaItem[],
): PedidoResumen {
  const primero = items[0];

  return {
    id: fila.id,
    numeroPedido: fila.numeroPedido,
    estado: fila.estado,
    origenRechazo: fila.origenRechazo,
    total: fila.total,
    cantidadItems: items.length,
    primerItem: {
      // Un pedido siempre tiene al menos un item: el carrito no se puede
      // confirmar vacio y `item_pedido` es ON DELETE CASCADE del pedido, nunca
      // se borra por su cuenta. El fallback existe para que el tipo cierre sin
      // un `!`, no porque el caso sea alcanzable.
      nombre: primero?.nombre ?? '',
      imagenUrl: primero?.imagenUrl ?? null,
      cantidad: primero?.cantidad ?? 1,
    },
    participante: {
      id: fila.participanteId,
      nombre: fila.participanteNombre,
      apellido: fila.participanteApellido,
      fotoPerfilUrl: fila.participanteFotoPerfilUrl,
      valoracionPromedio: aValoracion(fila.participanteValoracion),
    },
    fechaCreacion: fila.fechaCreacion.toISOString(),
    fechaUltimaTransicion: fila.fechaUltimaTransicion.toISOString(),
    puedeCalificar: fila.puedeCalificar,
  };
}

/** Agrupa las lineas por pedido, conservando el orden en que llegaron. */
export function agruparItemsPorPedido(
  items: readonly FilaItem[],
): Map<string, FilaItem[]> {
  const porPedido = new Map<string, FilaItem[]>();
  for (const item of items) {
    const lista = porPedido.get(item.pedidoId);
    if (lista) lista.push(item);
    else porPedido.set(item.pedidoId, [item]);
  }
  return porPedido;
}

// ---------------------------------------------------------------------------
// Contadores de las pestanas
// ---------------------------------------------------------------------------

/** Contadores en cero, punto de partida del conteo. */
export function contadoresVacios(): ContadoresPedido {
  return { CREADO: 0, ACEPTADO: 0, LISTO: 0, COMPLETADO: 0, RECHAZADO: 0 };
}

/**
 * Cuantos pedidos tiene cada estado, para los contadores de las pestanas
 * (US-PED-03: "cada pestana muestre un contador con la cantidad de pedidos en
 * ese estado").
 *
 * Un solo GROUP BY para las cinco pestanas, cubierto por `pedido_cliente_idx` o
 * `pedido_cocinero_idx` segun quien consulte. La alternativa -una consulta por
 * pestana- multiplicaria por cinco el costo de dibujar un encabezado.
 */
export async function contarPorEstado(
  condicionDePertenencia: SQL,
): Promise<ContadoresPedido> {
  const filas = await db
    .select({ estado: pedido.estadoPedidoActual, cantidad: count() })
    .from(pedido)
    .where(condicionDePertenencia)
    .groupBy(pedido.estadoPedidoActual);

  const contadores = contadoresVacios();
  for (const fila of filas) contadores[fila.estado] = fila.cantidad;
  return contadores;
}

/** Los pedidos de un cliente. */
export function pedidosDelCliente(clienteId: string): SQL {
  return eq(pedido.clientePedidoId, clienteId);
}

/** Los pedidos recibidos por un cocinero. */
export function pedidosDelCocinero(cocineroId: string): SQL {
  return eq(pedido.cocineroPedidoId, cocineroId);
}
