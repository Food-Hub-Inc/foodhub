import { asc, eq, inArray } from 'drizzle-orm';
import { notificacion } from '@foodhub/db';
import type { PushEstadoNotificacion } from '@foodhub/db';
import type { TipoNotificacion } from '@foodhub/shared';
import { env } from '../../config/env.js';
import { db } from '../../lib/db.js';
import { logger } from '../../lib/logger.js';
import {
  desactivarTokens,
  tokensActivosPorUsuario,
} from './dispositivos.service.js';
import {
  enviarPush,
  type MensajePush,
  type ResultadoPush,
} from './push.service.js';

/**
 * Despachador de notificaciones push (US-NOT-01 a US-NOT-06).
 *
 * `emision.service.ts` solo escribe la fila de `notificacion` con
 * `push_estado = 'PENDIENTE'`. Este modulo es el UNICO que habla con Expo:
 *
 *   - barre `notificacion` buscando lo pendiente, en dos disparos:
 *       * inmediato (coalescido) tras cada alta -> latencia tipica < 1 s;
 *       * por intervalo (NOTIFICACIONES_DESPACHO_INTERVALO_MS) -> red de
 *         seguridad y unico camino para las filas que escribe la funcion SQL
 *         de expiracion de pedidos, que no puede hablar con Expo.
 *   - reclama cada lote con UPDATE ... FOR UPDATE SKIP LOCKED, asi dos
 *     instancias de Railway se reparten filas disjuntas;
 *   - traduce la respuesta de Expo a `push_estado` y desactiva los tokens
 *     muertos (DeviceNotRegistered).
 *
 * NUNCA lanza hacia afuera: un fallo de red con Expo se loguea y se reintenta
 * en el proximo barrido. Ninguna operacion de negocio depende de esto.
 *
 * LIMITACION MULTI-INSTANCIA (documentada en `docs/API-NOTIFICACIONES.md`): el
 * reset de arranque devuelve a PENDIENTE las filas que quedaron en ENVIANDO por
 * un crash. Si una segunda instancia arranca mientras la primera despacha, ese
 * reset podria devolver a PENDIENTE un lote en vuelo -> a lo sumo un push
 * duplicado. Aceptable para el MVP (el push ya es best-effort); la solucion
 * definitiva es una columna de reclamo con reaper por tiempo.
 */

/** En test no se despacha nada: los barridos no deben pegarle a exp.host. */
const DESPACHO_HABILITADO = env.NODE_ENV !== 'test';

/** Cuantas filas reclama cada barrido. Expo admite 100 mensajes por request. */
const LOTE = 100;

interface FilaPendiente {
  id: string;
  usuarioDestinoId: string;
  tipoNotificacion: TipoNotificacion;
  titulo: string;
  cuerpo: string;
  objetoAfectadoId: string | null;
}

// --- Barrido inmediato coalescido -----------------------------------------

let despachoProgramado = false;
let despachoEnCurso = false;

/**
 * Pide un barrido para "ya". Se coalesce: muchas altas en el mismo tick
 * disparan un solo `setImmediate`. Lo llama `emitirNotificacion` despues de
 * escribir la fila.
 */
export function programarDespachoInmediato(): void {
  if (!DESPACHO_HABILITADO || despachoProgramado) return;
  despachoProgramado = true;
  setImmediate(() => {
    despachoProgramado = false;
    void despacharPendientes();
  });
}

// --- Reclamo de un lote ---------------------------------------------------

/**
 * Marca hasta `LOTE` filas PENDIENTE como ENVIANDO y las devuelve. El
 * `FOR UPDATE SKIP LOCKED` dentro de la transaccion es lo que evita que dos
 * barridos -del mismo proceso o de otra instancia- reclamen las mismas filas.
 */
async function reclamarLote(): Promise<FilaPendiente[]> {
  return db.transaction(async (tx) => {
    const candidatas = await tx
      .select({ id: notificacion.id })
      .from(notificacion)
      .where(eq(notificacion.pushEstado, 'PENDIENTE'))
      .orderBy(asc(notificacion.fechaCreacion))
      .limit(LOTE)
      .for('update', { skipLocked: true });

    if (candidatas.length === 0) return [];

    return tx
      .update(notificacion)
      .set({ pushEstado: 'ENVIANDO' })
      .where(
        inArray(
          notificacion.id,
          candidatas.map((c) => c.id),
        ),
      )
      .returning({
        id: notificacion.id,
        usuarioDestinoId: notificacion.usuarioDestinoId,
        tipoNotificacion: notificacion.tipoNotificacion,
        titulo: notificacion.titulo,
        cuerpo: notificacion.cuerpo,
        objetoAfectadoId: notificacion.objetoAfectadoId,
      });
  });
}

