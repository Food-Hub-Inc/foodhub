import { asc, desc, eq, inArray, sql } from 'drizzle-orm';
import {
  carrito,
  historialEstadoPedido,
  itemCarrito,
  itemPedido,
  motivoCancelacion,
  pedido,
  usuario,
} from '@foodhub/db';
import {
  ESTADOS_POR_PESTANA_CLIENTE,
  ESTADOS_POR_PESTANA_COCINERO,
  MENSAJES_EXPLORACION,
  MENSAJES_PEDIDO,
  type ContadoresPedido,
  type EstadoPedido,
  type EventoPedido,
  type FiltrosPedidoCliente,
  type FiltrosPedidoCocinero,
  type FiltrosPedidosConCliente,
  type PaginaPedidos,
  type PedidoDetalle,
  type TipoUsuario,
} from '@foodhub/shared';
import { db } from '../../lib/db.js';
import { subconsultaValoracionPorCocinero } from '../../lib/valoraciones.js';
import { AppError, noEncontrado } from '../../middleware/error.middleware.js';
import { depurarYLimpiar } from '../exploracion/carrito.service.js';
import { obtenerMinutosDeCancelacion } from '../configuracion/parametrosSistema.service.js';
import {
  aItemPedido,
  aPedidoResumen,
  agruparItemsPorPedido,
  clienteTienePlatosSinResenar,
  cocineroNoCalificoAlCliente,
  columnasParticipante,
  columnasPedido,
  contarPorEstado,
  leerItemsDePedidos,
  pedidosDelCliente,
  pedidosDelCocinero,
  siguienteNumeroPedido,
  subconsultaValoracionPorCliente,
  todas,
  type FilaPedido,
} from './consultas.js';

/**
 * Modulo de Pedidos — alta y lectura (US-PED-01, US-PED-02, US-PED-06,
 * US-PED-07, US-PED-08).
 *
 * Los cambios de estado viven en `transiciones.service.ts`: son cinco
 * operaciones que comparten la misma maquinaria de validacion y trazabilidad, y
 * mezclarlas con las consultas haria de este archivo el mas largo del
 * repositorio sin que ninguna de las dos mitades ganara nada.
 */

/**
 * La conexion dentro de una transaccion de Drizzle. Las funciones auxiliares la
 * reciben por parametro en lugar de usar `db`: con `db` sus sentencias saldrian
 * por otra conexion del pool y quedarian FUERA de la transaccion.
 */
type Transaccion = Parameters<Parameters<typeof db.transaction>[0]>[0];

// ---------------------------------------------------------------------------
// US-PED-01 - Confirmar pedido
// ---------------------------------------------------------------------------

/**
 * Confirma el pedido a partir del carrito del cliente (PAN-PED-01).
 *
 * "Registre el pedido en el sistema con estado interno Creado, genere un numero
 * de pedido unico (formato FH-XXXXX), vacie el carrito y redirija al cliente a
 * la pantalla de seguimiento en tiempo real del pedido."
 *
 * EL CLIENTE NO APORTA NI PLATOS NI PRECIOS. Todo sale del carrito, que es
 * unico por cliente (`carrito_cliente_uq`): asi es imposible confirmar un pedido
 * con un precio manipulado o mezclando cocineros.
 *
 * LOS PRECIOS SE COPIAN DEL CARRITO, NO DE LA PUBLICACION VIGENTE (decision del
 * equipo, 2026-08-19). El carrito ya guarda su propio snapshot del momento en
 * que el cliente agrego cada plato, y ese es el importe que la pantalla le
 * mostro al presionar "Confirmar pedido"; releer el precio actual podria
 * cobrarle un total distinto del que acepto.
 *
 * TODO PASA EN UNA TRANSACCION. Sin ella, dos toques rapidos del boton crean dos
 * pedidos con el mismo carrito, o el carrito queda vacio con el pedido a medio
 * escribir.
 */
