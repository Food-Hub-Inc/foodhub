import { and, count, desc, eq, inArray } from 'drizzle-orm';
import { notificacion } from '@foodhub/db';
import type {
  FiltrosHistorialNotificaciones,
  Notificacion,
  PaginaNotificaciones,
} from '@foodhub/shared';
import { db } from '../../lib/db.js';
import { noEncontrado } from '../../middleware/error.middleware.js';

/**
 * Historial in-app de notificaciones (US-NOT-07, PAN-NOT-01).
 *
 * Todo lo que se lee aca esta acotado por `usuario_destino_id = <sesion>`:
 * nadie ve ni marca como leidas las notificaciones de otro. El `push_estado`
 * es infraestructura interna y NO viaja en el contrato.
 */

function aNotificacion(fila: {
  id: string;
  tipoNotificacion: Notificacion['tipoNotificacion'];
  titulo: string;
  cuerpo: string;
  objetoAfectadoId: string | null;
  leida: boolean;
  fechaCreacion: Date;
}): Notificacion {
  return {
    id: fila.id,
    tipoNotificacion: fila.tipoNotificacion,
    titulo: fila.titulo,
    cuerpo: fila.cuerpo,
    objetoAfectadoId: fila.objetoAfectadoId,
    leida: fila.leida,
    fechaCreacion: fila.fechaCreacion.toISOString(),
  };
}

/** US-NOT-07 - Historial paginado, de la mas reciente a la mas antigua. */
export async function listarHistorial(
  usuarioId: string,
  filtros: FiltrosHistorialNotificaciones,
): Promise<PaginaNotificaciones> {
  const propias = eq(notificacion.usuarioDestinoId, usuarioId);

  const [filas, [totalizador], noLeidas] = await Promise.all([
    db
      .select({
        id: notificacion.id,
        tipoNotificacion: notificacion.tipoNotificacion,
        titulo: notificacion.titulo,
        cuerpo: notificacion.cuerpo,
        objetoAfectadoId: notificacion.objetoAfectadoId,
        leida: notificacion.leida,
        fechaCreacion: notificacion.fechaCreacion,
      })
      .from(notificacion)
      .where(propias)
      .orderBy(desc(notificacion.fechaCreacion))
      .limit(filtros.porPagina)
      .offset((filtros.pagina - 1) * filtros.porPagina),
    db.select({ total: count() }).from(notificacion).where(propias),
    contarNoLeidas(usuarioId),
  ]);

  return {
    datos: filas.map(aNotificacion),
    total: totalizador?.total ?? 0,
    pagina: filtros.pagina,
    porPagina: filtros.porPagina,
    noLeidas,
  };
}

/** US-NOT-07 - Contador del globo de la campana (encabezado del feed). */
/**
 * PAN-NOT-03 - Detalle de una notificación (el aviso del administrador de
 * US-NOT-04 y los avisos de RF086). Acotada al destinatario: el id de otra
 * persona responde 404, igual que uno inexistente, para no confirmar que
 * existe.
 */
export async function obtenerNotificacion(
  usuarioId: string,
  notificacionId: string,
): Promise<Notificacion> {
  const [fila] = await db
    .select({
      id: notificacion.id,
      tipoNotificacion: notificacion.tipoNotificacion,
      titulo: notificacion.titulo,
      cuerpo: notificacion.cuerpo,
      objetoAfectadoId: notificacion.objetoAfectadoId,
      leida: notificacion.leida,
      fechaCreacion: notificacion.fechaCreacion,
    })
    .from(notificacion)
    .where(
      and(
        eq(notificacion.id, notificacionId),
        eq(notificacion.usuarioDestinoId, usuarioId),
      ),
    )
    .limit(1);

  if (!fila) throw noEncontrado('la notificación');
  return aNotificacion(fila);
}

export async function contarNoLeidas(usuarioId: string): Promise<number> {
  const [fila] = await db
    .select({ total: count() })
    .from(notificacion)
    .where(
      and(
        eq(notificacion.usuarioDestinoId, usuarioId),
        eq(notificacion.leida, false),
      ),
    );
  return fila?.total ?? 0;
}

/**
 * US-NOT-07 - Marca notificaciones como leidas.
 *
 * Sin `ids` = todas las del usuario (lo que hace la pantalla al abrirse). Con
 * `ids`, solo esas (la que el usuario toco). En los dos casos el WHERE exige
 * `usuario_destino_id`, asi que un id ajeno simplemente no afecta ninguna fila.
 */
export async function marcarLeidas(
  usuarioId: string,
  ids?: string[],
): Promise<void> {
  const condiciones = [
    eq(notificacion.usuarioDestinoId, usuarioId),
    eq(notificacion.leida, false),
  ];
  if (ids && ids.length > 0) {
    condiciones.push(inArray(notificacion.id, ids));
  } else if (ids) {
    // `ids` presente pero vacio: no hay nada que marcar.
    return;
  }

  await db
    .update(notificacion)
    .set({ leida: true })
    .where(and(...condiciones));
}
