import { count, eq, inArray, sql } from 'drizzle-orm';
import {
  reaccionResena,
  reporteResena,
  resena,
  respuestaCocinero,
} from '@foodhub/db';
import {
  contieneTerminoModerado,
  HORAS_VENTANA_EDICION_RESPUESTA,
  MENSAJES_RESENA,
  ventanaDeRespuestaAbierta,
  type ReaccionarInput,
  type TipoReaccion,
  type ReportarResenaInput,
  type ResponderResenaInput,
  type RespuestaCocinero,
} from '@foodhub/shared';
import { db } from '../../lib/db.js';
import { AppError, noEncontrado } from '../../middleware/error.middleware.js';
import { obtenerParametrosDeResenas } from '../configuracion/parametrosSistema.service.js';
import { CONTEXTO_VACIO, todas, type ContextoDeResena } from './consultas.js';

/**
 * Las tres historias sociales del modulo — US-RES-04 (reacciones), US-RES-05
 * (respuesta del cocinero) y US-RES-06 (reportes y moderacion).
 *
 * VAN JUNTAS EN UN ARCHIVO porque las tres cuelgan de la MISMA resena y las tres
 * aportan al mismo objeto de lectura: el contexto que `aResenaPublica` adosa a
 * cada fila. Separarlas en tres servicios obligaria a que el listado importara
 * de tres lados para armar una sola respuesta.
 *
 * NINGUNA NECESITO MIGRACION: `reaccion_resena`, `respuesta_cocinero` y
 * `reporte_resena` existen desde la migracion inicial, con sus indices unicos.
 * Las reglas de unicidad de los tres requisitos ya estan en la base.
 */

// ---------------------------------------------------------------------------
// Lectura: el contexto que acompana a cada resena
// ---------------------------------------------------------------------------

/**
 * Reacciones, respuesta y marcas propias de un conjunto de resenas.
 *
 * SE RESUELVE EN TRES CONSULTAS PARA TODO EL BLOQUE y no en tres por resena.
 * El listado trae diez por pagina; con una consulta por fila serian treinta
 * viajes a la base para dibujar una pantalla, que es el problema N+1 clasico.
 *
 * Devuelve un `Map` y no un arreglo: el llamador recorre sus filas en el orden
 * que ya eligio y necesita buscar por id, no iterar.
 */
export async function contextosDeResenas(entrada: {
  resenaIds: readonly string[];
  usuarioId: string;
}): Promise<Map<string, ContextoDeResena>> {
  const { resenaIds, usuarioId } = entrada;
  const contextos = new Map<string, ContextoDeResena>();
  if (resenaIds.length === 0) return contextos;

  const [reacciones, respuestas, misReportes, autorias] = await Promise.all([
    db
      .select({
        resenaId: reaccionResena.resenaId,
        tipo: reaccionResena.tipo,
        cantidad: count(),
        /**
         * `bool_or` en lugar de una consulta aparte para "mi reaccion": la fila
         * del usuario ya esta dentro del grupo que se esta contando, asi que
         * marcarla sale gratis y evita una cuarta consulta.
         */
        mia: sql<boolean>`bool_or(${reaccionResena.usuarioId} = ${usuarioId})`,
      })
      .from(reaccionResena)
      .where(inArray(reaccionResena.resenaId, [...resenaIds]))
      .groupBy(reaccionResena.resenaId, reaccionResena.tipo),

    db
      .select({
        resenaId: respuestaCocinero.resenaId,
        id: respuestaCocinero.id,
        contenido: respuestaCocinero.contenido,
        editada: respuestaCocinero.editada,
        fechaPublicacion: respuestaCocinero.fechaPublicacion,
        fechaEdicionLimite: respuestaCocinero.fechaEdicionLimite,
      })
      .from(respuestaCocinero)
      .where(inArray(respuestaCocinero.resenaId, [...resenaIds])),

    db
      .select({ resenaId: reporteResena.resenaId })
      .from(reporteResena)
      .where(
        todas([
          inArray(reporteResena.resenaId, [...resenaIds]),
          eq(reporteResena.usuarioReportanteId, usuarioId),
        ]),
      ),

    db
      .select({ id: resena.id })
      .from(resena)
      .where(
        todas([
          inArray(resena.id, [...resenaIds]),
          eq(resena.autorId, usuarioId),
        ]),
      ),
  ]);

  for (const id of resenaIds) contextos.set(id, { ...CONTEXTO_VACIO });

  volcarReacciones(contextos, reacciones);

  for (const fila of respuestas) {
    const contexto = contextos.get(fila.resenaId);
    if (contexto) contexto.respuesta = aRespuesta(fila);
  }

  for (const fila of misReportes) {
    const contexto = contextos.get(fila.resenaId);
    if (contexto) contexto.reportadaPorMi = true;
  }

  for (const fila of autorias) {
    const contexto = contextos.get(fila.id);
    if (contexto) contexto.esMia = true;
  }

  return contextos;
}