export async function confirmarPedido(entrada: {
  clienteId: string;
  instruccionesCliente?: string | undefined;
}): Promise<PedidoDetalle> {
  const { clienteId } = entrada;

  /*
   * Primero la depuracion del carrito, y FUERA de la transaccion: US-EXP-07
   * exige quitar los platos que dejaron de estar disponibles "al ingresar al
   * carrito o al intentar confirmar el pedido". Si algo se quito se corta aca,
   * con el mismo aviso que muestra el carrito, en lugar de registrar un pedido
   * al que le falta lo que el cliente creia estar pidiendo: la app refresca la
   * pantalla y el cliente vuelve a decidir.
   */
  const itemsQuitados = await depurarYLimpiar(clienteId);
  if (itemsQuitados.length > 0) {
    throw new AppError(
      409,
      MENSAJES_EXPLORACION.itemQuitadoPorNoDisponible,
      'ITEMS_NO_DISPONIBLES',
    );
  }

  const pedidoId = await db.transaction(async (tx) => {
    const [cabecera] = await tx
      .select({ id: carrito.id, cocineroId: carrito.cocineroId })
      .from(carrito)
      .where(eq(carrito.clienteId, clienteId))
      .limit(1);

    if (!cabecera) {
      throw new AppError(
        409,
        MENSAJES_PEDIDO.carritoVacioAlConfirmar,
        'CARRITO_VACIO',
      );
    }

    await exigirCocineroDisponible(tx, cabecera.cocineroId);

    const lineas = await tx
      .select({
        publicacionId: itemCarrito.publicacionId,
        cantidad: itemCarrito.cantidad,
        precioUnitarioSnapshot: itemCarrito.precioUnitarioSnapshot,
        nombrePlatoSnapshot: itemCarrito.nombrePlatoSnapshot,
        imagenSnapshot: itemCarrito.imagenSnapshot,
      })
      .from(itemCarrito)
      .where(eq(itemCarrito.carritoId, cabecera.id));

    if (lineas.length === 0) {
      throw new AppError(
        409,
        MENSAJES_PEDIDO.carritoVacioAlConfirmar,
        'CARRITO_VACIO',
      );
    }

    const [creado] = await tx
      .insert(pedido)
      .values({
        numeroPedido: siguienteNumeroPedido,
        clientePedidoId: clienteId,
        cocineroPedidoId: cabecera.cocineroId,
        estadoPedidoActual: 'CREADO',
        instruccionesCliente: entrada.instruccionesCliente ?? null,
      })
      .returning({ id: pedido.id });

    if (!creado) throw new Error('No se pudo registrar el pedido.');

    await tx.insert(itemPedido).values(
      lineas.map((linea) => ({
        pedidoId: creado.id,
        publicacionId: linea.publicacionId,
        cantidad: linea.cantidad,
        precioUnitarioSnapshot: linea.precioUnitarioSnapshot,
        nombrePlatoSnapshot: linea.nombrePlatoSnapshot,
        imagenSnapshot: linea.imagenSnapshot,
      })),
    );

    /*
     * La primera fila del historial no tiene estado anterior: el pedido no
     * viene de ningun lado. Es la que alimenta el evento "Recibido" de la linea
     * de tiempo (US-PED-07) con su horario.
     */
    await tx.insert(historialEstadoPedido).values({
      pedidoId: creado.id,
      estadoPedidoAnterior: null,
      estadoPedidoActual: 'CREADO',
      origenTransicion: 'CLIENTE',
      usuarioResponsableId: clienteId,
    });

    // "Vacie el carrito de forma automatica". Se borra el carrito y no solo sus
    // items: el estado vacio de PAN-PED-01.1 es la ausencia de carrito, mismo
    // criterio que el resto del modulo de carrito.
    await tx.delete(carrito).where(eq(carrito.id, cabecera.id));

    return creado.id;
  });

  return obtenerDetalle({ pedidoId, usuarioId: clienteId, rol: 'CLIENTE' });
}

