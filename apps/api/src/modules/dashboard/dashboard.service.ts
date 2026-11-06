import {
  and,
  asc,
  avg,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  lte,
  sql,
  type SQL,
} from 'drizzle-orm';
import {
  categoria,
  itemPedido,
  pedido,
  publicacion,
  resena,
  usuario,
} from '@foodhub/db';
import {
  granularidadDeEvolucion,
  type ActividadCocinero,
  type EvolucionPedidos,
  type EvolucionPlato,
  type RangoDashboard,
} from '@foodhub/shared';
import { db } from '../../lib/db.js';
import { noEncontrado } from '../../middleware/error.middleware.js';
import { todas } from '../pedidos/consultas.js';
import {
  aClienteRecurrente,
  aDistribucion,
  aFranjasHorarias,
  aPedidosAbiertos,
  aPedidosPorDiaSemana,
  aPlatoMasPedido,
  aResumen,
  completadosDelPlato,
  enElPeriodo,
  UNIDAD_DE_TRUNCADO,
  type FilaClienteRecurrente,
  type FilaDiaSemana,
  type FilaDistribucion,
  type FilaFranja,
  type FilaPlato,
} from './consultas.js';

/**
 * Modulo de Dashboard del cocinero (US-DASH-01 a US-DASH-05, RF042 a RF046).
 * Pantalla: PAN-DASH-01, "Mi actividad".
 *
 * SOLO LECTURA. El modulo no escribe nada ni define entidades propias: las
 * cuatro metricas se derivan de `pedido`, `item_pedido`, `publicacion`,
 * `usuario` y `resena` tal como estan. Por eso no hubo migracion.
 *
 * LAS SUMAS DE DINERO SE HACEN EN LA BASE, nunca en JavaScript. Los importes son
 * `numeric(12,2)` justamente para no acumular error de punto flotante, y
 * traerlos como `number` para sumarlos lo reintroduciria. Mismo criterio que
 * `totalDelPedido` en el modulo de Pedidos.
 */

/** `sum(precio * cantidad)` de las filas de `item_pedido` que entren en el join. */
const importeDeLosItems = sql<string>`coalesce(sum(${itemPedido.precioUnitarioSnapshot} * ${itemPedido.cantidad}), 0)::text`;

/** Unidades vendidas de un plato (US-DASH-02: se cuentan unidades, no pedidos). */
const unidadesVendidas = sql<string>`sum(${itemPedido.cantidad})`;

/** Pedidos distintos de un cliente, sin que el join con los items los duplique. */
const pedidosDistintos = countDistinct(pedido.id);

/**
 * Todo el dashboard de un cocinero para un periodo.
 *
 * OCHO CONSULTAS EN PARALELO Y UNA SOLA RESPUESTA. Las cuatro secciones
 * comparten el periodo y US-DASH-05 exige que se actualicen "de forma inmediata"
 * al cambiarlo: partirlas en cinco endpoints le daria a la pantalla cinco
 * estados de carga que el cocinero percibe como uno solo.
 *
 * `cocineroId` es el id de la sesion. `pedido.cocinero_pedido_id` apunta a
 * `cocinero.usuario_id`, que es el mismo valor que `usuario.id`, asi que no hace
 * falta resolver nada antes de consultar.
 */
export async function obtenerActividad(
  cocineroId: string,
  rango: RangoDashboard,
): Promise<ActividadCocinero> {
  const delPeriodo = enElPeriodo(cocineroId, rango);
  const completadosDelPeriodo = todas([
    delPeriodo,
    eq(pedido.estadoPedidoActual, 'COMPLETADO'),
  ]);

  const [
    totales,
    ventas,
    valoracion,
    platos,
    clientes,
    estadoDeLosPedidos,
    porDiaSemana,
    porFranja,
    evolucionPedidos,
  ] = await Promise.all([
    contarPedidos(delPeriodo),
    sumarVentas(completadosDelPeriodo),
    medirValoracion(cocineroId, rango),
    rankearPlatos(completadosDelPeriodo),
    buscarClientesRecurrentes(completadosDelPeriodo),
    distribuirPorEstado(delPeriodo),
    contarPorDiaSemana(delPeriodo, rango.zonaHoraria),
    contarPorFranjaHoraria(delPeriodo, rango.zonaHoraria),
    contarPorCubo(delPeriodo, rango),
  ]);

  return {
    resumen: aResumen({
      pedidosTotales: totales,
      ventasAcumuladas: ventas,
      promedioValoracion: valoracion.promedio,
      cantidadResenas: valoracion.cantidad,
    }),
    platosMasPedidos: platos.map(aPlatoMasPedido),
    clientesRecurrentes: clientes.map(aClienteRecurrente),
    distribucion: estadoDeLosPedidos.distribucion,
    pedidosAbiertos: estadoDeLosPedidos.abiertos,
    pedidosPorDiaSemana: aPedidosPorDiaSemana(porDiaSemana),
    franjasHorarias: aFranjasHorarias(porFranja),
    evolucionPedidos,
  };
}

