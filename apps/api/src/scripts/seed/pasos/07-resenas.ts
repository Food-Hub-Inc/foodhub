import { resena, respuestaCocinero } from '@foodhub/db';
import type { EstadoResena } from '@foodhub/shared';
import { db } from '../../../lib/db.js';
import {
  COMENTARIOS_CALIFICACION_CLIENTE,
  COMENTARIOS_RESENA,
  RESPUESTAS_COCINERO,
  TAGS_CALIFICACION_CLIENTE,
  TAGS_CALIFICACION_COCINERO,
  TAGS_RESENA_NEGATIVAS,
  TAGS_RESENA_POSITIVAS,
} from '../datos/textos.js';
import type { TendenciaReputacion } from '../datos/usuarios.js';
import type { Aleatorio } from '../lib/aleatorio.js';
import type { ContextoSeed, PublicacionCreada } from '../lib/contexto.js';
import { acotar, FIN_VENTANA, sumarDias, sumarMinutos } from '../lib/tiempo.js';

/**
 * Paso 7 - Reputacion en las dos direcciones (US-RES-01 a US-RES-04).
 *
 * QUIEN PUEDE OPINAR
 *
 * La resena es POR PLATO y el derecho a dejarla nace de un pedido COMPLETADO
 * que incluyo ese plato. La seed respeta esa regla al pie de la letra: arma la
 * lista de pares (cliente, publicacion) a partir de los pedidos completados y
 * solo resena sobre esa lista. Si generara resenas al azar, el dia que se
 * implemente la validacion del servicio el dataset quedaria fuera de norma.
 *
 * UNA RESENA POR PAR. El indice unico `resena_cliente_publicacion_uq` lo
 * impone: si el cliente vuelve a pedir el mismo plato, edita la que tenia. Por
 * eso los pares se deduplican antes de insertar, quedandose con la fecha del
 * PRIMER pedido completado.
 *
 * LA CALIFICACION SIGUE LA TENDENCIA DEL COCINERO (datos/usuarios.ts): el que
 * atiende bien junta cincos y el irregular reparte. Sin eso el promedio de los
 * quince converge al mismo numero y el filtro por valoracion minima del feed
 * (US-EXP-03) no separa a nadie.
 */

const DISTRIBUCION_ESTRELLAS: Record<
  TendenciaReputacion,
  Record<'1' | '2' | '3' | '4' | '5', number>
> = {
  excelente: { '5': 55, '4': 30, '3': 10, '2': 4, '1': 1 },
  buena: { '5': 35, '4': 33, '3': 20, '2': 8, '1': 4 },
  irregular: { '5': 20, '4': 25, '3': 26, '2': 18, '1': 11 },
};

type Estrellas = 1 | 2 | 3 | 4 | 5;

interface ParResenable {
  clienteId: string;
  publicacion: PublicacionCreada;
  fechaCompletado: Date;
}

/** Pares (cliente, plato) habilitados a resenar, sin repetir. */
function paresResenables(contexto: ContextoSeed): ParResenable[] {
  const pares = new Map<string, ParResenable>();

  for (const ped of contexto.pedidos) {
    if (ped.desenlace !== 'COMPLETADO') continue;
    for (const item of ped.items) {
      const clave = `${ped.clienteId}|${item.publicacionId}`;
      const previo = pares.get(clave);
      if (previo && previo.fechaCompletado <= ped.fechaUltimaTransicion)
        continue;
      pares.set(clave, {
        clienteId: ped.clienteId,
        publicacion: item.publicacion,
        fechaCompletado: ped.fechaUltimaTransicion,
      });
    }
  }

  return [...pares.values()];
}

function tagsPara(azar: Aleatorio, estrellas: Estrellas): string[] {
  const fuente =
    estrellas >= 4
      ? TAGS_RESENA_POSITIVAS
      : estrellas === 3
        ? [...TAGS_RESENA_POSITIVAS, ...TAGS_RESENA_NEGATIVAS]
        : TAGS_RESENA_NEGATIVAS;
  return azar.elegirVarios(fuente, azar.entero(1, 3));
}

/**
 * Fecha de la resena: entre un dia y dos semanas despues de recibir el pedido.
 *
 * El tope de catorce dias es `resena_limite_dias_para_resenar` de
 * `configuracion_sistema`: pasado ese plazo el cliente ya no puede opinar, y
 * una resena fuera de plazo seria un dato que el sistema nunca produciria.
 */
function fechaDeResena(azar: Aleatorio, completado: Date): Date {
  const propuesta = sumarMinutos(
    sumarDias(completado, azar.entero(1, 13)),
    azar.entero(0, 720),
  );
  // Si el plazo cae despues del cierre de la ventana se recorta, pero nunca
  // por debajo del dia siguiente a la entrega: una resena anterior al pedido
  // que la habilita seria un dato imposible.
  const minimo = sumarDias(completado, 1);
  const maximo = minimo > FIN_VENTANA ? minimo : FIN_VENTANA;
  return acotar(propuesta, minimo, maximo);
}

