import { and, eq, or, sql, type SQL } from 'drizzle-orm';
import { conversacion, mensaje, usuario } from '@foodhub/db';
import type {
  EstadoMensaje,
  Interlocutor,
  Mensaje,
  TipoMensaje,
} from '@foodhub/shared';

/**
 * Consultas y traductores del modulo de Mensajeria.
 *
 * Vive separado del servicio por el mismo motivo que en Pedidos y Dashboard: lo
 * que sabe de columnas y de SQL no tiene por que estar mezclado con lo que sabe
 * de reglas de negocio. Aca no hay ninguna decision del dominio, solo la forma
 * de leer las filas y de convertirlas al contrato de `@foodhub/shared`.
 */

/**
 * EL PROBLEMA CENTRAL DE ESTE MODULO: la conversacion guarda a los dos
 * participantes en columnas fijas (`usuario1_id`, `usuario2_id`) y el orden lo
 * decidio quien la creo. Para quien pregunta no existe "usuario1": existe "yo" y
 * "el otro". Cada lectura tiene que resolver de que lado del par cayo.
 *
 * Se resuelve una sola vez, en `esUsuario1`, y de ahi salen las tres
 * expresiones que dependen de el: el contador de no leidos propio, el flag de
 * archivado propio y el JOIN que trae al interlocutor.
 *
 * Duplicar esa condicion en cada consulta es la via directa a que una de ellas
 * lea el contador de no leidos del interlocutor en lugar del propio.
 */

/** `true` cuando quien pregunta ocupa la columna `usuario1_id`. */
export function esUsuario1(usuarioId: string): SQL<boolean> {
  return sql<boolean>`${conversacion.usuario1Id} = ${usuarioId}`;
}

/** Contador de no leidos del que pregunta, sea cual sea su lado del par. */
export function noLeidosPropios(usuarioId: string): SQL<number> {
  return sql<number>`case when ${esUsuario1(usuarioId)}
    then ${conversacion.mensajesNoLeidosUsuario1}
    else ${conversacion.mensajesNoLeidosUsuario2} end`;
}

/** Flag de archivado del que pregunta. */
export function archivadaPropia(usuarioId: string): SQL<boolean> {
  return sql<boolean>`case when ${esUsuario1(usuarioId)}
    then ${conversacion.archivadaUsuario1}
    else ${conversacion.archivadaUsuario2} end`;
}

/**
 * Condicion de JOIN que trae al INTERLOCUTOR y, de paso, verifica la
 * pertenencia.
 *
 * Las dos cosas en una: si quien pregunta no participa de la conversacion,
 * ninguna de las dos ramas se cumple, el INNER JOIN no encuentra fila y la
 * consulta devuelve vacio. No hace falta un WHERE de autorizacion aparte, y no
 * hay forma de olvidarselo.
 */
export function juntarInterlocutor(usuarioId: string): SQL {
  return or(
    and(
      eq(conversacion.usuario1Id, usuarioId),
      eq(usuario.id, conversacion.usuario2Id),
    ),
    and(
      eq(conversacion.usuario2Id, usuarioId),
      eq(usuario.id, conversacion.usuario1Id),
    ),
  )!;
}

/** Columnas del interlocutor que necesitan la cabecera y el listado. */
export const columnasInterlocutor = {
  interlocutorId: usuario.id,
  interlocutorNombre: usuario.nombre,
  interlocutorApellido: usuario.apellido,
  interlocutorFotoPerfilUrl: usuario.fotoPerfilUrl,
  interlocutorTipo: usuario.tipo,
  interlocutorEstadoCuenta: usuario.estadoCuenta,
};

/** Columnas de la conversacion, ya resueltas para quien pregunta. */
export function columnasConversacion(usuarioId: string) {
  return {
    id: conversacion.id,
    bloqueadaPorBaja: conversacion.bloqueadaPorBaja,
    fechaUltimoMensaje: conversacion.fechaUltimoMensaje,
    noLeidos: noLeidosPropios(usuarioId),
    archivada: archivadaPropia(usuarioId),
    ...columnasInterlocutor,
  };
}

export interface FilaConversacion {
  id: string;
  bloqueadaPorBaja: boolean;
  fechaUltimoMensaje: Date | null;
  noLeidos: number;
  archivada: boolean;
  interlocutorId: string;
  interlocutorNombre: string;
  interlocutorApellido: string;
  interlocutorFotoPerfilUrl: string | null;
  interlocutorTipo: 'CLIENTE' | 'COCINERO' | 'ADMINISTRADOR';
  interlocutorEstadoCuenta: 'ACTIVA' | 'SUSPENDIDA' | 'ELIMINADA';
}

export const columnasMensaje = {
  id: mensaje.id,
  conversacionId: mensaje.conversacionId,
  remitenteId: mensaje.remitenteId,
  tipo: mensaje.tipo,
  estado: mensaje.estadoMensaje,
  contenido: mensaje.contenido,
  imagenUrl: mensaje.imagenUrl,
  pieDeImagen: mensaje.pieDeImagen,
  fechaEnvio: mensaje.fechaEnvio,
};

export interface FilaMensaje {
  id: string;
  conversacionId: string;
  remitenteId: string;
  tipo: TipoMensaje;
  estado: EstadoMensaje;
  contenido: string | null;
  imagenUrl: string | null;
  pieDeImagen: string | null;
  fechaEnvio: Date;
}

/**
 * US-MSG-07 - La identidad de una cuenta dada de baja NO sale de la API.
 *
 * "Muestre el texto 'Usuario no disponible' en lugar del nombre original y
 * oculte el boton 'Ver perfil'." El nombre, el apellido y la foto viajan en
 * null: el criterio se cumple en el servidor y no confiando en que la pantalla
 * se acuerde de ocultarlos. Es la misma regla que ya aplica el dashboard del
 * cocinero con los clientes recurrentes.
 *
 * La cuenta SUSPENDIDA si conserva la identidad: US-MSG-01 solo pide bloquear
 * el envio, no anonimizar. La suspension es reversible y la conversacion tiene
 * que seguir siendo reconocible cuando el administrador la levante.
 */
export function aInterlocutor(fila: FilaConversacion): Interlocutor {
  const eliminado = fila.interlocutorEstadoCuenta === 'ELIMINADA';

  return {
    id: fila.interlocutorId,
    nombre: eliminado ? null : fila.interlocutorNombre,
    apellido: eliminado ? null : fila.interlocutorApellido,
    fotoPerfilUrl: eliminado ? null : fila.interlocutorFotoPerfilUrl,
    esCocinero: fila.interlocutorTipo === 'COCINERO',
    eliminado,
    suspendido: fila.interlocutorEstadoCuenta === 'SUSPENDIDA',
  };
}

export function aMensaje(fila: FilaMensaje): Mensaje {
  return {
    id: fila.id,
    conversacionId: fila.conversacionId,
    remitenteId: fila.remitenteId,
    tipo: fila.tipo,
    estado: fila.estado,
    contenido: fila.contenido,
    imagenUrl: fila.imagenUrl,
    pieDeImagen: fila.pieDeImagen,
    fechaEnvio: fila.fechaEnvio.toISOString(),
  };
}