/**
 * Vuelca las filas agrupadas de reacciones sobre los contextos.
 *
 * Sale aparte porque es el único de los cuatro volcados con ramas propias —dos
 * tipos de reacción y la marca de "es la mía"— y con él adentro
 * `contextosDeResenas` supera el límite de complejidad que fija ESLint.
 */
function volcarReacciones(
  contextos: Map<string, ContextoDeResena>,
  filas: readonly {
    resenaId: string;
    tipo: TipoReaccion;
    cantidad: number;
    mia: boolean;
  }[],
): void {
  for (const fila of filas) {
    const contexto = contextos.get(fila.resenaId);
    if (!contexto) continue;

    if (fila.tipo === 'ME_GUSTA') contexto.meGusta = fila.cantidad;
    else contexto.noMeGusta = fila.cantidad;
    if (fila.mia) contexto.miReaccion = fila.tipo;
  }
}

function aRespuesta(fila: {
  id: string;
  contenido: string;
  editada: boolean;
  fechaPublicacion: Date;
  fechaEdicionLimite: Date | null;
}): RespuestaCocinero {
  return {
    id: fila.id,
    contenido: fila.contenido,
    editada: fila.editada,
    fechaPublicacion: fila.fechaPublicacion.toISOString(),
    puedeEditar: ventanaDeRespuestaAbierta(fila.fechaEdicionLimite),
  };
}

// ---------------------------------------------------------------------------
// US-RES-04 — reacciones
// ---------------------------------------------------------------------------

/**
 * Marca, cambia o quita la reaccion del usuario sobre una resena.
 *
 * LOS TRES CASOS DEL CRITERIO SON UN SOLO UPSERT. "Marcar" inserta, "cambiar"
 * actualiza la fila existente —el requisito lo pide explicitamente: "el cambio
 * de reaccion se persiste como actualizacion de la fila existente y no como una
 * fila nueva"— y "desmarcar" borra. Los contadores no se guardan en ningun
 * lado: se cuentan al leer, que es lo unico que no se puede desincronizar.
 *
 * NADIE REACCIONA A SU PROPIA RESENA (US-RES-04). La pantalla no dibuja los
 * botones, pero la regla se comprueba igual acá: una validacion que solo vive
 * en el cliente no es una validacion.
 */
export async function reaccionar(entrada: {
  usuarioId: string;
  resenaId: string;
  datos: ReaccionarInput;
}): Promise<void> {
  const { usuarioId, resenaId, datos } = entrada;

  const [suResena] = await db
    .select({ autorId: resena.autorId })
    .from(resena)
    .where(eq(resena.id, resenaId))
    .limit(1);

  if (!suResena) throw noEncontrado('la reseña');

  if (suResena.autorId === usuarioId) {
    throw new AppError(
      403,
      MENSAJES_RESENA.sinDerechoAReaccionar,
      'SIN_DERECHO_A_REACCIONAR',
    );
  }

  if (datos.tipo === null) {
    await db
      .delete(reaccionResena)
      .where(
        todas([
          eq(reaccionResena.resenaId, resenaId),
          eq(reaccionResena.usuarioId, usuarioId),
        ]),
      );
    return;
  }

  await db
    .insert(reaccionResena)
    .values({ resenaId, usuarioId, tipo: datos.tipo })
    .onConflictDoUpdate({
      target: [reaccionResena.resenaId, reaccionResena.usuarioId],
      set: { tipo: datos.tipo, fechaReaccion: new Date() },
    });
}

