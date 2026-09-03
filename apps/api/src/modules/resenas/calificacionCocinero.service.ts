import { avg, count, eq } from 'drizzle-orm';
import { calificacionACocinero, pedido } from '@foodhub/db';
import {
  contieneTerminoModerado,
  MENSAJES_RESENA,
  ventanaDeCalificacionAbierta,
  type CalificacionACocinero,
  type CalificarCocineroInput,
  type EstadoCalificacionCocinero,
  type ReputacionCocinero,
} from '@foodhub/shared';
import { db } from '../../lib/db.js';
import { AppError, noEncontrado } from '../../middleware/error.middleware.js';
import { obtenerParametrosDeResenas } from '../configuracion/parametrosSistema.service.js';
import { todas } from './consultas.js';

/**
 * Modulo de Resenas y Calificaciones — la calificacion del CLIENTE al COCINERO
 * (US-RES-07, RF087).
 *
 * ES LA QUE CONSTRUYE LA REPUTACION DEL COCINERO. No las resenas de los platos:
 * aquellas valoran el PRODUCTO y se anclan en la publicacion, esta valora el
 * SERVICIO -puntualidad, comunicacion, atencion durante la coordinacion y la
 * entrega- y se ancla en el pedido. Son dos metricas independientes que pueden
 * diferir, y el perfil publico las muestra en dos bloques separados.
 *
 * UNA POR PEDIDO. Es la diferencia con las otras dos direcciones y es
 * deliberada: un pedido de seis platos deja una sola calificacion de servicio,
 * igual que uno de un plato, "de modo que un pedido de mayor tamano no incida
 * en mayor medida sobre la reputacion del cocinero". Y cada pedido nuevo
 * habilita una calificacion nueva e independiente, porque cada pedido es una
 * experiencia distinta.
 */

/** Corta si el comentario contiene un termino vetado (RF087). */
function verificarModeracion(
  comentario: string | undefined,
  terminos: readonly string[],
): void {
  if (!comentario) return;
  if (contieneTerminoModerado(comentario, terminos)) {
    throw new AppError(
      400,
      MENSAJES_RESENA.calificacionConTerminosModerados,
      'COMENTARIO_MODERADO',
    );
  }
}

/**
 * El pedido, con lo justo para decidir si este cliente puede calificarlo.
 *
 * Devuelve `null` si el pedido no existe. Que el cliente sea el dueno y que el
 * estado sea COMPLETADO los evalua el llamador, porque cada uno responde con un
 * error distinto.
 */
async function pedidoParaCalificar(pedidoId: string) {
  const [fila] = await db
    .select({
      clienteId: pedido.clientePedidoId,
      cocineroId: pedido.cocineroPedidoId,
      estado: pedido.estadoPedidoActual,
    })
    .from(pedido)
    .where(eq(pedido.id, pedidoId))
    .limit(1);

  return fila ?? null;
}

/** La calificacion existente de un pedido, o `null`. */
async function calificacionDelPedido(pedidoId: string) {
  const [fila] = await db
    .select({
      id: calificacionACocinero.id,
      pedidoId: calificacionACocinero.pedidoId,
      calificacion: calificacionACocinero.calificacion,
      comentario: calificacionACocinero.comentario,
      tags: calificacionACocinero.tags,
      editada: calificacionACocinero.editada,
      fechaPublicacion: calificacionACocinero.fechaPublicacion,
    })
    .from(calificacionACocinero)
    .where(eq(calificacionACocinero.pedidoId, pedidoId))
    .limit(1);

  return fila ?? null;
}

function aCalificacion(fila: {
  id: string;
  pedidoId: string;
  calificacion: number;
  comentario: string | null;
  tags: string[] | null;
  editada: boolean;
  fechaPublicacion: Date;
}): CalificacionACocinero {
  return {
    id: fila.id,
    pedidoId: fila.pedidoId,
    calificacion: fila.calificacion,
    comentario: fila.comentario,
    tags: fila.tags ?? [],
    editada: fila.editada,
    fechaPublicacion: fila.fechaPublicacion.toISOString(),
  };
}

/**
 * US-RES-07 - Alta de la calificacion al cocinero de un pedido.
 *
 * TRES PUERTAS, EN ESTE ORDEN:
 *
 *   1. propiedad  el pedido tiene que ser de este cliente;
 *   2. estado     tiene que estar COMPLETADO -a diferencia de la calificacion
 *                 al cliente, que se habilita desde ACEPTADO: aquella existe
 *                 justamente para dejar constancia de un pedido que fracaso, y
 *                 esta valora un servicio que se presto;
 *   3. moderacion el comentario no puede contener terminos vetados.
 *
 * La unicidad NO se verifica leyendo antes: la garantiza el indice
 * `calificacion_a_cocinero_pedido_uq` y se traduce el error en el `catch`. Un
 * "select y despues insert" abriria una carrera entre dos toques rapidos del
 * boton.
 */