/**
 * El cocinero sigue en condiciones de recibir pedidos.
 *
 * Se verifica al confirmar y no antes porque el carrito se deja intacto aunque
 * el cocinero sea suspendido mientras existe (ver `leerCarrito`): una suspension
 * puede revertirse (US-GURP-08) y vaciarle el carrito al cliente por algo
 * temporal seria destruir su seleccion sin que la pidiera.
 */
async function exigirCocineroDisponible(
  tx: Transaccion,
  cocineroId: string,
): Promise<void> {
  const [perfil] = await tx
    .select({ estadoCuenta: usuario.estadoCuenta })
    .from(usuario)
    .where(eq(usuario.id, cocineroId))
    .limit(1);

  if (perfil?.estadoCuenta !== 'ACTIVA') {
    throw new AppError(
      409,
      MENSAJES_PEDIDO.cocineroNoDisponible,
      'COCINERO_NO_DISPONIBLE',
    );
  }
}

// ---------------------------------------------------------------------------
// US-PED-06 y US-PED-08 - Los dos historiales
// ---------------------------------------------------------------------------

/**
 * US-PED-06 - Historial del cliente (PAN-PED-05).
 *
 * Tres pestanas: "En curso" (CREADO, ACEPTADO o LISTO), "Completados" y
 * "Rechazados". Que la primera este seleccionada al entrar lo resuelve el
 * `.default('EN_CURSO')` del schema de filtros, no la pantalla.
 *
 * El participante es el COCINERO y su reputacion sale de las resenas que
 * recibio (US-RES-01).
 */
export async function listarPedidosDelCliente(
  clienteId: string,
  filtros: FiltrosPedidoCliente,
): Promise<PaginaPedidos> {
  const valoracion = subconsultaValoracionPorCocinero();
  const estados = [...ESTADOS_POR_PESTANA_CLIENTE[filtros.pestana]];

  const filas = await db
    .select({
      ...columnasPedido,
      ...columnasParticipante,
      participanteValoracion: valoracion.promedio,
      puedeCalificar: sql<boolean>`(
        ${pedido.estadoPedidoActual} = 'COMPLETADO'
        and ${clienteTienePlatosSinResenar(clienteId)}
      )`,
    })
    .from(pedido)
    .innerJoin(usuario, eq(usuario.id, pedido.cocineroPedidoId))
    .leftJoin(valoracion.tabla, eq(valoracion.tabla.cocineroId, usuario.id))
    .where(
      todas([
        pedidosDelCliente(clienteId),
        inArray(pedido.estadoPedidoActual, estados),
      ]),
    )
    .orderBy(desc(pedido.fechaCreacion))
    .limit(filtros.porPagina + 1)
    .offset((filtros.pagina - 1) * filtros.porPagina);

  return armarPagina({
    filas,
    clienteIdParaResenas: clienteId,
    pagina: filtros.pagina,
    porPagina: filtros.porPagina,
    contadores: await contarPorEstado(pedidosDelCliente(clienteId)),
  });
}

/**
 * US-PED-08 - Bandeja e historial del cocinero (PAN-PED-04).
 *
 * Cinco pestanas, una por estado interno. "Los pedidos mas recientes deben
 * aparecer primero" (tercer criterio), que es el orden de los dos listados.
 *
 * El participante es el CLIENTE y su reputacion sale de las calificaciones que
 * le pusieron los cocineros (US-RES-02), no de las resenas de platos.
 */