// ---------------------------------------------------------------------------
// US-RES-05 — respuesta del cocinero
// ---------------------------------------------------------------------------

/** Corta si la respuesta contiene un termino vetado (RF084). */
function verificarModeracion(
  contenido: string,
  terminos: readonly string[],
): void {
  if (contieneTerminoModerado(contenido, terminos)) {
    throw new AppError(
      400,
      MENSAJES_RESENA.respuestaConTerminosModerados,
      'COMENTARIO_MODERADO',
    );
  }
}

/**
 * US-RES-05 - El cocinero responde una resena de uno de sus platos.
 *
 * `fecha_edicion_limite` SE PERSISTE Y NO SE DERIVA AL LEER. RF084 la nombra
 * como atributo de la entidad, y guardarla congela la ventana en el momento de
 * publicar: si se calculara al leer, cambiar la constante de 24 horas
 * reabriria respuestas que ya estaban cerradas.
 */
export async function responderResena(entrada: {
  cocineroId: string;
  resenaId: string;
  datos: ResponderResenaInput;
}): Promise<RespuestaCocinero> {
  const { cocineroId, resenaId, datos } = entrada;

  const [suResena] = await db
    .select({ cocineroResId: resena.cocineroResId })
    .from(resena)
    .where(eq(resena.id, resenaId))
    .limit(1);

  if (!suResena) throw noEncontrado('la reseña');

  /**
   * UNA SOLA COMPARACION CUBRE LOS TRES TIPOS, porque `cocinero_res_id`
   * significa "el cocinero al que le toca esta resena" en los tres:
   *
   *   PLATO     el dueno del plato resenado
   *   COCINERO  el cocinero resenado, que es quien tiene derecho a replica
   *   CLIENTE   NULL, con lo cual nunca coincide y la respuesta se rechaza
   *
   * Ese ultimo caso es el que hay que preservar: las resenas a un cliente no
   * se responden porque el cliente ni siquiera las ve.
   */
  if (suResena.cocineroResId !== cocineroId) {
    throw new AppError(
      403,
      MENSAJES_RESENA.sinDerechoAResponder,
      'SIN_DERECHO_A_RESPONDER',
    );
  }

  const parametros = await obtenerParametrosDeResenas();
  verificarModeracion(datos.contenido, parametros.terminosModeracion);

  const ahora = new Date();
  const limite = new Date(
    ahora.getTime() + HORAS_VENTANA_EDICION_RESPUESTA * 3_600_000,
  );

  try {
    const [fila] = await db
      .insert(respuestaCocinero)
      .values({
        resenaId,
        cocineroId,
        contenido: datos.contenido,
        fechaEdicionLimite: limite,
      })
      .returning(columnasRespuesta);

    if (!fila) throw new Error('la respuesta no devolvió ninguna fila');
    return aRespuesta(fila);
  } catch (error) {
    if (esViolacionDeUnicidad(error)) {
      throw new AppError(
        409,
        MENSAJES_RESENA.respuestaYaExiste,
        'RESPUESTA_YA_EXISTE',
      );
    }
    throw error;
  }
}

/**
 * US-RES-05 - Edicion dentro de las 24 horas.
 *
 * La ventana NO se recalcula al editar: `fecha_edicion_limite` queda como se
 * fijo al publicar. Si cada edicion la corriera, el cocinero podria mantener
 * una respuesta editable para siempre editandola cada 23 horas.
 */
