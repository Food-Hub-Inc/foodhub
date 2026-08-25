import {
  MENSAJES_MENSAJERIA,
  type EstadoMensaje,
  type Interlocutor,
  type Mensaje,
  type MotivoBloqueoChat,
} from '@foodhub/shared';
import { formatearFecha, formatearHora } from '../../lib/formato';
import { TEXTOS_MENSAJERIA } from '../../lib/textos';

/**
 * Las decisiones de presentación que PAN-MSG-01 y PAN-MSG-02 tienen que tomar
 * IGUAL: cómo se nombra a alguien que ya no está en la plataforma, cómo se
 * resume un mensaje en una línea, qué hora se muestra y qué dice el aviso cuando
 * la conversación está bloqueada.
 *
 * Van en un módulo sin componentes por dos motivos: son funciones puras y se
 * prueban como tales, y mezclarlas con componentes rompe el fast refresh de
 * Metro, que exige que un archivo exporte componentes o utilidades, no las dos
 * cosas.
 */

/** Los cuatro valores del indicador de US-MSG-02, más el optimista. */
export type EstadoVisible = EstadoMensaje | 'ENVIANDO' | 'ERROR';

/**
 * US-MSG-07 · "Muestre el texto 'Usuario no disponible' en lugar del nombre
 * original".
 *
 * La API ya manda el nombre en `null` cuando la cuenta está dada de baja, así
 * que esto no es una segunda comprobación de seguridad: es el texto que ocupa
 * ese hueco.
 */
export function nombreDe(interlocutor: Interlocutor): string {
  if (interlocutor.eliminado || interlocutor.nombre === null) {
    return MENSAJES_MENSAJERIA.usuarioNoDisponible;
  }
  return `${interlocutor.nombre} ${interlocutor.apellido ?? ''}`.trim();
}

/**
 * US-MSG-04 · "extracto del último mensaje".
 *
 * Un mensaje de imagen no tiene texto que recortar: la fila anuncia el tipo, y
 * si la imagen llevaba pie lo muestra a continuación. Dónde cortar la línea lo
 * decide el ancho de la fila con `numberOfLines`, no un `slice` a ciegas.
 */
export function extractoDe(mensaje: Mensaje): string {
  if (mensaje.tipo === 'TEXTO') return mensaje.contenido ?? '';
  return mensaje.pieDeImagen
    ? `${TEXTOS_MENSAJERIA.extractoDeImagen} · ${mensaje.pieDeImagen}`
    : TEXTOS_MENSAJERIA.extractoDeImagen;
}

/**
 * Marca de tiempo de una fila del listado (US-MSG-04).
 *
 * Hoy se lee mejor con la hora; los días anteriores, con la fecha. El criterio
 * pide "fecha y hora del último mensaje" en una fila que además tiene que
 * mostrar nombre y extracto: escribir las dos cosas completas no entra sin
 * recortar el extracto a nada. Es la convención de cualquier bandeja de mensajes
 * y no altera el dato, sólo elige cuál de las dos mitades muestra.
 *
 * Función PURA salvo por el reloj, que se inyecta para poder probarla.
 */
export function marcaDeTiempo(iso: string, ahora: Date = new Date()): string {
  const fecha = new Date(iso);
  const mismoDia = fecha.toDateString() === ahora.toDateString();
  return mismoDia ? formatearHora(fecha) : formatearFecha(iso);
}

/**
 * Texto del aviso que reemplaza al campo de entrada (US-MSG-01 y US-MSG-07).
 *
 * Espeja la misma decisión que toma la API en `reglas.ts`: el literal de
 * US-MSG-01 habla de "este cocinero" porque su único actor es el cliente, así
 * que con un cliente suspendido del otro lado se usa la variante neutra.
 */
export function textoDeBloqueo(
  motivo: MotivoBloqueoChat,
  esCocinero: boolean,
): string {
  if (motivo === 'BAJA') {
    return MENSAJES_MENSAJERIA.conversacionBloqueadaPorBaja;
  }
  return esCocinero
    ? MENSAJES_MENSAJERIA.cocineroNoDisponible
    : MENSAJES_MENSAJERIA.interlocutorNoDisponible;
}