export async function listarPedidosDelCocinero(
  cocineroId: string,
  filtros: FiltrosPedidoCocinero,
): Promise<PaginaPedidos> {
  const valoracion = subconsultaValoracionPorCliente();
  const estados = [...ESTADOS_POR_PESTANA_COCINERO[filtros.pestana]];

  const filas = await db
    .select({
      ...columnasPedido,
      ...columnasParticipante,
      participanteValoracion: valoracion.promedio,
      puedeCalificar: sql<boolean>`(
        ${pedido.estadoPedidoActual} = 'COMPLETADO'
        and ${cocineroNoCalificoAlCliente}
      )`,
    })
    .from(pedido)
    .innerJoin(usuario, eq(usuario.id, pedido.clientePedidoId))
    .leftJoin(valoracion.tabla, eq(valoracion.tabla.clienteId, usuario.id))
    .where(
      todas([
        pedidosDelCocinero(cocineroId),
        inArray(pedido.estadoPedidoActual, estados),
      ]),
    )
    .orderBy(desc(pedido.fechaCreacion))
    .limit(filtros.porPagina + 1)
    .offset((filtros.pagina - 1) * filtros.porPagina);

  return armarPagina({
    filas,
    clienteIdParaResenas: null,
    pagina: filtros.pagina,
    porPagina: filtros.porPagina,
    contadores: await contarPorEstado(pedidosDelCocinero(cocineroId)),
  });
}

/**
 * US-DASH-03 - Historial de un cliente con el cocinero de la sesion.
 *
 * ES LA SOLAPA "SUS PEDIDOS" DEL PERFIL DEL CLIENTE. El cuarto criterio pide
 * "el historial de pedidos realizados a ese cocinero", asi que el filtro son
 * las dos partes a la vez: sin `pedidosDelCocinero` un cocinero veria lo que
 * ese cliente le pidio a la competencia.
 *
 * SIN PESTANA Y CON TODOS LOS ESTADOS, a diferencia de la bandeja: aca no se
 * esta despachando sino reconstruyendo una relacion, y un pedido rechazado o
 * cancelado dice tanto de un cliente como uno completado.
 *
 * `clienteIdParaResenas` va en `null` porque quien mira es el cocinero: la
 * marca de "ya resenado" es del cliente sobre sus platos y no aplica.
 */
export async function listarPedidosConCliente(entrada: {
  cocineroId: string;
  clienteId: string;
  filtros: FiltrosPedidosConCliente;
}): Promise<PaginaPedidos> {
  const { cocineroId, clienteId, filtros } = entrada;
  const valoracion = subconsultaValoracionPorCliente();

  const delPar = todas([
    pedidosDelCocinero(cocineroId),
    eq(pedido.clientePedidoId, clienteId),
  ]);

  const filas = await db
    .select({
      ...columnasPedido,
      ...columnasParticipante,
      participanteValoracion: valoracion.promedio,
      puedeCalificar: sql<boolean>`(
        ${pedido.estadoPedidoActual} = 'COMPLETADO'
        and ${cocineroNoCalificoAlCliente}
      )`,
    })
    .from(pedido)
    .innerJoin(usuario, eq(usuario.id, pedido.clientePedidoId))
    .leftJoin(valoracion.tabla, eq(valoracion.tabla.clienteId, usuario.id))
    .where(delPar)
    .orderBy(desc(pedido.fechaCreacion))
    .limit(filtros.porPagina + 1)
    .offset((filtros.pagina - 1) * filtros.porPagina);

  return armarPagina({
    filas,
    clienteIdParaResenas: null,
    pagina: filtros.pagina,
    porPagina: filtros.porPagina,
    contadores: await contarPorEstado(delPar),
  });
}

/**
 * Convierte las filas leidas en la pagina del contrato.
 *
 * Los items de TODA la pagina se traen con un unico `IN`: una consulta por
 * tarjeta seria el problema N+1 de manual con veinte pedidos en pantalla.
 *
 * `hayMas` sale de haber pedido un registro de mas y descartarlo, en lugar de
 * contar el total: el scroll infinito solo necesita saber si existe una pagina
 * siguiente. Los contadores de las pestanas si son totales, pero salen del
 * GROUP BY de `contarPorEstado` y no de esta consulta.
 */