/**
 * Evolución de un plato del cocinero en el período (corrección del 20/10/2026).
 *
 * LA PUBLICACIÓN SE BUSCA CON EL COCINERO DE LA SESIÓN EN EL `where`. El id
 * viaja en la URL, así que sin esa condición cualquier cocinero podría medir
 * las ventas de un plato ajeno cambiando el parámetro. Un plato de otro
 * responde 404 igual que uno inexistente: distinguirlos confirmaría que existe.
 *
 * Un plato dado de baja se sigue pudiendo consultar, igual que sigue en el
 * ranking: sus pedidos del período existieron.
 */
export async function obtenerEvolucionDePlato(
  cocineroId: string,
  publicacionId: string,
  rango: RangoDashboard,
): Promise<EvolucionPlato> {
  const [plato] = await db
    .select({ nombre: publicacion.nombre, activo: publicacion.activo })
    .from(publicacion)
    .where(
      and(
        eq(publicacion.id, publicacionId),
        eq(publicacion.cocineroId, cocineroId),
      ),
    )
    .limit(1);

  if (!plato) throw noEncontrado('el plato');

  const evolucion = await contarPorCubo(
    completadosDelPlato(cocineroId, publicacionId, rango),
    rango,
    { conItems: true },
  );

  return {
    publicacionId,
    nombre: plato.nombre,
    eliminado: !plato.activo,
    totalPedidos: evolucion.puntos.reduce((suma, p) => suma + p.cantidad, 0),
    evolucion,
  };
}

/**
 * Pedidos agrupados por día, semana o mes LOCAL del cocinero, según el largo
 * del rango (`granularidadDeEvolucion`).
 *
 * `count(distinct pedido.id)` Y NO `count(*)`: con `conItems` el join con
 * `item_pedido` repetiría un pedido por cada renglón, y aunque el filtro por
 * publicación deja uno, el mismo plato puede figurar en dos renglones.
 *
 * Mismo cuidado con la zona que `contarPorDiaSemana`: la unidad y la zona
 * viajan como parámetros y se agrupa por posición. Solo vuelven los cubos con
 * pedidos; los vacíos los completa la app con `serieDeEvolucion`.
 */
async function contarPorCubo(
  condicion: SQL,
  rango: RangoDashboard,
  opciones: { conItems?: boolean } = {},
): Promise<EvolucionPedidos> {
  const granularidad = granularidadDeEvolucion(rango.desde, rango.hasta);
  const inicio = sql<string>`to_char(date_trunc(${UNIDAD_DE_TRUNCADO[granularidad]}, ${pedido.fechaCreacion} at time zone ${rango.zonaHoraria}), 'YYYY-MM-DD')`;

  const base = db
    .select({ inicio, cantidad: pedidosDistintos })
    .from(pedido)
    .$dynamic();
  const consulta = opciones.conItems
    ? base.innerJoin(itemPedido, eq(itemPedido.pedidoId, pedido.id))
    : base;

  const filas = await consulta
    .where(condicion)
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  return {
    granularidad,
    puntos: filas.map((fila) => ({
      inicio: fila.inicio,
      cantidad: Number(fila.cantidad),
    })),
  };
}

/**
 * US-DASH-01 - "Pedidos totales (cantidad total de pedidos en el periodo)".
 *
 * CUENTA TODOS LOS ESTADOS, tambien los pedidos todavia abiertos. Es a proposito
 * que no coincida con `distribucion.total`, que solo suma los cuatro estados
 * cerrados de US-DASH-04: son dos preguntas distintas -cuanto trabajo entro y
 * como termino lo que cerro- y el criterio de cada historia define la suya.
 */
async function contarPedidos(
  condicion: ReturnType<typeof enElPeriodo>,
): Promise<number> {
  const [fila] = await db
    .select({ cantidad: count() })
    .from(pedido)
    .where(condicion);

  return fila?.cantidad ?? 0;
}

/** US-DASH-01 - "Monto total en pesos de los pedidos Completados en el periodo". */
async function sumarVentas(
  condicion: ReturnType<typeof enElPeriodo>,
): Promise<string> {
  const [fila] = await db
    .select({ total: importeDeLosItems })
    .from(pedido)
    .innerJoin(itemPedido, eq(itemPedido.pedidoId, pedido.id))
    .where(condicion);

  return fila?.total ?? '0';
}

