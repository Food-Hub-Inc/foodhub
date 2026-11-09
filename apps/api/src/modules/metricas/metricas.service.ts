import { and, count, desc, eq, gte, lt, lte, ne, sql } from 'drizzle-orm';
import { pedido, publicacion, registroAuditoria, usuario } from '@foodhub/db';
import {
  ESTADO_PEDIDO,
  TIPO_USUARIO,
  variacionPorcentual,
  type ConsultaMetricas,
  type EstadoPedido,
  type MetricasAdmin,
  type TipoUsuario,
} from '@foodhub/shared';
import { db } from '../../lib/db.js';

/**
 * Métricas generales del panel — US-ADM-05, RF052 y RF053 (PAN-ADM-03).
 *
 * SOLO LECTURA y sin entidades propias: todo se deriva de `usuario`,
 * `publicacion`, `pedido` y `registro_auditoria`, como el dashboard del
 * cocinero. Las consultas van en paralelo y vuelven en una sola respuesta: el
 * cambio de período actualiza toda la pantalla de una vez.
 */

/** Cuántas filas trae la tabla "Actividad reciente" del mockup. */
const FILAS_DE_ACTIVIDAD = 5;

/** Una cuenta dada de baja ya no es un usuario registrado (baja lógica). */
const cuentaVigente = ne(usuario.estadoCuenta, 'ELIMINADA');

async function contarUsuarios(filtro: ReturnType<typeof and>) {
  const [fila] = await db
    .select({ total: count() })
    .from(usuario)
    .where(filtro);
  return fila?.total ?? 0;
}

async function contarPublicacionesActivas(antesDe?: Date) {
  const [fila] = await db
    .select({ total: count() })
    .from(publicacion)
    .where(
      and(
        eq(publicacion.activo, true),
        antesDe ? lt(publicacion.fechaCreacion, antesDe) : undefined,
      ),
    );
  return fila?.total ?? 0;
}

async function contarCompletados(desde: Date, hasta: Date) {
  const [fila] = await db
    .select({ total: count() })
    .from(pedido)
    .where(
      and(
        eq(pedido.estadoPedidoActual, 'COMPLETADO'),
        gte(pedido.fechaCreacion, desde),
        lte(pedido.fechaCreacion, hasta),
      ),
    );
  return fila?.total ?? 0;
}

/**
 * Los KPI al día y lo que valían al inicio del período.
 *
 * "Lo que valían" se reconstruye por fecha de alta: las cuentas y
 * publicaciones vigentes hoy que ya existían entonces. Es una aproximación —no
 * hay historial de suspensiones ni de bajas—, pero es la única que el modelo
 * permite sin inventar una tabla de snapshots.
 */
async function indicadores(
  desde: Date,
  hasta: Date,
): Promise<MetricasAdmin['kpis']> {
  const activo = eq(usuario.estadoCuenta, 'ACTIVA');
  const cocinero = eq(usuario.tipo, 'COCINERO');
  const antes = lt(usuario.fechaRegistro, desde);

  // El período anterior tiene la misma duración y termina donde empieza éste.
  const duracion = hasta.getTime() - desde.getTime();
  const desdeAnterior = new Date(desde.getTime() - duracion);

  const [
    usuarios,
    usuariosAntes,
    cocineros,
    cocinerosAntes,
    publicaciones,
    publicacionesAntes,
    completados,
    completadosAntes,
  ] = await Promise.all([
    contarUsuarios(activo),
    contarUsuarios(and(activo, antes)),
    contarUsuarios(and(activo, cocinero)),
    contarUsuarios(and(activo, cocinero, antes)),
    contarPublicacionesActivas(),
    contarPublicacionesActivas(desde),
    contarCompletados(desde, hasta),
    contarCompletados(desdeAnterior, new Date(desde.getTime() - 1)),
  ]);

  const kpi = (valor: number, anterior: number) => ({
    valor,
    variacion: variacionPorcentual(valor, anterior),
  });

  return {
    usuariosActivos: kpi(usuarios, usuariosAntes),
    cocinerosActivos: kpi(cocineros, cocinerosAntes),
    pedidosCompletados: kpi(completados, completadosAntes),
    publicacionesActivas: kpi(publicaciones, publicacionesAntes),
  };
}