export async function calificarCocinero(entrada: {
  clienteId: string;
  pedidoId: string;
  datos: CalificarCocineroInput;
}): Promise<CalificacionACocinero> {
  const { clienteId, pedidoId, datos } = entrada;

  const suPedido = await pedidoParaCalificar(pedidoId);
  if (!suPedido) throw noEncontrado('el pedido');

  if (suPedido.clienteId !== clienteId || suPedido.estado !== 'COMPLETADO') {
    throw new AppError(
      403,
      MENSAJES_RESENA.sinDerechoACalificarCocinero,
      'SIN_DERECHO_A_CALIFICAR',
    );
  }

  const parametros = await obtenerParametrosDeResenas();
  verificarModeracion(datos.comentario, parametros.terminosModeracion);

  try {
    const [fila] = await db
      .insert(calificacionACocinero)
      .values({
        pedidoId,
        clienteId,
        cocineroId: suPedido.cocineroId,
        calificacion: datos.calificacion,
        comentario: datos.comentario ?? null,
        tags: datos.tags,
      })
      .returning({
        id: calificacionACocinero.id,
        pedidoId: calificacionACocinero.pedidoId,
        calificacion: calificacionACocinero.calificacion,
        comentario: calificacionACocinero.comentario,
        tags: calificacionACocinero.tags,
        editada: calificacionACocinero.editada,
        fechaPublicacion: calificacionACocinero.fechaPublicacion,
      });

    if (!fila) throw new Error('la calificación no devolvió ninguna fila');
    return aCalificacion(fila);
  } catch (error) {
    if (esViolacionDeUnicidad(error)) {
      throw new AppError(
        409,
        MENSAJES_RESENA.calificacionYaExiste,
        'CALIFICACION_YA_EXISTE',
      );
    }
    throw error;
  }
}

/**
 * `true` si el error es el choque contra el indice unico por pedido.
 *
 * Postgres devuelve `23505` en `code`; el driver lo propaga como propiedad del
 * error sin tiparlo, asi que se lee con un estrechamiento en lugar de un cast.
 */
function esViolacionDeUnicidad(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '23505'
  );
}

/**
 * US-RES-07 - Edicion dentro de la ventana de 48 horas.
 *
 * NO REVALIDA EL DERECHO, solo la propiedad y el plazo. Es la misma regla
 * transversal que rige para la resena del plato: "las ediciones posteriores no
 * revalidan, de modo que una resena legitima no se invalide si el pedido se
 * archiva o se purga".
 *
 * LA VENTANA NO SE REABRE. A diferencia de la resena del plato, que reabre 48
 * horas con cada pedido completado del mismo plato, esta refiere a la
 * experiencia de UN pedido determinado: pasadas las 48 horas de su publicacion
 * queda congelada, y un pedido posterior al mismo cocinero habilita una
 * calificacion nueva en lugar de reabrir esta.
 */
export async function editarCalificacionDeCocinero(entrada: {
  clienteId: string;
  calificacionId: string;
  datos: CalificarCocineroInput;
}): Promise<CalificacionACocinero> {
  const { clienteId, calificacionId, datos } = entrada;

  const [existente] = await db
    .select({
      clienteId: calificacionACocinero.clienteId,
      fechaPublicacion: calificacionACocinero.fechaPublicacion,
    })
    .from(calificacionACocinero)
    .where(eq(calificacionACocinero.id, calificacionId))
    .limit(1);

  if (!existente) throw noEncontrado('la calificación');

  if (existente.clienteId !== clienteId) {
    throw new AppError(
      403,
      MENSAJES_RESENA.sinDerechoACalificarCocinero,
      'SIN_DERECHO_A_CALIFICAR',
    );
  }

  if (!ventanaDeCalificacionAbierta(existente.fechaPublicacion)) {
    throw new AppError(
      403,
      MENSAJES_RESENA.edicionDeCalificacionVencida,
      'EDICION_FUERA_DE_VENTANA',
    );
  }

  const parametros = await obtenerParametrosDeResenas();
  verificarModeracion(datos.comentario, parametros.terminosModeracion);

  const [fila] = await db
    .update(calificacionACocinero)
    .set({
      calificacion: datos.calificacion,
      comentario: datos.comentario ?? null,
      tags: datos.tags,
      editada: true,
      fechaUltimaEdicion: new Date(),
    })
    .where(eq(calificacionACocinero.id, calificacionId))
    .returning({
      id: calificacionACocinero.id,
      pedidoId: calificacionACocinero.pedidoId,
      calificacion: calificacionACocinero.calificacion,
      comentario: calificacionACocinero.comentario,
      tags: calificacionACocinero.tags,
      editada: calificacionACocinero.editada,
      fechaPublicacion: calificacionACocinero.fechaPublicacion,
    });

  if (!fila) throw new Error('la edición no devolvió ninguna fila');
  return aCalificacion(fila);
}

