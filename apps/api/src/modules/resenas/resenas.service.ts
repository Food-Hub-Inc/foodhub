import { asc, count, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import { publicacion, resena, usuario } from '@foodhub/db';
import {
  contieneTerminoModerado,
  dentroDelPlazoParaResenar,
  MENSAJES_RESENA,
  ventanaDeEdicionAbierta,
  type CrearResenaInput,
  type EditarResenaInput,
  type EstadoResenaPersona,
  type EstadoResenaPublicacion,
  type FiltrosResenas,
  type PaginaResenas,
  type ResenaPublica,
  type ResumenResenas,
  type TipoResena,
} from '@foodhub/shared';
import { db } from '../../lib/db.js';
import { AppError, noEncontrado } from '../../middleware/error.middleware.js';
import { obtenerParametrosDeResenas } from '../configuracion/parametrosSistema.service.js';
import {
  aResenaPublica,
  columnasResena,
  existePedidoCompletadoConCocinero,
  hubopedidoAceptado,
  todas,
  ultimoCompletadoDelPlato,
} from './consultas.js';
import { contextosDeResenas } from './social.service.js';

/**
 * Modulo de Resenas y Calificaciones (US-RES-01 a US-RES-07, RF080 a RF087).
 *
 * UNA RESENA SE IDENTIFICA POR (AUTOR, OBJETO RESENADO), y el objeto es un
 * PLATO, un COCINERO o un CLIENTE. EL PEDIDO NO SE GUARDA EN NINGUN LADO: su
 * unico papel es habilitar el derecho a opinar, y eso se verifica POR CONSULTA
 * en el momento del alta. La version corregida del modulo lo dice
 * explicitamente: "las ediciones posteriores no revalidan, de modo que una
 * resena legitima no se invalide si el pedido se archiva o se purga".
 *
 * LOS TRES TIPOS NO SE COMPORTAN IGUAL EN DOS PUNTOS, y conviene tenerlos
 * juntos porque es lo que explica casi todas las ramas de este archivo:
 *
 *   | tipo     | derecho a opinar         | volver a opinar    | ventana |
 *   | -------- | ------------------------ | ------------------ | ------- |
 *   | PLATO    | pedido COMPLETADO con el | 409, hay que editar | 48 h    |
 *   | COCINERO | pedido COMPLETADO con el | reemplaza la suya   | sin     |
 *   | CLIENTE  | pedido ACEPTADO con el   | reemplaza la suya   | sin     |
 *
 * La resena de PLATO conserva sus plazos porque describe un producto que se
 * consumio una vez. Las otras dos son la opinion VIGENTE sobre una persona:
 * congelarlas obligaria a arrastrar para siempre una opinion que ya cambio.
 */

// ---------------------------------------------------------------------------
// Alta y edicion (US-RES-01, US-RES-02, US-RES-07)
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
 * Donde apunta una resena, ya resuelto contra la base y listo para insertar.
 *
 * Las tres columnas viajan juntas porque el CHECK `resena_destino_segun_tipo`
 * las evalua juntas: dejar una fuera de lugar es un error de la base, no un
 * `undefined` silencioso.
 */
interface Destino {
  publicacionId: string | null;
  cocineroResId: string | null;
  clienteDestinoId: string | null;
}

/** El destino de una resena de plato, con sus dos plazos ya verificados. */
async function destinoDelPlato(
  clienteId: string,
  publicacionId: string,
): Promise<Destino> {
  const [plato] = await db
    .select({ cocineroId: publicacion.cocineroId })
    .from(publicacion)
    .where(eq(publicacion.id, publicacionId))
    .limit(1);

  if (!plato) throw noEncontrado('la publicación');

  const ultimoCompletado = await ultimoCompletadoDelPlato({
    clienteId,
    publicacionId,
  });

  if (ultimoCompletado === null) {
    throw new AppError(
      403,
      MENSAJES_RESENA.sinDerechoAResenar,
      'SIN_DERECHO_A_RESENAR',
    );
  }

  const { limiteDiasParaResenar } = await obtenerParametrosDeResenas();
  if (
    !dentroDelPlazoParaResenar({
      ultimoPedidoCompletado: ultimoCompletado,
      limiteDias: limiteDiasParaResenar,
    })
  ) {
    throw new AppError(
      409,
      MENSAJES_RESENA.plazoParaResenarVencido,
      'PLAZO_RESENA_VENCIDO',
    );
  }

  return {
    publicacionId,
    cocineroResId: plato.cocineroId,
    clienteDestinoId: null,
  };
}

/**
 * Verifica el derecho a opinar y devuelve el destino de la resena.
 *
 * Las tres ramas preguntan lo mismo con distinto sujeto -"hubo un pedido que
 * habilite esto?"- y las tres responden contra el historial de pedidos, nunca
 * contra la cabecera. Ver la cabecera de `consultas.ts` para el porque.
 *
 * La del PLATO vive aparte porque es la unica con DOS plazos que verificar: el
 * derecho y el limite de dias para usarlo.
 */
async function resolverDestino(
  autorId: string,
  datos: CrearResenaInput,
): Promise<Destino> {
  if (datos.tipo === 'PLATO') {
    return destinoDelPlato(autorId, datos.publicacionId);
  }

  if (datos.tipo === 'COCINERO') {
    const habilitado = await existePedidoCompletadoConCocinero({
      clienteId: autorId,
      cocineroId: datos.cocineroId,
    });

    if (!habilitado) {
      throw new AppError(
        403,
        MENSAJES_RESENA.sinPedidoCompletadoConCocinero,
        'SIN_DERECHO_A_RESENAR',
      );
    }

    return {
      publicacionId: null,
      cocineroResId: datos.cocineroId,
      clienteDestinoId: null,
    };
  }

  // CLIENTE. Habilita ACEPTADO y no COMPLETADO a proposito (US-RES-02): el
  // cocinero tiene que poder dejar constancia del cliente que no aparecio a
  // retirar, y ese pedido nunca llega a completarse.
  if (autorId === datos.clienteId) {
    throw new AppError(
      400,
      MENSAJES_RESENA.sinDerechoACalificar,
      'SIN_DERECHO_A_CALIFICAR',
    );
  }

  const habilitado = await hubopedidoAceptado({
    cocineroId: autorId,
    clienteId: datos.clienteId,
  });

  if (!habilitado) {
    throw new AppError(
      403,
      MENSAJES_RESENA.sinDerechoACalificar,
      'SIN_DERECHO_A_CALIFICAR',
    );
  }

  return {
    publicacionId: null,
    cocineroResId: null,
    clienteDestinoId: datos.clienteId,
  };
}

/** La resena que este autor ya dejo sobre este objeto, si existe. */
async function resenaVigente(
  autorId: string,
  destino: Destino,
  tipo: TipoResena,
): Promise<{ id: string } | undefined> {
  const porTipo: SQL =
    tipo === 'PLATO'
      ? eq(resena.publicacionId, destino.publicacionId!)
      : tipo === 'COCINERO'
        ? eq(resena.cocineroResId, destino.cocineroResId!)
        : eq(resena.clienteDestinoId, destino.clienteDestinoId!);

  const [fila] = await db
    .select({ id: resena.id })
    .from(resena)
    .where(
      todas([
        eq(resena.autorId, autorId),
        eq(resena.tipoResena, tipo),
        porTipo,
      ]),
    )
    .limit(1);

  return fila;
}

/**
 * Alta de una resena.
 *
 * ES IDEMPOTENTE EN COCINERO Y CLIENTE, y no en PLATO. En los dos primeros
 * volver a opinar sobre la misma persona reemplaza lo que se habia dicho, asi
 * que el endpoint puede llamarse dos veces sin que la segunda sea un error: la
 * pantalla no tiene que saber de antemano si ya opino. En PLATO se conserva el
 * 409 porque ahi la edicion tiene una ventana de 48 horas y silenciar el
 * choque escondiendo un UPDATE saltearia esa regla.
 */
export async function crearResena(entrada: {
  autorId: string;
  datos: CrearResenaInput;
}): Promise<ResenaPublica> {
  const { autorId, datos } = entrada;

  const destino = await resolverDestino(autorId, datos);

  const { terminosModeracion } = await obtenerParametrosDeResenas();
  verificarModeracion(datos.comentario, terminosModeracion);

  const vigente = await resenaVigente(autorId, destino, datos.tipo);

  if (vigente && datos.tipo !== 'PLATO') {
    await db
      .update(resena)
      .set({
        calificacion: datos.calificacion,
        comentario: datos.comentario ?? null,
        tags: datos.tags,
        editada: true,
        fechaUltimaEdicion: sql`now()`,
      })
      .where(eq(resena.id, vigente.id));

    return leerResenaPublica(vigente.id, autorId);
  }

  const filaNueva = await insertarResena(autorId, destino, datos);
  return leerResenaPublica(filaNueva.id, autorId);
}

/** Inserta y traduce la violacion de unicidad al mensaje que corresponde. */
async function insertarResena(
  autorId: string,
  destino: Destino,
  datos: CrearResenaInput,
): Promise<{ id: string }> {
  try {
    const [fila] = await db
      .insert(resena)
      .values({
        tipoResena: datos.tipo,
        autorId,
        publicacionId: destino.publicacionId,
        cocineroResId: destino.cocineroResId,
        clienteDestinoId: destino.clienteDestinoId,
        calificacion: datos.calificacion,
        comentario: datos.comentario ?? null,
        tags: datos.tags,
        // Solo el formulario de plato ofrece foto (RF080).
        fotoUrl: datos.tipo === 'PLATO' ? datos.fotoUrl : null,
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
 *
 * En COCINERO y CLIENTE tambien puede saltar, aunque el alta lea antes: entre
 * esa lectura y el INSERT cabe un segundo toque del mismo usuario. Ahi el 409
 * es correcto y la pantalla lo resuelve recargando.
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
 * Edicion de una resena propia.
 *
 * NO REVALIDA EL DERECHO A OPINAR, por decision explicita de la version
 * corregida: el pedido que la habilito puede haberse archivado, y una resena
 * legitima no puede invalidarse por eso. Lo unico que se comprueba es que sea
 * del autor de la sesion y, SOLO EN LAS DE PLATO, que la ventana siga abierta.
 */
export async function editarResena(entrada: {
  autorId: string;
  resenaId: string;
  datos: EditarResenaInput;
}): Promise<ResenaPublica> {
  const { autorId, resenaId, datos } = entrada;

  const [actual] = await db
    .select({
      tipoResena: resena.tipoResena,
      publicacionId: resena.publicacionId,
      fechaPublicacion: resena.fechaPublicacion,
    })
    .from(resena)
    .where(todas([eq(resena.id, resenaId), eq(resena.autorId, autorId)]))
    .limit(1);

  // Una resena ajena "no existe": mismo criterio que Pedidos, para no
  // confirmarle a nadie que ese identificador corresponde a algo real.
  if (!actual) throw noEncontrado('la reseña');

  // El tipo del cuerpo tiene que coincidir con el de la fila: de el depende
  // contra que set de tags valido zod, y aceptar otro dejaria entrar un tag
  // que no corresponde a lo que se esta resenando.
  if (actual.tipoResena !== datos.tipo) throw noEncontrado('la reseña');

  if (actual.tipoResena === 'PLATO') {
    const ultimoCompletado = await ultimoCompletadoDelPlato({
      clienteId: autorId,
      publicacionId: actual.publicacionId!,
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
  }

  const { terminosModeracion } = await obtenerParametrosDeResenas();
  verificarModeracion(datos.comentario, terminosModeracion);

  await db
    .update(resena)
    .set({
      calificacion: datos.calificacion,
      comentario: datos.comentario ?? null,
      tags: datos.tags,
      ...(datos.tipo === 'PLATO' ? { fotoUrl: datos.fotoUrl } : {}),
      // `editada` alimenta el "(editada)" que la pantalla muestra junto a la
      // fecha original, igual que hace la respuesta del cocinero en US-RES-05.
      editada: true,
      fechaUltimaEdicion: sql`now()`,
    })
    .where(eq(resena.id, resenaId));

  return leerResenaPublica(resenaId, autorId);
}

// ---------------------------------------------------------------------------
// Que puede hacer el usuario de la sesion (RF031, US-RES-03)
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
          eq(resena.autorId, clienteId),
          eq(resena.tipoResena, 'PLATO'),
          inArray(resena.publicacionId, [...publicacionIds]),
        ]),
      ),
    obtenerParametrosDeResenas(),
  ]);

  const porPublicacion = new Map(
    existentes.flatMap((f) => (f.publicacionId ? [[f.publicacionId, f]] : [])),
  );

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

/**
 * Que puede hacer el usuario de la sesion respecto de OTRA PERSONA.
 *
 * UNA SOLA FUNCION PARA LAS DOS DIRECCIONES. Lo consultan el boton del perfil
 * publico (US-RES-03), el del perfil del cliente y los dos del detalle del
 * pedido (RF031), que desde esta correccion preguntan lo mismo: la resena
 * sobre una persona es una sola, sin importar por cual de sus pedidos se
 * llegue.
 *
 * LO QUE CAMBIA ENTRE LAS DOS ES EL HITO QUE HABILITA, y esa diferencia es de
 * la historia, no del modelo: COMPLETADO para resenar a un cocinero, ACEPTADO
 * para resenar a un cliente -US-RES-02 quiere que el cocinero pueda dejar
 * constancia del que no aparecio a retirar, y ese pedido nunca se completa-.
 *
 * Devuelve tambien la resena vigente para que el formulario se precargue con
 * una sola consulta en vez de encadenar dos.
 */
export async function estadoDeResenaSobrePersona(entrada: {
  autorId: string;
  personaId: string;
  tipo: 'COCINERO' | 'CLIENTE';
}): Promise<EstadoResenaPersona> {
  const { autorId, personaId, tipo } = entrada;

  const columnaDestino =
    tipo === 'COCINERO' ? resena.cocineroResId : resena.clienteDestinoId;

  const [habilitado, [fila]] = await Promise.all([
    tipo === 'COCINERO'
      ? existePedidoCompletadoConCocinero({
          clienteId: autorId,
          cocineroId: personaId,
        })
      : hubopedidoAceptado({ cocineroId: autorId, clienteId: personaId }),
    db
      .select({ id: resena.id })
      .from(resena)
      .where(
        todas([
          eq(resena.autorId, autorId),
          eq(resena.tipoResena, tipo),
          eq(columnaDestino, personaId),
        ]),
      )
      .limit(1),
  ]);

  return {
    puedeResenar: habilitado,
    mia: fila ? await leerResenaPublica(fila.id, autorId) : null,
  };
}

// ---------------------------------------------------------------------------
// Listados (US-RES-03, RF019, US-RES-02)
// ---------------------------------------------------------------------------

/**
 * De quien o de que son las resenas que se piden.
 *
 * UN DESCRIPTOR Y NO CUATRO FUNCIONES porque los cuatro listados comparten
 * todo lo demas -orden, filtros, paginado, resumen y contexto social- y solo
 * difieren en esta condicion. `PLATOS_DEL_COCINERO` es el unico que no
 * corresponde a un tipo de resena: son las de tipo PLATO de todos sus platos,
 * y es lo que alimenta "Mis resenas" (PAN-RES-02).
 */
export type ObjetoResenado =
  | { tipo: 'PLATO'; publicacionId: string }
  | { tipo: 'COCINERO'; cocineroId: string }
  | { tipo: 'PLATOS_DEL_COCINERO'; cocineroId: string }
  | { tipo: 'CLIENTE'; clienteId: string };

/**
 * Solo las VISIBLE se muestran y promedian: las otras dos estan ocultas por
 * moderacion o retiradas por su autor.
 *
 * EL FILTRO POR `tipo_resena` NO ES OPCIONAL en ninguna de las cuatro ramas.
 * Desde la migracion 0015 las tres resenas comparten tabla, y `cocinero_res_id`
 * en particular sirve a dos de ellas: sin el tipo, el listado de opiniones
 * sobre un cocinero traeria tambien las resenas de sus platos.
 */
function condicionDe(objeto: ObjetoResenado): SQL {
  const visible = eq(resena.estadoResena, 'VISIBLE');

  switch (objeto.tipo) {
    case 'PLATO':
      return todas([
        visible,
        eq(resena.tipoResena, 'PLATO'),
        eq(resena.publicacionId, objeto.publicacionId),
      ]);
    case 'COCINERO':
      return todas([
        visible,
        eq(resena.tipoResena, 'COCINERO'),
        eq(resena.cocineroResId, objeto.cocineroId),
      ]);
    case 'PLATOS_DEL_COCINERO':
      return todas([
        visible,
        eq(resena.tipoResena, 'PLATO'),
        eq(resena.cocineroResId, objeto.cocineroId),
      ]);
    case 'CLIENTE':
      return todas([
        visible,
        eq(resena.tipoResena, 'CLIENTE'),
        eq(resena.clienteDestinoId, objeto.clienteId),
      ]);
  }
}

/**
 * El listado NO filtra por `publicacion.activo`.
 *
 * Es explicito en RF082: "se incluyen las resenas de publicaciones dadas de
 * baja u ocultas, dado que la reputacion construida no debe perderse al retirar
 * un plato del catalogo". Lo unico que cambia para esas es el nombre del plato
 * y que el enlace deja de navegar, y eso lo resuelve `aResenaPublica`.
 */
function consultaBase(objeto: ObjetoResenado, filtros: FiltrosResenas): SQL {
  const condiciones = [condicionDe(objeto)];

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
 * ES LA UNICA FUENTE DEL PROMEDIO QUE SE MUESTRA ARRIBA DEL LISTADO. Antes el
 * perfil del cocinero pedia ese numero a un endpoint aparte -`/reputacion`- y
 * el listado a este, con lo cual podian discrepar; ahora salen de la misma
 * consulta y no pueden.
 *
 * IMPORTANTE: el resumen NO aplica los filtros del listado. El promedio y la
 * distribucion describen la reputacion completa; si se recalcularan con el
 * filtro puesto, marcar "4 estrellas" mostraria un promedio de 4,0 y las barras
 * al 100% en ese nivel, que no es informacion sino un espejo del filtro.
 */
async function calcularResumen(
  objeto: ObjetoResenado,
): Promise<ResumenResenas> {
  const filas = await db
    .select({
      calificacion: resena.calificacion,
      cantidad: count(),
      conFoto: sql<number>`count(${resena.fotoUrl})::int`,
    })
    .from(resena)
    .where(condicionDe(objeto))
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
 * Listado paginado de resenas sobre un objeto (US-RES-03, RF019, US-RES-02).
 *
 * `usuarioId` es quien MIRA, no de quien son las resenas. De el dependen las
 * tres marcas de US-RES-04 y US-RES-06 que viajan con cada fila: cual es su
 * reaccion, si la resena es suya y si ya la reporto.
 *
 * EL JOIN CON `publicacion` ES `left` Y NO `inner`. Solo las resenas de plato
 * tienen publicacion; con un INNER, las opiniones sobre un cocinero y las
 * resenas a un cliente desaparecerian del listado sin dar ningun error.
 */
export async function listarResenas(entrada: {
  objeto: ObjetoResenado;
  usuarioId: string;
  filtros: FiltrosResenas;
}): Promise<PaginaResenas> {
  const { objeto, usuarioId, filtros } = entrada;
  const filtro = consultaBase(objeto, filtros);

  const [filas, [totalizador], resumen] = await Promise.all([
    db
      .select(columnasResena)
      .from(resena)
      .leftJoin(publicacion, eq(publicacion.id, resena.publicacionId))
      .innerJoin(usuario, eq(usuario.id, resena.autorId))
      .where(filtro)
      .orderBy(...ordenDe(filtros))
      .limit(filtros.porPagina)
      .offset((filtros.pagina - 1) * filtros.porPagina),
    db.select({ total: count() }).from(resena).where(filtro),
    calcularResumen(objeto),
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
 * precargado"). No filtra por autor ni por estado: la resena de un plato o de
 * un cocinero es contenido publico y el permiso que importa, el de
 * MODIFICARLA, lo verifica `editarResena`.
 *
 * LAS DE TIPO CLIENTE SON LA EXCEPCION y su acceso lo controla el router, que
 * las expone solo bajo `requiereRol('COCINERO')`. Con el modelo unificado esa
 * privacidad ya no la da la separacion de tablas.
 */
export async function leerResenaPublica(
  resenaId: string,
  usuarioId: string,
): Promise<ResenaPublica> {
  const [fila] = await db
    .select(columnasResena)
    .from(resena)
    .leftJoin(publicacion, eq(publicacion.id, resena.publicacionId))
    .innerJoin(usuario, eq(usuario.id, resena.autorId))
    .where(eq(resena.id, resenaId))
    .limit(1);

  if (!fila) throw noEncontrado('la reseña');

  const contextos = await contextosDeResenas({
    resenaIds: [fila.id],
    usuarioId,
  });
  return aResenaPublica(fila, contextos.get(fila.id));
}