async function armarPagina(entrada: {
  filas: FilaPedido[];
  clienteIdParaResenas: string | null;
  pagina: number;
  porPagina: number;
  contadores: ContadoresPedido;
}): Promise<PaginaPedidos> {
  const hayMas = entrada.filas.length > entrada.porPagina;
  const visibles = hayMas
    ? entrada.filas.slice(0, entrada.porPagina)
    : entrada.filas;

  const items = await leerItemsDePedidos(
    visibles.map((fila) => fila.id),
    entrada.clienteIdParaResenas,
  );
  const porPedido = agruparItemsPorPedido(items);

  return {
    datos: visibles.map((fila) =>
      aPedidoResumen(fila, porPedido.get(fila.id) ?? []),
    ),
    pagina: entrada.pagina,
    porPagina: entrada.porPagina,
    hayMas,
    contadores: entrada.contadores,
  };
}

// ---------------------------------------------------------------------------
// US-PED-07 - Detalle
// ---------------------------------------------------------------------------

/**
 * Detalle completo de un pedido (PAN-PED-06 para el cliente, PAN-PED-04.4 y
 * PAN-PED-04.6 para el cocinero).
 *
 * MISMO ENDPOINT PARA LOS DOS ROLES. Lo unico que cambia es a quien se muestra
 * como "participante" y que queda por calificar; los items, la linea de tiempo,
 * el total y el motivo son identicos, y duplicar el endpoint abriria la puerta a
 * que una version mostrara un dato que la otra no.
 *
 * UN PEDIDO AJENO RESPONDE 404 Y NO 403: mismo criterio que el resto del
 * sistema, para no confirmarle a nadie que ese numero de pedido existe. La
 * pertenencia se comprueba en el WHERE y no despues de leer.
 */
export async function obtenerDetalle(entrada: {
  pedidoId: string;
  usuarioId: string;
  rol: Extract<TipoUsuario, 'CLIENTE' | 'COCINERO'>;
}): Promise<PedidoDetalle> {
  const esCliente = entrada.rol === 'CLIENTE';

  const fila = esCliente
    ? await leerCabeceraParaCliente(entrada.pedidoId, entrada.usuarioId)
    : await leerCabeceraParaCocinero(entrada.pedidoId, entrada.usuarioId);

  if (!fila) throw noEncontrado('el pedido');

  const [items, historial] = await Promise.all([
    leerItemsDePedidos([fila.id], esCliente ? entrada.usuarioId : null),
    leerHistorial(fila.id),
  ]);

  /*
   * La fecha de aceptacion sale de la linea de tiempo y no de una columna: el
   * historial ya esta leido y `pedido` no guarda cuando se acepto. Es lo que
   * necesita `rangoHorarioEstimado` para el "Estimado 14:05 - 14:15 hs" del
   * seguimiento (US-PED-02).
   */
  const aceptacion =
    historial.find((evento) => evento.estado === 'ACEPTADO')?.fecha ?? null;

  return {
    ...aPedidoResumen(fila, items),
    items: items.map(aItemPedido),
    instruccionesCliente: fila.instruccionesCliente,
    tiempoEstimadoPreparacionMin: fila.tiempoEstimadoPreparacionMin,
    fechaAceptacion: aceptacion,
    motivoRechazo: fila.motivoRechazo,
    motivoCancelacion: fila.motivoCancelacion,
    historial,
    puedeCancelar: esCliente ? await puedeCancelar(fila) : false,
  };
}

/**
 * Columnas que el detalle agrega sobre la tarjeta. Se declaran una sola vez
 * porque las dos lecturas -la del cliente y la del cocinero- traen exactamente
 * lo mismo y solo difieren en el join del participante.
 */
const columnasDetalle = {
  instruccionesCliente: pedido.instruccionesCliente,
  tiempoEstimadoPreparacionMin: pedido.tiempoEstimadoPreparacionMin,
  motivoRechazo: pedido.motivoRechazo,
  motivoCancelacion: motivoCancelacion.nombre,
};