export async function editarRespuesta(entrada: {
  cocineroId: string;
  respuestaId: string;
  datos: ResponderResenaInput;
}): Promise<RespuestaCocinero> {
  const { cocineroId, respuestaId, datos } = entrada;

  const [existente] = await db
    .select({
      cocineroId: respuestaCocinero.cocineroId,
      fechaEdicionLimite: respuestaCocinero.fechaEdicionLimite,
    })
    .from(respuestaCocinero)
    .where(eq(respuestaCocinero.id, respuestaId))
    .limit(1);

  if (!existente) throw noEncontrado('la respuesta');

  if (existente.cocineroId !== cocineroId) {
    throw new AppError(
      403,
      MENSAJES_RESENA.sinDerechoAResponder,
      'SIN_DERECHO_A_RESPONDER',
    );
  }

  if (!ventanaDeRespuestaAbierta(existente.fechaEdicionLimite)) {
    throw new AppError(
      403,
      MENSAJES_RESENA.edicionDeRespuestaVencida,
      'EDICION_FUERA_DE_VENTANA',
    );
  }

  const parametros = await obtenerParametrosDeResenas();
  verificarModeracion(datos.contenido, parametros.terminosModeracion);

  const [fila] = await db
    .update(respuestaCocinero)
    .set({ contenido: datos.contenido, editada: true })
    .where(eq(respuestaCocinero.id, respuestaId))
    .returning(columnasRespuesta);

  if (!fila) throw new Error('la edición no devolvió ninguna fila');
  return aRespuesta(fila);
}

const columnasRespuesta = {
  id: respuestaCocinero.id,
  contenido: respuestaCocinero.contenido,
  editada: respuestaCocinero.editada,
  fechaPublicacion: respuestaCocinero.fechaPublicacion,
  fechaEdicionLimite: respuestaCocinero.fechaEdicionLimite,
};

// ---------------------------------------------------------------------------
// US-RES-06 — reportes
// ---------------------------------------------------------------------------

/**
 * US-RES-06 - Reporte de una resena ajena.
 *
 * NADIE REPORTA LA PROPIA: el criterio ofrece "Eliminar mi resena" en su lugar,
 * que es `eliminarMiResena`. La unicidad por par usuario-resena la garantiza el
 * indice `reporte_resena_uq` y se traduce en el `catch`.
 */
export async function reportarResena(entrada: {
  usuarioId: string;
  resenaId: string;
  datos: ReportarResenaInput;
}): Promise<void> {
  const { usuarioId, resenaId, datos } = entrada;

  const [suResena] = await db
    .select({ autorId: resena.autorId })
    .from(resena)
    .where(eq(resena.id, resenaId))
    .limit(1);

  if (!suResena) throw noEncontrado('la reseña');

  if (suResena.autorId === usuarioId) {
    throw new AppError(
      403,
      MENSAJES_RESENA.sinDerechoAReportar,
      'SIN_DERECHO_A_REPORTAR',
    );
  }

  try {
    await db.insert(reporteResena).values({
      resenaId,
      usuarioReportanteId: usuarioId,
      motivos: datos.motivos,
      detalleAdicional: datos.detalleAdicional ?? null,
    });
  } catch (error) {
    if (esViolacionDeUnicidad(error)) {
      throw new AppError(
        409,
        MENSAJES_RESENA.reporteDuplicado,
        'REPORTE_DUPLICADO',
      );
    }
    throw error;
  }
}

/**
 * US-RES-06 - El autor retira su propia resena.
 *
 * ES UNA TRANSICION DE ESTADO Y NO UN DELETE. `ELIMINADA_AUTOR` la saca del
 * perfil y de los promedios pero conserva la fila, que es lo que permite que la
 * unicidad por par cliente-publicacion siga teniendo sentido: si se borrara,
 * el cliente podria dejar una resena nueva del mismo plato y eludir el limite
 * de una por publicacion.
 */
export async function eliminarMiResena(entrada: {
  clienteId: string;
  resenaId: string;
}): Promise<void> {
  const { clienteId, resenaId } = entrada;

  const [existente] = await db
    .select({ autorId: resena.autorId })
    .from(resena)
    .where(eq(resena.id, resenaId))
    .limit(1);

  if (!existente) throw noEncontrado('la reseña');

  if (existente.autorId !== clienteId) {
    throw new AppError(
      403,
      MENSAJES_RESENA.sinDerechoAEliminar,
      'SIN_DERECHO_A_ELIMINAR',
    );
  }

  await db
    .update(resena)
    .set({ estadoResena: 'ELIMINADA_AUTOR' })
    .where(eq(resena.id, resenaId));
}

/** `true` si el error es el choque contra un indice unico de Postgres. */
function esViolacionDeUnicidad(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '23505'
  );
}
