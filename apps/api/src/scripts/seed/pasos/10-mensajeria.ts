import { eq } from 'drizzle-orm';
import { conversacion, mensaje } from '@foodhub/db';
import type { EstadoMensaje } from '@foodhub/shared';
import { db } from '../../../lib/db.js';
import { GUIONES_CHAT, type TurnoChat } from '../datos/textos.js';
import { subirImagen } from '../lib/almacenamiento.js';
import type { ContextoSeed, PedidoCreado } from '../lib/contexto.js';
import { sumarMinutos } from '../lib/tiempo.js';

/**
 * Paso 10 - Conversaciones entre cliente y cocinero (US-MSG-01 a US-MSG-04).
 *
 * UNA CONVERSACION POR PAR DE PERSONAS, no por pedido: el indice
 * `conversacion_par_uq` normaliza el par ordenando los UUID, asi que (A,B) y
 * (B,A) son la misma fila. La seed agrupa los pedidos por par y abre una sola
 * conversacion, anclada al pedido mas reciente de esa pareja.
 *
 * EL ULTIMO MENSAJE DEFINE LOS NO LEIDOS. Se deja sin leer lo que mando la
 * otra parte al final de la charla: si la ultima palabra fue del cliente, el
 * cocinero tiene mensajes pendientes, y al reves. Es la unica forma de que el
 * contador de la campana y el badge del listado muestren algo coherente en vez
 * de un numero puesto a dedo.
 */

interface ParDeChat {
  clienteId: string;
  cocineroId: string;
  ancla: PedidoCreado;
}

function paresConHistoria(contexto: ContextoSeed): ParDeChat[] {
  const pares = new Map<string, ParDeChat>();

  for (const ped of contexto.pedidos) {
    const clave = `${ped.clienteId}|${ped.cocineroId}`;
    const previo = pares.get(clave);
    if (previo && previo.ancla.fechaCreacion >= ped.fechaCreacion) continue;
    pares.set(clave, {
      clienteId: ped.clienteId,
      cocineroId: ped.cocineroId,
      ancla: ped,
    });
  }

  return [...pares.values()];
}

interface MensajePlanificado {
  de: 'CLIENTE' | 'COCINERO';
  contenido: string | null;
  imagenLocal: string | null;
  pieDeImagen: string | null;
}

/**
 * Convierte un guion en mensajes, y en una de cada cinco charlas agrega una
 * foto del plato.
 *
 * `mensaje_subtipo_consistente` (CHECK de la tabla) exige que un mensaje de
 * tipo IMAGEN tenga `imagen_url` y `contenido` en null, y al reves para TEXTO:
 * los dos subtipos comparten tabla y el discriminador tiene que ser fiel.
 */
function planificarMensajes(
  contexto: ContextoSeed,
  par: ParDeChat,
  guion: readonly TurnoChat[],
): MensajePlanificado[] {
  const { azar } = contexto;
  const mensajes: MensajePlanificado[] = guion.map((turno) => ({
    de: turno.de,
    contenido: turno.texto,
    imagenLocal: null,
    pieDeImagen: null,
  }));

  if (azar.probabilidad(0.2)) {
    const plato = azar.elegir(par.ancla.items).publicacion.plato;
    mensajes.push({
      de: 'COCINERO',
      contenido: null,
      imagenLocal: `platos/${plato.imagen}`,
      pieDeImagen: 'Así salió, ya lo tengo listo.',
    });
  }

  return mensajes;
}

interface FilaDeMensaje {
  conversacionId: string;
  remitenteId: string;
  tipo: 'TEXTO' | 'IMAGEN';
  estadoMensaje: EstadoMensaje;
  contenido: string | null;
  imagenUrl: string | null;
  pieDeImagen: string | null;
  fechaEnvio: Date;
}

/**
 * Convierte los mensajes planificados en filas, separando los turnos entre uno
 * y veinticinco minutos: una charla en la que todos los mensajes caen en el
 * mismo segundo no se parece a ninguna.
 */