async function usuariosPorRol(): Promise<MetricasAdmin['usuariosPorRol']> {
  const filas = await db
    .select({ tipo: usuario.tipo, total: count() })
    .from(usuario)
    .where(cuentaVigente)
    .groupBy(usuario.tipo);

  // Todos los roles presentes aunque valgan cero: la torta y su leyenda no
  // pueden depender de que haya al menos un administrador cargado.
  const porRol = Object.fromEntries(
    TIPO_USUARIO.map((tipo) => [tipo, 0]),
  ) as Record<TipoUsuario, number>;
  for (const fila of filas) porRol[fila.tipo] = fila.total;
  return porRol;
}

async function pedidosDelPeriodo(
  desde: Date,
  hasta: Date,
): Promise<MetricasAdmin['pedidos']> {
  const filas = await db
    .select({ estado: pedido.estadoPedidoActual, total: count() })
    .from(pedido)
    .where(
      and(gte(pedido.fechaCreacion, desde), lte(pedido.fechaCreacion, hasta)),
    )
    .groupBy(pedido.estadoPedidoActual);

  const porEstado = Object.fromEntries(
    ESTADO_PEDIDO.map((estado) => [estado, 0]),
  ) as Record<EstadoPedido, number>;
  let total = 0;
  for (const fila of filas) {
    porEstado[fila.estado] = fila.total;
    total += fila.total;
  }
  return { total, porEstado };
}

/**
 * Pedidos por día CALENDARIO en la zona horaria del administrador. Solo vuelven
 * los días con pedidos; el cliente completa el resto en cero al armar las
 * barras (`agruparSerieDePedidos`).
 *
 * `zonaHoraria` llega validada por el schema (Intl la reconoce) y viaja como
 * parámetro, nunca interpolada en el texto del SQL.
 */
async function serieDiaria(
  desde: Date,
  hasta: Date,
  zonaHoraria: string,
): Promise<MetricasAdmin['serie']> {
  const dia = sql<string>`to_char(${pedido.fechaCreacion} at time zone ${zonaHoraria}, 'YYYY-MM-DD')`;

  const filas = await db
    .select({
      fecha: dia,
      pedidos: count(),
      completados:
        sql<number>`count(*) filter (where ${pedido.estadoPedidoActual} = 'COMPLETADO')`.mapWith(
          Number,
        ),
    })
    .from(pedido)
    .where(
      and(gte(pedido.fechaCreacion, desde), lte(pedido.fechaCreacion, hasta)),
    )
    // Por posición y no repitiendo `dia`: cada repetición manda la zona como
    // un parámetro nuevo ($1, $4, $5) y Postgres ya no reconoce la expresión
    // del SELECT como la misma del GROUP BY.
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  return filas;
}

async function actividadReciente(): Promise<
  MetricasAdmin['actividadReciente']
> {
  const filas = await db
    .select({
      id: registroAuditoria.id,
      operacion: registroAuditoria.operacion,
      tipoObjeto: registroAuditoria.tipoObjeto,
      usuarioEmail: usuario.email,
      fechaHora: registroAuditoria.fechaHora,
    })
    .from(registroAuditoria)
    .leftJoin(usuario, eq(usuario.id, registroAuditoria.usuarioId))
    .orderBy(desc(registroAuditoria.fechaHora))
    .limit(FILAS_DE_ACTIVIDAD);

  return filas.map((fila) => ({
    ...fila,
    fechaHora: fila.fechaHora.toISOString(),
  }));
}

export async function obtenerMetricas(
  consulta: ConsultaMetricas,
): Promise<MetricasAdmin> {
  const desde = new Date(consulta.desde);
  const hasta = new Date(consulta.hasta);

  const [kpis, porRol, pedidos, serie, actividad] = await Promise.all([
    indicadores(desde, hasta),
    usuariosPorRol(),
    pedidosDelPeriodo(desde, hasta),
    serieDiaria(desde, hasta, consulta.zonaHoraria),
    actividadReciente(),
  ]);

  return {
    kpis,
    usuariosPorRol: porRol,
    pedidos,
    serie,
    actividadReciente: actividad,
  };
}