/**
 * US-DASH-01 - "Promedio de estrellas recibidas en el periodo".
 *
 * Se apoya en `resena.cocinero_res_id`, la columna desnormalizada del schema, y
 * en el indice parcial `resena_cocinero_idx`, que ya lleva la condicion
 * `estado_resena = 'VISIBLE'`. Solo las resenas VISIBLE promedian: la moderacion
 * pasa una resena a OCULTA_MODERACION justamente para que deje de pesar en la
 * reputacion.
 *
 * El periodo se mide por `fecha_publicacion` de la resena y no por la fecha del
 * pedido: el criterio habla de las estrellas "recibidas en el periodo".
 */
async function medirValoracion(
  cocineroId: string,
  rango: RangoDashboard,
): Promise<{ promedio: string | null; cantidad: number }> {
  const [fila] = await db
    .select({ promedio: avg(resena.calificacion), cantidad: count() })
    .from(resena)
    .where(
      and(
        eq(resena.cocineroResId, cocineroId),
        eq(resena.estadoResena, 'VISIBLE'),
        gte(resena.fechaPublicacion, new Date(rango.desde)),
        lte(resena.fechaPublicacion, new Date(rango.hasta)),
      ),
    );

  return { promedio: fila?.promedio ?? null, cantidad: fila?.cantidad ?? 0 };
}

/**
 * US-DASH-02 - Ranking de platos por unidades vendidas.
 *
 * Sin limite: el criterio pide el listado completo y es la pantalla la que
 * muestra los primeros cinco hasta que el cocinero toca "Ver todos". El largo
 * esta acotado por el catalogo del propio cocinero.
 *
 * Los datos del plato salen de `publicacion` y no de los snapshots de
 * `item_pedido` porque el criterio pide el "precio actual". Un plato dado de
 * baja sigue apareciendo: `item_pedido.publicacion_id` es `on delete restrict`,
 * de modo que la fila referenciada existe siempre y `activo = false` es lo unico
 * que cambia.
 *
 * El desempate por nombre no es cosmetico: sin un segundo criterio, dos platos
 * con las mismas unidades pueden intercambiar posiciones entre dos cargas y
 * parecer que el ranking se mueve solo.
 */
async function rankearPlatos(
  condicion: ReturnType<typeof enElPeriodo>,
): Promise<FilaPlato[]> {
  return db
    .select({
      publicacionId: publicacion.id,
      nombre: publicacion.nombre,
      imagenUrl: publicacion.imagenUrl,
      precioActual: publicacion.precio,
      activo: publicacion.activo,
      categoriaId: categoria.id,
      categoriaNombre: categoria.nombre,
      categoriaImagenUrl: categoria.imagenPredeterminadaUrl,
      vecesPedido: unidadesVendidas,
    })
    .from(itemPedido)
    .innerJoin(pedido, eq(pedido.id, itemPedido.pedidoId))
    .innerJoin(publicacion, eq(publicacion.id, itemPedido.publicacionId))
    .innerJoin(categoria, eq(categoria.id, publicacion.categoriaId))
    .where(condicion)
    .groupBy(publicacion.id, categoria.id)
    .orderBy(desc(unidadesVendidas), asc(publicacion.nombre));
}

/**
 * US-DASH-03 - "Clientes que realizaron mas de un pedido Completado".
 *
 * EL CONTEO ES `count(distinct pedido.id)` Y NO `count(*)`: el join con
 * `item_pedido` -necesario para sumar el monto- multiplica cada pedido por su
 * cantidad de platos, y un unico pedido de tres platos pasaria por tres pedidos.
 * La suma de dinero, en cambio, se calcula bien sobre ese mismo join.
 *
 * El `having` es lo que implementa "mas de un pedido". Una cuenta eliminada
 * sigue apareciendo: la metrica historica del cocinero no depende de que el
 * cliente siga en la plataforma. `aClienteRecurrente` es quien le saca la
 * identidad.
 */
async function buscarClientesRecurrentes(
  condicion: ReturnType<typeof enElPeriodo>,
): Promise<FilaClienteRecurrente[]> {
  return db
    .select({
      clienteId: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      fotoPerfilUrl: usuario.fotoPerfilUrl,
      cuentaEliminada: sql<boolean>`${usuario.estadoCuenta} = 'ELIMINADA'`,
      cantidadPedidos: pedidosDistintos,
      montoTotal: importeDeLosItems,
    })
    .from(pedido)
    .innerJoin(itemPedido, eq(itemPedido.pedidoId, pedido.id))
    .innerJoin(usuario, eq(usuario.id, pedido.clientePedidoId))
    .where(condicion)
    .groupBy(usuario.id)
    .having(sql`${pedidosDistintos} > 1`)
    .orderBy(desc(pedidosDistintos), asc(usuario.nombre));
}

