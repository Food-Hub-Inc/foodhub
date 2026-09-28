import { count, countDistinct, desc, eq, inArray, min, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { publicacion, reporteResena, resena, usuario } from '@foodhub/db';
import {
  RESENAS_POR_PAGINA,
  type PaginaReportes,
  type ReporteModeracion,
} from '@foodhub/shared';
import { db } from '../../lib/db.js';
import { noEncontrado } from '../../middleware/error.middleware.js';
import { todas } from './consultas.js';

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

  const resenas = await contenidoDeResenas(agrupados.map((f) => f.resenaId));

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
 * bandeja mañana.
 *
 * LAS NOTIFICACIONES DE LAS DOS RAMAS NO SE ENVÍAN: el módulo NOT no existe
 * todavía. Es el mismo pendiente que arrastran RF038 y el resto del sistema.
 */
export async function resolverReportesDeResena(entrada: {
  resenaId: string;
  adminId: string;
  aprobar: boolean;
}): Promise<void> {
  const { resenaId, adminId, aprobar } = entrada;

  const [existe] = await db
    .select({ id: resena.id })
    .from(resena)
    .where(eq(resena.id, resenaId))
    .limit(1);

  if (!existe) throw noEncontrado('la reseña');

  await db.transaction(async (tx) => {
    await tx
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
      );

    if (aprobar) {
      await tx
        .update(resena)
        .set({ estadoResena: 'OCULTA_MODERACION' })
        .where(eq(resena.id, resenaId));
    }
  });
}

/** Tamaño de página de la bandeja. Se reusa el del listado de reseñas. */
export const REPORTES_POR_PAGINA = RESENAS_POR_PAGINA;