// --- Traduccion del resultado de Expo a push_estado ---------------------

function estadoFinal(resultados: ResultadoPush[]): PushEstadoNotificacion {
  if (resultados.some((r) => r === 'ok')) return 'ENVIADO';
  // Sin ningun 'ok': si al menos uno es transitorio, se reintenta entero.
  if (resultados.some((r) => r === 'error')) return 'PENDIENTE';
  return 'FALLIDO'; // todos 'token_muerto'
}

async function aplicarEstados(
  estados: Map<PushEstadoNotificacion, string[]>,
): Promise<void> {
  for (const [estado, ids] of estados) {
    if (ids.length > 0) {
      await db
        .update(notificacion)
        .set({ pushEstado: estado })
        .where(inArray(notificacion.id, ids));
    }
  }
}

// --- Barrido completo ---------------------------------------------------

async function despacharLote(filas: FilaPendiente[]): Promise<void> {
  const tokensPorUsuario = await tokensActivosPorUsuario(
    filas.map((f) => f.usuarioDestinoId),
  );

  const porEstado = new Map<PushEstadoNotificacion, string[]>();
  const agregar = (estado: PushEstadoNotificacion, id: string) => {
    porEstado.set(estado, [...(porEstado.get(estado) ?? []), id]);
  };

  // Un mensaje de Expo por (fila, token). Se recuerda a que fila pertenece
  // cada mensaje para repartir los resultados.
  const mensajes: MensajePush[] = [];
  const filaDeMensaje: string[] = [];
  const tokenDeMensaje: string[] = [];

  for (const fila of filas) {
    const tokens = tokensPorUsuario.get(fila.usuarioDestinoId) ?? [];
    if (tokens.length === 0) {
      agregar('SIN_DESTINO', fila.id);
      continue;
    }
    for (const token of tokens) {
      mensajes.push({
        to: token,
        titulo: fila.titulo,
        cuerpo: fila.cuerpo,
        data: {
          tipo: fila.tipoNotificacion,
          objetoAfectadoId: fila.objetoAfectadoId ?? '',
          notificacionId: fila.id,
        },
      });
      filaDeMensaje.push(fila.id);
      tokenDeMensaje.push(token);
    }
  }

  if (mensajes.length > 0) {
    const resultados = await enviarPush(mensajes);

    const porFila = new Map<string, ResultadoPush[]>();
    const tokensMuertos: string[] = [];
    resultados.forEach((resultado, i) => {
      const filaId = filaDeMensaje[i]!;
      porFila.set(filaId, [...(porFila.get(filaId) ?? []), resultado]);
      if (resultado === 'token_muerto') tokensMuertos.push(tokenDeMensaje[i]!);
    });

    for (const [filaId, resultados_] of porFila) {
      agregar(estadoFinal(resultados_), filaId);
    }
    await desactivarTokens([...new Set(tokensMuertos)]);
  }

  await aplicarEstados(porEstado);
}

/**
 * Un barrido. Reclama lotes hasta vaciar la cola (o hasta un tope de vueltas,
 * para no monopolizar el proceso si algo esta reencolando en loop).
 */
export async function despacharPendientes(): Promise<void> {
  if (!DESPACHO_HABILITADO || despachoEnCurso) return;
  despachoEnCurso = true;
  try {
    for (let vuelta = 0; vuelta < 20; vuelta++) {
      const filas = await reclamarLote();
      if (filas.length === 0) break;
      await despacharLote(filas);
      if (filas.length < LOTE) break;
    }
  } catch (error) {
    logger.error({ err: error }, 'fallo el despacho de notificaciones push');
  } finally {
    despachoEnCurso = false;
  }
}

// --- Ciclo de vida ----------------------------------------------------

/** `true` en test: el planificador no debe encender el barrido por intervalo. */
export { DESPACHO_HABILITADO };

/**
 * Devuelve a PENDIENTE las filas que quedaron en ENVIANDO por un crash del
 * proceso anterior. Lo llama el planificador al arrancar, antes del primer
 * barrido. Ver la limitacion multi-instancia en el comentario de cabecera.
 */
export async function recuperarEnviosInterrumpidos(): Promise<void> {
  await db
    .update(notificacion)
    .set({ pushEstado: 'PENDIENTE' })
    .where(eq(notificacion.pushEstado, 'ENVIANDO'));
}