function filaDeResena(contexto: ContextoSeed, par: ParResenable) {
  const { azar } = contexto;
  const tendencia = contexto.usuarios.get(
    par.publicacion.cocineroSlug,
  )?.tendencia;
  const estrellas = Number(
    azar.pesado(DISTRIBUCION_ESTRELLAS[tendencia ?? 'buena']),
  ) as Estrellas;

  const fechaPublicacion = fechaDeResena(azar, par.fechaCompletado);
  const editada = azar.probabilidad(0.15);
  // Un 3 % de las resenas las borro su autor (US-RES-02): dejan de contar para
  // el promedio pero la fila sigue existiendo.
  const estadoResena: EstadoResena = azar.probabilidad(0.03)
    ? 'ELIMINADA_AUTOR'
    : 'VISIBLE';

  return {
    tipoResena: 'PLATO' as const,
    publicacionId: par.publicacion.id,
    autorId: par.clienteId,
    cocineroResId: par.publicacion.cocineroId,
    clienteDestinoId: null,
    calificacion: estrellas,
    comentario: azar.probabilidad(0.85)
      ? azar.elegir(COMENTARIOS_RESENA[estrellas])
      : null,
    tags: tagsPara(azar, estrellas),
    fotoUrl: null,
    estadoResena,
    editada,
    fechaPublicacion,
    fechaUltimaEdicion: editada ? sumarDias(fechaPublicacion, 1) : null,
  };
}

async function sembrarResenas(contexto: ContextoSeed): Promise<void> {
  const { azar } = contexto;
  // Poco mas de la mitad de quienes pueden opinar lo hacen. Que no opinen
  // todos es lo que hace util el minimo de resenas para publicar el promedio.
  const elegidos = paresResenables(contexto).filter(() =>
    azar.probabilidad(0.56),
  );
  if (elegidos.length === 0) return;

  const filas = elegidos.map((par) => filaDeResena(contexto, par));

  for (let i = 0; i < filas.length; i += 200) {
    const insertadas = await db
      .insert(resena)
      .values(filas.slice(i, i + 200))
      .returning({
        id: resena.id,
        publicacionId: resena.publicacionId,
        autorId: resena.autorId,
        cocineroResId: resena.cocineroResId,
        calificacion: resena.calificacion,
        fechaPublicacion: resena.fechaPublicacion,
        estadoResena: resena.estadoResena,
      });

    for (const fila of insertadas) {
      // Las tres columnas son anulables en el schema porque cada tipo puebla
      // las suyas; en estas filas, que se acaban de insertar como PLATO, no
      // pueden serlo. El `??` es la conversion del tipo del schema al del
      // contexto del seed, no un caso que pueda ocurrir.
      contexto.resenas.push({
        id: fila.id,
        publicacionId: fila.publicacionId ?? '',
        clienteId: fila.autorId,
        cocineroId: fila.cocineroResId ?? '',
        calificacion: fila.calificacion,
        fechaPublicacion: fila.fechaPublicacion,
        visible: fila.estadoResena === 'VISIBLE',
      });
    }
  }
}

/**
 * Respuesta del cocinero a una resena (US-RES-04). Una por resena: la columna
 * `resena_id` es unica.
 *
 * `fechaEdicionLimite` congela la respuesta pasada una ventana de 48 horas,
 * para que no se altere despues de que el cliente la leyo.
 */
async function sembrarRespuestas(contexto: ContextoSeed): Promise<void> {
  const { azar } = contexto;
  const filas = contexto.resenas
    .filter((r) => r.visible && azar.probabilidad(0.35))
    .map((r) => {
      const tono =
        r.calificacion >= 4
          ? 'positiva'
          : r.calificacion === 3
            ? 'neutra'
            : 'negativa';
      const fechaPublicacion = sumarDias(r.fechaPublicacion, azar.entero(1, 3));
      return {
        resenaId: r.id,
        cocineroId: r.cocineroId,
        contenido: azar.elegir(RESPUESTAS_COCINERO[tono]),
        editada: azar.probabilidad(0.1),
        fechaPublicacion,
        fechaEdicionLimite: sumarDias(fechaPublicacion, 2),
      };
    });

  if (filas.length === 0) return;
  for (let i = 0; i < filas.length; i += 200) {
    await db.insert(respuestaCocinero).values(filas.slice(i, i + 200));
  }
}

