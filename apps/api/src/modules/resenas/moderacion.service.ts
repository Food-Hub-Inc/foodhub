import {
  asc,
  count,
  countDistinct,
  desc,
  eq,
  inArray,
  min,
  ne,
  sql,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { publicacion, reporteResena, resena, usuario } from '@foodhub/db';
import {
  RESENAS_POR_PAGINA,
  type PaginaReportes,
  type ReporteModeracion,
  type ResolucionAnterior,
} from '@foodhub/shared';
import { db } from '../../lib/db.js';
import { noEncontrado } from '../../middleware/error.middleware.js';
import { notificarResolucionDeReporte } from '../notificaciones/disparadores.service.js';
import { agruparHistorial, todas } from './consultas.js';

/**
 * Bandeja de moderación del administrador — US-RES-06 y RF086 (PAN-ADM-02).
 *
 * SE AGRUPA POR RESEÑA Y NO POR REPORTE, y esa es la decisión de diseño que
 * ordena todo el resto. El requisito pide mostrar "la cantidad de reportes
 * acumulados, los motivos seleccionados y los detalles adicionales aportados":
 * o sea, una fila por reseña con todo lo que dijeron quienes la denunciaron. Y
 * la resolución también es por reseña —ocultarla o dejarla visible—, no por
 * denuncia: aprobar un reporte y rechazar otro sobre la misma reseña no
 * significaría nada.
 */

/**
 * Reportes pendientes, agrupados por reseña y con la más denunciada primero.
 *
 * Dos consultas y no un join con arrays: la primera resuelve qué reseñas tienen
 * reportes pendientes y en qué orden, y la segunda trae el contenido de esas
 * reseñas. Hacerlo de una sola vez con `array_agg` obligaría a desarmar arrays
 * anidados en TypeScript para el mismo resultado.
 */
export async function listarReportesPendientes(entrada: {
  pagina: number;
  porPagina: number;
}): Promise<PaginaReportes> {
  const { pagina, porPagina } = entrada;
  const pendientes = eq(reporteResena.estadoReporte, 'PENDIENTE');

  const [agrupados, [totalizador]] = await Promise.all([
    db
      .select({
        resenaId: reporteResena.resenaId,
        cantidadReportes: count(),
        /**
         * `motivos` es `text[]` en cada reporte: `array_agg` de arrays daría
         * un array de arrays, así que se aplana con `unnest` en un subselect y
         * se deduplica. Es lo que el requisito pide mostrar: los motivos
         * invocados, sin repetir "Spam" cinco veces porque cinco personas lo
         * eligieron.
         */
        motivos: sql<string[]>`(
          select coalesce(array_agg(distinct m), '{}')
            from ${reporteResena} r2, unnest(r2.motivos) as m
           where r2.resena_id = ${reporteResena.resenaId}
             and r2.estado_reporte = 'PENDIENTE'
        )`,
        detalles: sql<string[]>`coalesce(
          array_agg(${reporteResena.detalleAdicional})
            filter (where ${reporteResena.detalleAdicional} is not null),
          '{}'
        )`,
        fechaPrimerReporte: min(reporteResena.fechaReporte),
      })
      .from(reporteResena)
      .where(pendientes)
      .groupBy(reporteResena.resenaId)
      // La más denunciada primero; a igual cantidad, la más vieja.
      .orderBy(desc(count()), min(reporteResena.fechaReporte))
      .limit(porPagina)
      .offset((pagina - 1) * porPagina),

    db
      .select({ total: countDistinct(reporteResena.resenaId) })
      .from(reporteResena)
      .where(pendientes),
  ]);

  const resenaIds = agrupados.map((f) => f.resenaId);
  const [resenas, historiales] = await Promise.all([
    contenidoDeResenas(resenaIds),
    historialDeResenas(resenaIds),
  ]);

  /**
   * Una reseña sin contenido se descarta en lugar de romper la bandeja. No
   * debería pasar —`reporte_resena.resena_id` tiene FK con cascada—, pero una
   * fila que no se puede dibujar no justifica devolver un error sobre las otras.
   */
  const datos = agrupados.flatMap<ReporteModeracion>((fila) => {
    const contenido = resenas.get(fila.resenaId);
    if (!contenido || fila.fechaPrimerReporte === null) return [];

    return [
      {
        resenaId: fila.resenaId,
        cantidadReportes: fila.cantidadReportes,
        motivos: fila.motivos,
        detalles: fila.detalles,
        fechaPrimerReporte: fila.fechaPrimerReporte.toISOString(),
        resena: contenido,
        historial: historiales.get(fila.resenaId) ?? [],
      },
    ];
  });

  return {
    datos,
    total: totalizador?.total ?? 0,
    pagina,
    porPagina,
  };
}

/** La reseña denunciada con el contexto que el administrador necesita para decidir. */
async function contenidoDeResenas(
  resenaIds: readonly string[],
): Promise<Map<string, ReporteModeracion['resena']>> {
  const mapa = new Map<string, ReporteModeracion['resena']>();
  if (resenaIds.length === 0) return mapa;

  /**
   * DOS ALIAS SOBRE `usuario` EN LA MISMA CONSULTA. La reseña tiene dos
   * personas —quien la escribió y el cocinero al que le toca— y las dos salen
   * de la misma tabla; sin alias, Postgres no sabe a cuál de las dos se refiere
   * cada columna.
   */
  const autor = alias(usuario, 'autor_resena');
  const cocinero = alias(usuario, 'cocinero_resena');

  /**
   * LOS DOS JOINS DE CONTEXTO SON `left` Y NO `inner`, y ese cambio es lo que
   * hace que la bandeja sirva a los tres tipos de reseña:
   *
   *   publicacion  solo existe en las de PLATO
   *   cocinero     no existe en las de CLIENTE
   *
   * Con `inner`, un reporte sobre una opinión a un cocinero o sobre una reseña
   * a un cliente desaparecía de la cola SIN DAR NINGÚN ERROR: el reporte
   * seguía contado en el listado de arriba y su ficha no se podía abrir.
   */
  const filas = await db
    .select({
      id: resena.id,
      tipo: resena.tipoResena,
      autorNombre: sql<string>`${autor.nombre} || ' ' || ${autor.apellido}`,
      calificacion: resena.calificacion,
      comentario: resena.comentario,
      fotoUrl: resena.fotoUrl,
      fechaPublicacion: resena.fechaPublicacion,
      estadoResena: resena.estadoResena,
      nombrePlato: publicacion.nombre,
      cocineroNombre: sql<
        string | null
      >`${cocinero.nombre} || ' ' || ${cocinero.apellido}`,
    })
    .from(resena)
    .leftJoin(publicacion, eq(publicacion.id, resena.publicacionId))
    .innerJoin(autor, eq(autor.id, resena.autorId))
    .leftJoin(cocinero, eq(cocinero.id, resena.cocineroResId))
    .where(inArray(resena.id, [...resenaIds]));

  for (const fila of filas) {
    mapa.set(fila.id, {
      id: fila.id,
      tipo: fila.tipo,
      autorNombre: fila.autorNombre,
      calificacion: fila.calificacion,
      comentario: fila.comentario,
      fotoUrl: fila.fotoUrl,
      fechaPublicacion: fila.fechaPublicacion.toISOString(),
      estadoResena: fila.estadoResena,
      nombrePlato: fila.nombrePlato,
      cocineroNombre: fila.cocineroNombre,
    });
  }

  return mapa;
}

/**
 * Corrección del 20/10/2026 - Las rondas de moderación anteriores de cada
 * reseña de la página.
 *
 * ES LO QUE LE PERMITE AL ADMINISTRADOR NO DECIDIR A CIEGAS. Una reseña que
 * otro administrador ya dejó visible y que vuelve a la bandeja con denuncias
 * nuevas se modera distinto que una denunciada por primera vez: o el criterio
 * anterior fue un error, o alguien insiste sin motivo.
 *
 * No hace falta migrar nada: cada reporte resuelto ya guarda quién lo resolvió,
 * cuándo y cómo. Lo que faltaba era mostrarlo.
 *
 * El reportante va en `inner join` porque su FK es en cascada: un reporte sin
 * reportante no existe. El administrador va en `left join` porque su FK es
 * `set null`: la ronda tiene que seguir apareciendo aunque su cuenta no.
 */
async function historialDeResenas(
  resenaIds: readonly string[],
): Promise<Map<string, ResolucionAnterior[]>> {
  if (resenaIds.length === 0) return new Map();

  const reportante = alias(usuario, 'reportante');
  const admin = alias(usuario, 'admin_resolutor');

  const filas = await db
    .select({
      resenaId: reporteResena.resenaId,
      estadoReporte: reporteResena.estadoReporte,
      adminId: reporteResena.adminResolutorId,
      adminNombre: sql<
        string | null
      >`${admin.nombre} || ' ' || ${admin.apellido}`,
      fechaResolucion: reporteResena.fechaResolucion,
      reportanteNombre: sql<string>`${reportante.nombre} || ' ' || ${reportante.apellido}`,
      motivos: reporteResena.motivos,
      detalle: reporteResena.detalleAdicional,
      fechaReporte: reporteResena.fechaReporte,
    })
    .from(reporteResena)
    .innerJoin(reportante, eq(reportante.id, reporteResena.usuarioReportanteId))
    .leftJoin(admin, eq(admin.id, reporteResena.adminResolutorId))
    .where(
      todas([
        inArray(reporteResena.resenaId, [...resenaIds]),
        ne(reporteResena.estadoReporte, 'PENDIENTE'),
      ]),
    )
    .orderBy(asc(reporteResena.fechaReporte));

  /**
   * El `where` ya excluye los PENDIENTE, pero el tipo de la columna no lo sabe:
   * se estrecha acá. Un reporte resuelto siempre tiene fecha de resolución; si
   * alguna fila vieja no la tuviera, no hay ronda a la cual asignarla y se
   * descarta en lugar de inventarle una fecha.
   */
  return agruparHistorial(
    filas.flatMap(({ estadoReporte, fechaResolucion, ...fila }) =>
      estadoReporte === 'PENDIENTE' || fechaResolucion === null
        ? []
        : [{ ...fila, decision: estadoReporte, fechaResolucion }],
    ),
  );
}

/**
 * RF086 - Resuelve TODOS los reportes pendientes de una reseña, de una vez.
 *
 * LAS DOS RAMAS DEL REQUISITO:
 *
 *   aprobar   la reseña pasa a OCULTA_MODERACION. Deja de mostrarse en el
 *             perfil y en el detalle del plato, y sale de los dos promedios
 *             —el de la publicación y el del cocinero— porque las dos consultas
 *             filtran por VISIBLE. No hay nada que recalcular a mano.
 *   rechazar  la reseña queda VISIBLE y los promedios no se mueven.
 *
 * En los dos casos los reportes quedan resueltos con el administrador y la
 * fecha, que es lo que impide que la misma denuncia vuelva a aparecer en la
 * bandeja mañana. Si después llegan denuncias nuevas, la reseña vuelve con
 * esta resolución en su historial (`historialDeResenas`).
 *
 * Las dos ramas notifican (`notificarResolucionDeReporte`), pero solo a
 * partir de los reportes que ESTA resolución pasó de PENDIENTE a resueltos:
 * si dos administradores resuelven la misma reseña a la vez, el segundo no
 * actualiza ninguna fila y no vuelve a avisar.
 */
export async function resolverReportesDeResena(entrada: {
  resenaId: string;
  adminId: string;
  aprobar: boolean;
}): Promise<void> {
  const { resenaId, adminId, aprobar } = entrada;

  const [existe] = await db
    .select({ id: resena.id, autorId: resena.autorId })
    .from(resena)
    .where(eq(resena.id, resenaId))
    .limit(1);

  if (!existe) throw noEncontrado('la reseña');

  const resueltos = await db.transaction(async (tx) => {
    const filas = await tx
      .update(reporteResena)
      .set({
        estadoReporte: aprobar ? 'APROBADO' : 'RECHAZADO',
        adminResolutorId: adminId,
        fechaResolucion: new Date(),
      })
      .where(
        todas([
          eq(reporteResena.resenaId, resenaId),
          eq(reporteResena.estadoReporte, 'PENDIENTE'),
        ]),
      )
      .returning({ reportanteId: reporteResena.usuarioReportanteId });

    if (aprobar) {
      await tx
        .update(resena)
        .set({ estadoResena: 'OCULTA_MODERACION' })
        .where(eq(resena.id, resenaId));
    }

    return filas;
  });

  if (resueltos.length === 0) return;

  void notificarResolucionDeReporte({
    resenaId,
    aprobado: aprobar,
    autorId: existe.autorId,
    reportantesIds: resueltos.map((r) => r.reportanteId),
  });
}

/** Tamaño de página de la bandeja. Se reusa el del listado de reseñas. */
export const REPORTES_POR_PAGINA = RESENAS_POR_PAGINA;