/**
 * RF031 - Cual de las tres acciones corresponde para un pedido.
 *
 * Se resuelve en el servidor porque depende del estado del pedido y de un
 * plazo. Un pedido ajeno o inexistente devuelve las tres banderas en falso en
 * lugar de un error: la pantalla no tiene que distinguir "no podes" de "no
 * existe", y devolver 404 filtraria la existencia de pedidos de terceros.
 */
export async function estadoDeCalificacionDeCocinero(entrada: {
  clienteId: string;
  pedidoId: string;
}): Promise<EstadoCalificacionCocinero> {
  const { clienteId, pedidoId } = entrada;
  const sinDerecho = {
    pedidoId,
    calificacionId: null,
    puedeCalificar: false,
    puedeEditar: false,
  };

  const suPedido = await pedidoParaCalificar(pedidoId);
  if (suPedido?.clienteId !== clienteId) return sinDerecho;

  const existente = await calificacionDelPedido(pedidoId);

  if (existente) {
    return {
      pedidoId,
      calificacionId: existente.id,
      puedeCalificar: false,
      puedeEditar: ventanaDeCalificacionAbierta(existente.fechaPublicacion),
    };
  }

  return {
    pedidoId,
    calificacionId: null,
    puedeCalificar: suPedido.estado === 'COMPLETADO',
    puedeEditar: false,
  };
}

/** US-RES-07 - Una calificacion puntual, para precargar la edicion o verla. */
export async function leerCalificacionDeCocinero(entrada: {
  clienteId: string;
  calificacionId: string;
}): Promise<CalificacionACocinero> {
  const [fila] = await db
    .select({
      id: calificacionACocinero.id,
      pedidoId: calificacionACocinero.pedidoId,
      clienteId: calificacionACocinero.clienteId,
      calificacion: calificacionACocinero.calificacion,
      comentario: calificacionACocinero.comentario,
      tags: calificacionACocinero.tags,
      editada: calificacionACocinero.editada,
      fechaPublicacion: calificacionACocinero.fechaPublicacion,
    })
    .from(calificacionACocinero)
    .where(eq(calificacionACocinero.id, entrada.calificacionId))
    .limit(1);

  if (!fila) throw noEncontrado('la calificación');

  /**
   * La calificacion al cocinero NO es publica como la resena: la escribio este
   * cliente y solo el la lee en detalle. En el perfil del cocinero se muestra
   * agregada, nunca fila por fila.
   */
  if (fila.clienteId !== entrada.clienteId) {
    throw new AppError(
      403,
      MENSAJES_RESENA.sinDerechoACalificarCocinero,
      'SIN_DERECHO_A_CALIFICAR',
    );
  }

  return aCalificacion(fila);
}

/**
 * RF082 - Bloque de reputacion del perfil publico del cocinero.
 *
 * SIN MINIMO (decision del equipo, 2026-09-02): el promedio se muestra desde la
 * primera calificacion. `resena_minimo_para_promedio` sigue rigiendo donde ya
 * regia, sobre el promedio derivado de las resenas de platos que calcula
 * `lib/valoraciones.ts`.
 *
 * Solo cuentan las VISIBLE, que es lo que exige el requisito y lo que cubre el
 * indice parcial `calificacion_a_cocinero_cocinero_idx`.
 */
export async function reputacionDeCocinero(
  cocineroId: string,
): Promise<ReputacionCocinero> {
  const visiblesDelCocinero = todas([
    eq(calificacionACocinero.cocineroId, cocineroId),
    eq(calificacionACocinero.estadoResena, 'VISIBLE'),
  ]);

  const [[agregado], porNivel] = await Promise.all([
    db
      .select({
        promedio: avg(calificacionACocinero.calificacion),
        cantidad: count(),
      })
      .from(calificacionACocinero)
      .where(visiblesDelCocinero),
    db
      .select({
        nivel: calificacionACocinero.calificacion,
        cantidad: count(),
      })
      .from(calificacionACocinero)
      .where(visiblesDelCocinero)
      .groupBy(calificacionACocinero.calificacion),
  ]);

  /**
   * Los cinco niveles se inicializan en cero antes de volcar lo que devolvio la
   * base: la consulta agrupada omite los niveles sin filas, y la pantalla dibuja
   * cinco barras siempre. Sin esto, un cocinero con solo cincos mostraria una
   * barra y no cinco.
   */
  const distribucion: Record<string, number> = {
    '1': 0,
    '2': 0,
    '3': 0,
    '4': 0,
    '5': 0,
  };
  for (const fila of porNivel) {
    distribucion[String(fila.nivel)] = fila.cantidad;
  }

  const promedioCrudo = agregado?.promedio ?? null;

  return {
    promedio:
      promedioCrudo === null
        ? null
        : Math.round(Number(promedioCrudo) * 10) / 10,
    total: agregado?.cantidad ?? 0,
    distribucion,
  };
}