async function leerCabeceraParaCliente(pedidoId: string, clienteId: string) {
  const valoracion = subconsultaValoracionPorCocinero();

  const [fila] = await db
    .select({
      ...columnasPedido,
      ...columnasParticipante,
      ...columnasDetalle,
      participanteValoracion: valoracion.promedio,
      puedeCalificar: sql<boolean>`(
        ${pedido.estadoPedidoActual} = 'COMPLETADO'
        and ${clienteTienePlatosSinResenar(clienteId)}
      )`,
    })
    .from(pedido)
    .innerJoin(usuario, eq(usuario.id, pedido.cocineroPedidoId))
    .leftJoin(valoracion.tabla, eq(valoracion.tabla.cocineroId, usuario.id))
    .leftJoin(
      motivoCancelacion,
      eq(motivoCancelacion.id, pedido.motivoCancelacionId),
    )
    .where(todas([eq(pedido.id, pedidoId), pedidosDelCliente(clienteId)]))
    .limit(1);

  return fila;
}

async function leerCabeceraParaCocinero(pedidoId: string, cocineroId: string) {
  const valoracion = subconsultaValoracionPorCliente();

  const [fila] = await db
    .select({
      ...columnasPedido,
      ...columnasParticipante,
      ...columnasDetalle,
      participanteValoracion: valoracion.promedio,
      puedeCalificar: sql<boolean>`(
        ${pedido.estadoPedidoActual} = 'COMPLETADO'
        and ${cocineroNoCalificoAlCliente}
      )`,
    })
    .from(pedido)
    .innerJoin(usuario, eq(usuario.id, pedido.clientePedidoId))
    .leftJoin(valoracion.tabla, eq(valoracion.tabla.clienteId, usuario.id))
    .leftJoin(
      motivoCancelacion,
      eq(motivoCancelacion.id, pedido.motivoCancelacionId),
    )
    .where(todas([eq(pedido.id, pedidoId), pedidosDelCocinero(cocineroId)]))
    .limit(1);

  return fila;
}

/**
 * El cliente todavia esta a tiempo de cancelar (US-PED-09, primer criterio).
 *
 * "Muestre el boton Cancelar pedido visible y habilitado, siempre que no haya
 * transcurrido el tiempo maximo de cancelacion configurado en los parametros del
 * sistema (RF057)."
 *
 * LO DECIDE EL SERVIDOR Y NO LA APP: el limite sale de `configuracion_sistema` y
 * se mide contra el reloj del servidor. Con el reloj del telefono, adelantar la
 * hora del dispositivo alcanzaria para ocultar o resucitar el boton.
 */
async function puedeCancelar(fila: {
  estado: EstadoPedido;
  fechaCreacion: Date;
}): Promise<boolean> {
  if (fila.estado !== 'CREADO') return false;

  const minutos = await obtenerMinutosDeCancelacion();
  const limite = fila.fechaCreacion.getTime() + minutos * 60_000;
  return Date.now() <= limite;
}

/** US-PED-07 - Linea de tiempo cronologica del pedido. */
export async function leerHistorial(pedidoId: string): Promise<EventoPedido[]> {
  const filas = await db
    .select({
      id: historialEstadoPedido.id,
      estadoAnterior: historialEstadoPedido.estadoPedidoAnterior,
      estado: historialEstadoPedido.estadoPedidoActual,
      origen: historialEstadoPedido.origenTransicion,
      motivo: historialEstadoPedido.motivo,
      fecha: historialEstadoPedido.fechaTransicion,
    })
    .from(historialEstadoPedido)
    .where(eq(historialEstadoPedido.pedidoId, pedidoId))
    .orderBy(asc(historialEstadoPedido.fechaTransicion));

  return filas.map((fila) => ({
    id: fila.id,
    estadoAnterior: fila.estadoAnterior,
    estado: fila.estado,
    origen: fila.origen,
    motivo: fila.motivo,
    fecha: fila.fecha.toISOString(),
  }));
}