/**
 * Calificacion del cocinero hacia el cliente (US-RES-03).
 *
 * UNA POR PAR cocinero-cliente, no por pedido: el cocinero califica a la
 * persona. El derecho nace de haber tenido al menos un pedido que llego a
 * ACEPTADO, y en este dataset eso equivale a los completados.
 */
async function sembrarCalificacionesDeCliente(
  contexto: ContextoSeed,
): Promise<void> {
  const { azar } = contexto;
  const pares = new Map<
    string,
    { cocineroId: string; clienteId: string; fecha: Date }
  >();

  for (const ped of contexto.pedidos) {
    if (ped.desenlace !== 'COMPLETADO') continue;
    const clave = `${ped.cocineroId}|${ped.clienteId}`;
    const previo = pares.get(clave);
    if (previo && previo.fecha >= ped.fechaUltimaTransicion) continue;
    pares.set(clave, {
      cocineroId: ped.cocineroId,
      clienteId: ped.clienteId,
      fecha: ped.fechaUltimaTransicion,
    });
  }

  const filas = [...pares.values()]
    .filter(() => azar.probabilidad(0.72))
    .map((par) => {
      // El cocinero es mas benevolo que el cliente: la mayoria de los retiros
      // salen bien y solo se queja de lo que realmente molesto.
      const estrellas = Number(
        azar.pesado({ '5': 58, '4': 25, '3': 11, '2': 5, '1': 1 }),
      ) as Estrellas;
      return {
        tipoResena: 'CLIENTE' as const,
        autorId: par.cocineroId,
        publicacionId: null,
        cocineroResId: null,
        clienteDestinoId: par.clienteId,
        calificacion: estrellas,
        comentario: azar.probabilidad(0.7)
          ? azar.elegir(COMENTARIOS_CALIFICACION_CLIENTE[estrellas])
          : null,
        tags: azar.elegirVarios(TAGS_CALIFICACION_CLIENTE, azar.entero(1, 2)),
        fechaPublicacion: sumarDias(par.fecha, azar.entero(1, 5)),
      };
    });

  if (filas.length === 0) return;
  await db.insert(resena).values(filas);
}

/**
 * Resena del cliente hacia el cocinero (US-RES-07, RF087).
 *
 * ES LA QUE CONSTRUYE LA REPUTACION PUBLICA DEL COCINERO, asi que sin estas
 * filas el feed, el mapa y el perfil muestran "Sin calificaciones aun" para
 * todos y no hay nada que verificar en la solapa de resenas.
 *
 * UNA POR PAR cliente-cocinero, igual que la anterior y por el mismo motivo:
 * se resena a la persona y no al pedido. Se deduplica por par quedandose con
 * el pedido mas reciente, que es lo que hace el indice `resena_cocinero_uq`
 * del lado de la base.
 */
async function sembrarResenasDeCocinero(contexto: ContextoSeed): Promise<void> {
  const { azar } = contexto;
  const pares = new Map<
    string,
    { cocineroId: string; clienteId: string; fecha: Date }
  >();

  for (const ped of contexto.pedidos) {
    if (ped.desenlace !== 'COMPLETADO') continue;
    const clave = `${ped.clienteId}|${ped.cocineroId}`;
    const previo = pares.get(clave);
    if (previo && previo.fecha >= ped.fechaUltimaTransicion) continue;
    pares.set(clave, {
      cocineroId: ped.cocineroId,
      clienteId: ped.clienteId,
      fecha: ped.fechaUltimaTransicion,
    });
  }

  const filas = [...pares.values()]
    .filter(() => azar.probabilidad(0.64))
    .map((par) => {
      // La opinion sobre el servicio sigue la tendencia del cocinero, igual
      // que la de sus platos: un cocinero descuidado no atiende mejor de lo
      // que cocina.
      const estrellas = Number(
        azar.pesado({ '5': 52, '4': 27, '3': 13, '2': 6, '1': 2 }),
      ) as Estrellas;
      return {
        tipoResena: 'COCINERO' as const,
        autorId: par.clienteId,
        publicacionId: null,
        cocineroResId: par.cocineroId,
        clienteDestinoId: null,
        calificacion: estrellas,
        comentario: azar.probabilidad(0.75)
          ? azar.elegir(COMENTARIOS_RESENA[estrellas])
          : null,
        tags: azar.elegirVarios(TAGS_CALIFICACION_COCINERO, azar.entero(1, 2)),
        fechaPublicacion: sumarDias(par.fecha, azar.entero(1, 4)),
      };
    });

  if (filas.length === 0) return;
  await db.insert(resena).values(filas);
}

export async function sembrarReputacion(contexto: ContextoSeed): Promise<void> {
  await sembrarResenas(contexto);
  await sembrarRespuestas(contexto);
  await sembrarCalificacionesDeCliente(contexto);
  await sembrarResenasDeCocinero(contexto);
}
