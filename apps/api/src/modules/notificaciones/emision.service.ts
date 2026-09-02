import { and, eq, inArray } from 'drizzle-orm';
import { notificacion, preferenciaNotificacion } from '@foodhub/db';
import {
  TIPOS_NOTIFICACION_ESENCIALES,
  type TipoNotificacion,
} from '@foodhub/shared';
import { db } from '../../lib/db.js';
import { programarDespachoInmediato } from './despacho.service.js';

/**
 * Emision de notificaciones (US-NOT-01, US-NOT-02, US-NOT-06).
 *
 * Un solo punto por el que pasa toda notificacion del sistema. Los disparadores
 * (una transicion de pedido, un mensaje nuevo, una publicacion de un favorito)
 * llaman aca; nadie inserta en `notificacion` a mano.
 *
 * REGLA DE ESCRITURA (documento del modulo, revision 01/09/2026):
 *
 *   tipo CONFIGURABLE + preferencia en `activa = false`  -> no se hace NADA:
 *       ni fila ni push. Corrige la regla anterior ("la fila se escribe
 *       siempre") que todavia describe la skill `foodhub`.
 *   tipo ESENCIAL (AVISO_SISTEMA, PUBLICACION_ELIMINADA_ADMIN)  -> siempre.
 *   sin fila de preferencia  -> se emite (el default es recibir; mismo criterio
 *       que `preferenciasNotificacion.service.ts`).
 *
 * EL PUSH NO SE MANDA ACA. Esta funcion solo escribe la fila (dentro de la
 * transaccion del disparador, si la hay) y programa un barrido del despachador.
 * Asi un fallo de red con Expo nunca puede tocar la operacion de negocio, y las
 * notificaciones que escribe la funcion SQL de expiracion de pedidos -que no
 * puede hablar con Expo- se despachan por el mismo camino.
 */

/** Conexion dentro de una transaccion de Drizzle. Mismo alias que en Pedidos. */
type Transaccion = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Ejecutor = Transaccion | typeof db;

interface DatosNotificacion {
  usuarioDestinoId: string;
  tipo: TipoNotificacion;
  titulo: string;
  cuerpo: string;
  /** Pedido, conversacion o publicacion, segun el tipo. Null para los avisos. */
  objetoAfectadoId: string | null;
}

function esEsencial(tipo: TipoNotificacion): boolean {
  return TIPOS_NOTIFICACION_ESENCIALES.includes(tipo);
}

/** Usuarios (de `candidatos`) que tienen ESE tipo apagado en sus preferencias. */
async function conPreferenciaApagada(
  cx: Ejecutor,
  tipo: TipoNotificacion,
  candidatos: string[],
): Promise<Set<string>> {
  if (candidatos.length === 0) return new Set();

  const filas = await cx
    .select({ usuarioId: preferenciaNotificacion.usuarioId })
    .from(preferenciaNotificacion)
    .where(
      and(
        eq(preferenciaNotificacion.tipoNotificacion, tipo),
        eq(preferenciaNotificacion.activa, false),
        inArray(preferenciaNotificacion.usuarioId, candidatos),
      ),
    );

  return new Set(filas.map((f) => f.usuarioId));
}

/**
 * Emite una notificacion a un usuario. Devuelve el id de la fila creada, o
 * `null` si la preferencia del usuario suprimio el evento.
 *
 * `cx` es la transaccion del disparador cuando lo hay (la transicion de pedido,
 * el envio de mensaje): asi la fila de `notificacion` es atomica con el evento
 * que la genero. Si el disparador no corre en transaccion, se pasa `db`.
 */
export async function emitirNotificacion(
  datos: DatosNotificacion,
  cx: Ejecutor = db,
): Promise<{ id: string } | null> {
  if (!esEsencial(datos.tipo)) {
    const apagada = await conPreferenciaApagada(cx, datos.tipo, [
      datos.usuarioDestinoId,
    ]);
    if (apagada.has(datos.usuarioDestinoId)) return null;
  }

  const [fila] = await cx
    .insert(notificacion)
    .values({
      usuarioDestinoId: datos.usuarioDestinoId,
      tipoNotificacion: datos.tipo,
      titulo: datos.titulo,
      cuerpo: datos.cuerpo,
      objetoAfectadoId: datos.objetoAfectadoId,
    })
    .returning({ id: notificacion.id });

  programarDespachoInmediato();
  return fila ? { id: fila.id } : null;
}

interface DatosNotificacionEnLote {
  usuarioDestinoIds: string[];
  tipo: TipoNotificacion;
  /** Mismo texto para todos: el evento es uno (un cocinero publico un plato). */
  titulo: string;
  cuerpo: string;
  objetoAfectadoId: string | null;
}

/**
 * Emite la MISMA notificacion a varios usuarios en un solo INSERT. Para el
 * abanico de US-NOT-06: un cocinero publica un plato y hay que avisar a todos
 * los clientes que lo tienen como favorito. Devuelve cuantas filas se
 * escribieron (los que tenian la preferencia apagada quedan afuera).
 */
export async function emitirNotificacionEnLote(
  datos: DatosNotificacionEnLote,
  cx: Ejecutor = db,
): Promise<number> {
  const destinatarios = [...new Set(datos.usuarioDestinoIds)];
  if (destinatarios.length === 0) return 0;

  const apagada = esEsencial(datos.tipo)
    ? new Set<string>()
    : await conPreferenciaApagada(cx, datos.tipo, destinatarios);

  const activos = destinatarios.filter((id) => !apagada.has(id));
  if (activos.length === 0) return 0;

  await cx.insert(notificacion).values(
    activos.map((usuarioDestinoId) => ({
      usuarioDestinoId,
      tipoNotificacion: datos.tipo,
      titulo: datos.titulo,
      cuerpo: datos.cuerpo,
      objetoAfectadoId: datos.objetoAfectadoId,
    })),
  );

  programarDespachoInmediato();
  return activos.length;
}