async function filasDeMensaje(entrada: {
  contexto: ContextoSeed;
  par: ParDeChat;
  conversacionId: string;
  inicio: Date;
  planificados: MensajePlanificado[];
}): Promise<FilaDeMensaje[]> {
  const { azar } = entrada.contexto;
  const filas: FilaDeMensaje[] = [];
  let reloj = entrada.inicio;

  for (const planificado of entrada.planificados) {
    reloj = sumarMinutos(reloj, azar.entero(1, 25));
    const imagenUrl = planificado.imagenLocal
      ? await subirImagen({
          bucket: 'mensajes',
          carpeta: entrada.conversacionId,
          archivoLocal: planificado.imagenLocal,
        })
      : null;

    filas.push({
      conversacionId: entrada.conversacionId,
      remitenteId:
        planificado.de === 'CLIENTE'
          ? entrada.par.clienteId
          : entrada.par.cocineroId,
      tipo: imagenUrl ? 'IMAGEN' : 'TEXTO',
      // Por defecto todo leido; el ultimo mensaje puede quedar ENTREGADO.
      estadoMensaje: 'LEIDO',
      contenido: planificado.contenido,
      imagenUrl,
      pieDeImagen: planificado.pieDeImagen,
      fechaEnvio: reloj,
    });
  }

  return filas;
}

async function crearConversacion(
  contexto: ContextoSeed,
  par: ParDeChat,
): Promise<void> {
  const { azar } = contexto;
  const planificados = planificarMensajes(
    contexto,
    par,
    azar.elegir(GUIONES_CHAT),
  );

  // La charla arranca poco despues de que el cliente hizo el pedido.
  const inicio = sumarMinutos(par.ancla.fechaCreacion, azar.entero(1, 6));

  const [fila] = await db
    .insert(conversacion)
    .values({
      usuario1Id: par.clienteId,
      usuario2Id: par.cocineroId,
      fechaCreacion: inicio,
    })
    .returning({ id: conversacion.id });

  if (!fila) throw new Error('no se pudo crear la conversación');

  const filasMensaje = await filasDeMensaje({
    contexto,
    par,
    conversacionId: fila.id,
    inicio,
    planificados,
  });

  const ultimo = filasMensaje[filasMensaje.length - 1];
  if (!ultimo) throw new Error('el guion de chat quedó sin mensajes');

  // Un tercio de las conversaciones queda con el ultimo mensaje sin leer.
  const conPendiente = azar.probabilidad(0.33);
  if (conPendiente) ultimo.estadoMensaje = 'ENTREGADO';

  await db.insert(mensaje).values(filasMensaje);

  const loMandoElCliente = ultimo.remitenteId === par.clienteId;
  await db
    .update(conversacion)
    .set({
      fechaUltimoMensaje: ultimo.fechaEnvio,
      // `usuario1` es el cliente y `usuario2` el cocinero, en ese orden de
      // insercion: el pendiente le queda a quien NO escribio el ultimo mensaje.
      mensajesNoLeidosUsuario1: conPendiente && !loMandoElCliente ? 1 : 0,
      mensajesNoLeidosUsuario2: conPendiente && loMandoElCliente ? 1 : 0,
      archivadaUsuario1: azar.probabilidad(0.1),
      archivadaUsuario2: false,
    })
    .where(eq(conversacion.id, fila.id));

  contexto.conversaciones.push({
    id: fila.id,
    clienteId: par.clienteId,
    cocineroId: par.cocineroId,
    ultimoMensaje: ultimo.fechaEnvio,
  });
}

export async function sembrarMensajeria(contexto: ContextoSeed): Promise<void> {
  const { azar } = contexto;
  // No todas las parejas se escriben: hay quien pide y retira sin decir nada.
  const pares = paresConHistoria(contexto).filter(() =>
    azar.probabilidad(0.62),
  );

  for (const par of pares) {
    await crearConversacion(contexto, par);
  }
}