/**
 * US-DASH-04 - Un solo GROUP BY para los cuatro cubos.
 *
 * Se agrupa por estado Y por origen del rechazo porque los tres rotulos de
 * cierre negativo -rechazado, cancelado, expirado- son el MISMO estado interno
 * RECHAZADO abierto por `origen_rechazo`. `aDistribucion` hace la traduccion.
 *
 * De la misma pasada sale `pedidosAbiertos`: la pantalla lo necesita para
 * explicar por que `resumen.pedidosTotales` puede ser mayor que el total del
 * grafico, y una segunda consulta podria leer un instante distinto.
 */
async function distribuirPorEstado(
  condicion: ReturnType<typeof enElPeriodo>,
): Promise<{
  distribucion: ReturnType<typeof aDistribucion>;
  abiertos: number;
}> {
  const filas: FilaDistribucion[] = await db
    .select({
      estado: pedido.estadoPedidoActual,
      origenRechazo: pedido.origenRechazo,
      cantidad: count(),
    })
    .from(pedido)
    .where(condicion)
    .groupBy(pedido.estadoPedidoActual, pedido.origenRechazo);

  return {
    distribucion: aDistribucion(filas),
    abiertos: aPedidosAbiertos(filas),
  };
}

/**
 * Pedidos por dia de la semana, con `isodow` (1 = lunes, 7 = domingo).
 *
 * LA SEMANA ES LA DEL COCINERO, NO LA DEL SERVIDOR. `fecha_creacion` es
 * `timestamptz`: agruparla sin convertir manda un pedido de las 23 h de
 * Argentina al dia siguiente. La zona llega del dispositivo, validada por
 * `rangoDashboardSchema`, y viaja como parametro, nunca interpolada.
 *
 * El `GROUP BY 1` es por posicion y no repitiendo la expresion: con una zona
 * parametrizada, repetirla manda un placeholder nuevo y Postgres deja de
 * reconocer la del SELECT como la misma.
 */
async function contarPorDiaSemana(
  condicion: ReturnType<typeof enElPeriodo>,
  zonaHoraria: string,
): Promise<FilaDiaSemana[]> {
  const dia = sql<number>`extract(isodow from (${pedido.fechaCreacion} at time zone ${zonaHoraria}))::integer`;

  const filas = await db
    .select({ diaNumero: dia, cantidad: count() })
    .from(pedido)
    .where(condicion)
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  return filas.map((fila) => ({
    diaNumero: Number(fila.diaNumero),
    cantidad: Number(fila.cantidad),
  }));
}

/**
 * Pedidos por franja horaria de CUATRO HORAS, en la zona del cocinero:
 *
 *   MANANA     07 a 10     ALMUERZO  11 a 14     TARDE  15 a 18
 *   CENA       19 a 22     NOCHE     23 a 02     MADRUGADA  03 a 06
 *
 * Todas miden lo mismo a proposito. La version anterior dejaba a NOCHE con 12
 * horas -y le sumaba la manana-, asi que el "turno pico" terminaba siendo el
 * ancho del cubo y no la demanda.
 *
 * La hora se calcula UNA vez y el CASE la reutiliza; el `GROUP BY 1` evita
 * repetir la expresion completa con su parametro.
 */
async function contarPorFranjaHoraria(
  condicion: ReturnType<typeof enElPeriodo>,
  zonaHoraria: string,
): Promise<FilaFranja[]> {
  const hora = sql<number>`extract(hour from (${pedido.fechaCreacion} at time zone ${zonaHoraria}))::integer`;

  const franja = sql<string>`
    case
      when ${hora} between 7 and 10 then 'MANANA'
      when ${hora} between 11 and 14 then 'ALMUERZO'
      when ${hora} between 15 and 18 then 'TARDE'
      when ${hora} between 19 and 22 then 'CENA'
      when ${hora} >= 23 or ${hora} <= 2 then 'NOCHE'
      else 'MADRUGADA'
    end
  `;

  const filas = await db
    .select({ franja, cantidad: count() })
    .from(pedido)
    .where(condicion)
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  return filas.map((fila) => ({
    franja: fila.franja as FilaFranja['franja'],
    cantidad: Number(fila.cantidad),
  }));
}
