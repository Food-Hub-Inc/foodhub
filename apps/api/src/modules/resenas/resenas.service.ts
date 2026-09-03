import { asc, count, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import { publicacion, resena, usuario } from '@foodhub/db';
import {
  contieneTerminoModerado,
  dentroDelPlazoParaResenar,
  MENSAJES_RESENA,
  ventanaDeEdicionAbierta,
  type CrearResenaInput,
  type EditarResenaInput,
  type EstadoResenaPublicacion,
  type FiltrosResenas,
  type PaginaResenas,
  type ResenaPublica,
  type ResumenResenas,
} from '@foodhub/shared';
import { db } from '../../lib/db.js';
import { AppError, noEncontrado } from '../../middleware/error.middleware.js';
import { obtenerParametrosDeResenas } from '../configuracion/parametrosSistema.service.js';
import {
  aResenaPublica,
  columnasResena,
  todas,
  ultimoCompletadoDelPlato,
} from './consultas.js';
import { contextosDeResenas } from './social.service.js';

/**
 * Modulo de Resenas y Calificaciones — la resena del plato
 * (US-RES-01 y US-RES-03, RF080 y RF082).
 *
 * LA RESENA ES POR PLATO, NO POR PEDIDO. El pedido no se guarda en ningun lado:
 * su unico papel es habilitar el derecho a opinar, y eso se verifica POR
 * CONSULTA en el momento del alta. La version corregida del modulo lo dice
 * explicitamente: "las ediciones posteriores no revalidan, de modo que una
 * resena legitima no se invalide si el pedido se archiva o se purga".
 */

// ---------------------------------------------------------------------------
// Alta y edicion (US-RES-01)
// ---------------------------------------------------------------------------

/**
 * Corta si el comentario contiene un termino vetado (RF080).
 *
 * La lista sale de `configuracion_sistema` y arranca vacia, con lo cual el
 * filtro es transparente hasta que un administrador la cargue desde PAN-ADM-04.
 * Se comprueba en el servidor aunque la pantalla ya lo haya hecho: una
 * validacion que el cliente puede saltear no es un control.
 */
function verificarModeracion(
  comentario: string | undefined,
  terminos: readonly string[],
): void {
  if (!comentario) return;
  if (contieneTerminoModerado(comentario, terminos)) {
    throw new AppError(
      400,
      MENSAJES_RESENA.comentarioModerado,
      'COMENTARIO_MODERADO',
    );
  }
}

/**
 * US-RES-01 - Alta de la resena de un plato. PAN-RES-01.
 *
 * TRES PUERTAS, EN ESTE ORDEN, y ninguna se puede saltear desde la app:
 *
 *   1. derecho    tiene que existir un pedido COMPLETADO del cliente con ese
 *                 plato;
 *   2. plazo      no puede haber pasado `resena_limite_dias_para_resenar` desde
 *                 ese completado;
 *   3. moderacion el comentario no puede contener terminos vetados.
 *
 * La unicidad no se verifica leyendo antes: la garantiza el indice
 * `resena_cliente_publicacion_uq` y se traduce el error en el `catch`. Un
 * "select y despues insert" abriria una carrera entre dos toques rapidos del
 * boton, y el indice la convertiria igual en un error, pero uno sin mensaje
 * util.
 */
export async function crearResena(entrada: {
  clienteId: string;
  datos: CrearResenaInput;
}): Promise<ResenaPublica> {
  const { clienteId, datos } = entrada;

  const [plato] = await db
    .select({ cocineroId: publicacion.cocineroId })
    .from(publicacion)
    .where(eq(publicacion.id, datos.publicacionId))
    .limit(1);

  if (!plato) throw noEncontrado('la publicación');

  const ultimoCompletado = await ultimoCompletadoDelPlato({
    clienteId,
    publicacionId: datos.publicacionId,
  });

  if (ultimoCompletado === null) {
    throw new AppError(
      403,
      MENSAJES_RESENA.sinDerechoAResenar,
      'SIN_DERECHO_A_RESENAR',
    );
  }

  const parametros = await obtenerParametrosDeResenas();

  if (
    !dentroDelPlazoParaResenar({
      ultimoPedidoCompletado: ultimoCompletado,
      limiteDias: parametros.limiteDiasParaResenar,
    })
  ) {
    throw new AppError(
      409,
      MENSAJES_RESENA.plazoParaResenarVencido,
      'PLAZO_RESENA_VENCIDO',
    );
  }

  verificarModeracion(datos.comentario, parametros.terminosModeracion);

  const filaNueva = await insertarResena({
    clienteId,
    cocineroId: plato.cocineroId,
    datos,
  });

  return leerResenaPublica(filaNueva.id, clienteId);
}

/** Inserta y traduce la violacion de unicidad al mensaje que corresponde. */
async function insertarResena(entrada: {
  clienteId: string;
  cocineroId: string;
  datos: CrearResenaInput;
}): Promise<{ id: string }> {
  try {
    const [fila] = await db
      .insert(resena)
      .values({
        publicacionId: entrada.datos.publicacionId,
        clienteResId: entrada.clienteId,
        cocineroResId: entrada.cocineroId,
        calificacion: entrada.datos.calificacion,
        comentario: entrada.datos.comentario ?? null,
        tags: entrada.datos.tags,
        fotoUrl: entrada.datos.fotoUrl,
      })
      .returning({ id: resena.id });

    if (!fila) throw new Error('el alta de la reseña no devolvió ninguna fila');
    return fila;
  } catch (error) {
    if (esViolacionDeUnicidad(error)) {
      throw new AppError(
        409,
        MENSAJES_RESENA.resenaYaExiste,
        'RESENA_YA_EXISTE',
      );
    }
    throw error;
  }
}

/**
 * `23505` es el SQLSTATE de unique_violation en PostgreSQL.
 *
 * Se mira el codigo y no el texto del error: el mensaje depende del idioma del
 * servidor y del nombre del indice, y los dos pueden cambiar sin aviso.
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
 * US-RES-01 - Edicion dentro de la ventana de 48 horas.
 *
 * NO REVALIDA EL DERECHO A OPINAR, por decision explicita de la version
 * corregida: el pedido que habilito la resena puede haberse archivado, y una
 * resena legitima no puede invalidarse por eso. Lo unico que se comprueba es
 * que la resena sea del cliente de la sesion y que la ventana siga abierta.
 */
export async function editarResena(entrada: {
  clienteId: string;
  resenaId: string;
  datos: EditarResenaInput;
}): Promise<ResenaPublica> {
  const { clienteId, resenaId, datos } = entrada;

  const [actual] = await db
    .select({
      publicacionId: resena.publicacionId,
      fechaPublicacion: resena.fechaPublicacion,
    })
    .from(resena)
    .where(todas([eq(resena.id, resenaId), eq(resena.clienteResId, clienteId)]))
    .limit(1);

  // Una resena ajena "no existe": mismo criterio que Pedidos, para no
  // confirmarle a nadie que ese identificador corresponde a algo real.
  if (!actual) throw noEncontrado('la reseña');

  const ultimoCompletado = await ultimoCompletadoDelPlato({
    clienteId,
    publicacionId: actual.publicacionId,
  });

  if (
    !ventanaDeEdicionAbierta({
      fechaPublicacion: actual.fechaPublicacion,
      ultimoPedidoCompletado: ultimoCompletado,
    })
  ) {
    throw new AppError(
      409,
      MENSAJES_RESENA.edicionFueraDeVentana,
      'EDICION_FUERA_DE_VENTANA',
    );
  }

  const parametros = await obtenerParametrosDeResenas();
  verificarModeracion(datos.comentario, parametros.terminosModeracion);

  await db
    .update(resena)
    .set({
      calificacion: datos.calificacion,
      comentario: datos.comentario ?? null,
      tags: datos.tags,
      fotoUrl: datos.fotoUrl,
      // `editada` alimenta el "(editada)" que la pantalla muestra junto a la
      // fecha original, igual que hace la respuesta del cocinero en US-RES-05.
      editada: true,
      fechaUltimaEdicion: sql`now()`,
    })
    .where(eq(resena.id, resenaId));

  return leerResenaPublica(resenaId, clienteId);
}

// ---------------------------------------------------------------------------
// Estado por publicacion (RF031)
// ---------------------------------------------------------------------------

/**
 * Que boton corresponde mostrar sobre cada plato de un pedido: "Dejar resena",
 * "Editar mi resena" o "Ver mi resena".
 *
 * SE RESUELVE EN EL SERVIDOR porque la respuesta depende de dos plazos y del
 * historial completo de pedidos del cliente con ese plato, nada de lo cual la
 * pantalla conoce. Y se resuelve PARA VARIAS PUBLICACIONES DE UNA VEZ porque el
 * detalle de un pedido tiene tantos platos como items: una consulta por item
 * seria el problema N+1 en la pantalla mas transitada del cliente.
 */
export async function estadoDeResenas(entrada: {
  clienteId: string;
  publicacionIds: readonly string[];
}): Promise<EstadoResenaPublicacion[]> {
  const { clienteId, publicacionIds } = entrada;
  if (publicacionIds.length === 0) return [];

  const [existentes, parametros] = await Promise.all([
    db
      .select({
        id: resena.id,
        publicacionId: resena.publicacionId,
        fechaPublicacion: resena.fechaPublicacion,
      })
      .from(resena)
      .where(
        todas([
          eq(resena.clienteResId, clienteId),
          inArray(resena.publicacionId, [...publicacionIds]),
        ]),
      ),
    obtenerParametrosDeResenas(),
  ]);

  const porPublicacion = new Map(existentes.map((f) => [f.publicacionId, f]));

  return Promise.all(
    publicacionIds.map(async (publicacionId) => {
      const ultimoCompletado = await ultimoCompletadoDelPlato({
        clienteId,
        publicacionId,
      });
      const existente = porPublicacion.get(publicacionId);

      if (existente) {
        return {
          publicacionId,
          resenaId: existente.id,
          puedeResenar: false,
          puedeEditar: ventanaDeEdicionAbierta({
            fechaPublicacion: existente.fechaPublicacion,
            ultimoPedidoCompletado: ultimoCompletado,
          }),
        };
      }

      return {
        publicacionId,
        resenaId: null,
        puedeResenar:
          ultimoCompletado !== null &&
          dentroDelPlazoParaResenar({
            ultimoPedidoCompletado: ultimoCompletado,
            limiteDias: parametros.limiteDiasParaResenar,
          }),
        puedeEditar: false,
      };
    }),
  );
}

// ---------------------------------------------------------------------------
// Listado del perfil publico (US-RES-03)
// ---------------------------------------------------------------------------

/** Solo las VISIBLE se muestran y promedian: las otras dos estan ocultas o retiradas. */
function resenasVisiblesDe(cocineroId: string): SQL {
  return todas([
    eq(resena.cocineroResId, cocineroId),
    eq(resena.estadoResena, 'VISIBLE'),
  ]);
}

/**
 * El listado NO filtra por `publicacion.activo`.
 *
 * Es explicito en RF082: "se incluyen las resenas de publicaciones dadas de
 * baja u ocultas, dado que la reputacion construida no debe perderse al retirar
 * un plato del catalogo". Lo unico que cambia para esas es el nombre del plato
 * y que el enlace deja de navegar, y eso lo resuelve `aResenaPublica`.
 */
function consultaBase(cocineroId: string, filtros: FiltrosResenas) {
  const condiciones = [resenasVisiblesDe(cocineroId)];

  if (filtros.estrellas.length > 0) {
    condiciones.push(inArray(resena.calificacion, filtros.estrellas));
  }
  if (filtros.soloConFoto) {
    condiciones.push(sql`${resena.fotoUrl} is not null`);
  }
  /**
   * US-RES-05: "Solo resenas con respuesta del cocinero". Se resuelve con un
   * EXISTS y no con un join: el join duplicaria la fila si algun dia hubiera
   * mas de una respuesta, y aca solo interesa si hay alguna.
   */
  if (filtros.soloConRespuesta) {
    condiciones.push(sql`exists (
      select 1 from respuesta_cocinero rc where rc.resena_id = ${resena.id}
    )`);
  }

  return todas(condiciones);
}

/**
 * Orden del listado.
 *
 * "MAS_UTILES" ordena por cantidad de "Me gusta" (US-RES-04). Se cuenta con un
 * subselect correlacionado en lugar de un join agrupado: el join obligaria a
 * agrupar toda la consulta por las quince columnas de la resena para contar una
 * cifra que solo se usa para ordenar.
 *
 * Todos los ordenes desempatan por fecha: sin eso, dos resenas con la misma
 * cantidad de likes podrian salir en distinto orden en cada pagina y el scroll
 * infinito repetiria o saltearia filas.
 */
function ordenDe(filtros: FiltrosResenas) {
  if (filtros.orden === 'MEJOR_CALIFICACION') {
    return [desc(resena.calificacion), desc(resena.fechaPublicacion)];
  }
  if (filtros.orden === 'PEOR_CALIFICACION') {
    return [asc(resena.calificacion), desc(resena.fechaPublicacion)];
  }
  if (filtros.orden === 'MAS_UTILES') {
    return [
      desc(sql`(
        select count(*) from reaccion_resena rr
         where rr.resena_id = ${resena.id} and rr.tipo = 'ME_GUSTA'
      )`),
      desc(resena.fechaPublicacion),
    ];
  }
  return [desc(resena.fechaPublicacion)];
}

/**
 * Cabecera de la seccion: promedio, total, distribucion y cuantas traen foto.
 *
 * Se resuelve con UNA consulta agrupada por calificacion, de la que se derivan
 * las tres cifras. Pedirlas por separado serian tres recorridas de la misma
 * tabla para dibujar un encabezado.
 *
 * IMPORTANTE: el resumen NO aplica los filtros del listado. El promedio y la
 * distribucion describen la reputacion completa del cocinero; si se recalcularan
 * con el filtro puesto, marcar "4 estrellas" mostraria un promedio de 4,0 y las
 * barras al 100% en ese nivel, que no es informacion sino un espejo del filtro.
 */
async function calcularResumen(cocineroId: string): Promise<ResumenResenas> {
  const filas = await db
    .select({
      calificacion: resena.calificacion,
      cantidad: count(),
      conFoto: sql<number>`count(${resena.fotoUrl})::int`,
    })
    .from(resena)
    .where(resenasVisiblesDe(cocineroId))
    .groupBy(resena.calificacion);

  const distribucion: Record<string, number> = {
    '1': 0,
    '2': 0,
    '3': 0,
    '4': 0,
    '5': 0,
  };

  let total = 0;
  let conFoto = 0;
  let suma = 0;

  for (const fila of filas) {
    distribucion[String(fila.calificacion)] = fila.cantidad;
    total += fila.cantidad;
    conFoto += fila.conFoto;
    suma += fila.calificacion * fila.cantidad;
  }

  const { minimoResenasParaPromedio } = await obtenerParametrosDeResenas();
  const alcanzaMinimo = total >= minimoResenasParaPromedio;

  return {
    // Un decimal, como pide RF082. `null` mientras no se alcance el minimo: con
    // dos opiniones un promedio no describe a nadie.
    promedio:
      alcanzaMinimo && total > 0 ? Math.round((suma / total) * 10) / 10 : null,
    total,
    conFoto,
    alcanzaMinimoParaPromedio: alcanzaMinimo,
    distribucion,
  };
}

/**
 * US-RES-03 - Listado paginado de las resenas de un cocinero. PAN-EXP-04.
 *
 * `usuarioId` es quien MIRA, no de quien son las resenas. De el dependen las
 * tres marcas de US-RES-04 y US-RES-06 que viajan con cada fila: cual es su
 * reaccion, si la resena es suya y si ya la reporto.
 */
export async function listarResenasDeCocinero(entrada: {
  cocineroId: string;
  usuarioId: string;
  filtros: FiltrosResenas;
}): Promise<PaginaResenas> {
  const { cocineroId, usuarioId, filtros } = entrada;
  const filtro = consultaBase(cocineroId, filtros);

  const [filas, [totalizador], resumen] = await Promise.all([
    db
      .select(columnasResena)
      .from(resena)
      .innerJoin(publicacion, eq(publicacion.id, resena.publicacionId))
      .innerJoin(usuario, eq(usuario.id, resena.clienteResId))
      .where(filtro)
      .orderBy(...ordenDe(filtros))
      .limit(filtros.porPagina)
      .offset((filtros.pagina - 1) * filtros.porPagina),
    db.select({ total: count() }).from(resena).where(filtro),
    calcularResumen(cocineroId),
  ]);

  const contextos = await contextosDeResenas({
    resenaIds: filas.map((fila) => fila.id),
    usuarioId,
  });

  return {
    datos: filas.map((fila) => aResenaPublica(fila, contextos.get(fila.id))),
    resumen,
    total: totalizador?.total ?? 0,
    pagina: filtros.pagina,
    porPagina: filtros.porPagina,
  };
}

/**
 * Una resena puntual.
 *
 * Se usa para devolverla despues de crearla o editarla, y tambien para
 * precargar el formulario de edicion (US-RES-01: "muestre el formulario
 * precargado"). No filtra por autor ni por estado: la resena es contenido
 * publico —se muestra en el perfil del cocinero a cualquiera con sesion— y el
 * permiso que importa, el de MODIFICARLA, lo verifica `editarResena`.
 */
export async function leerResenaPublica(
  resenaId: string,
  usuarioId: string,
): Promise<ResenaPublica> {
  const [fila] = await db
    .select(columnasResena)
    .from(resena)
    .innerJoin(publicacion, eq(publicacion.id, resena.publicacionId))
    .innerJoin(usuario, eq(usuario.id, resena.clienteResId))
    .where(eq(resena.id, resenaId))
    .limit(1);

  if (!fila) throw noEncontrado('la reseña');

  const contextos = await contextosDeResenas({
    resenaIds: [fila.id],
    usuarioId,
  });
  return aResenaPublica(fila, contextos.get(fila.id));
}
