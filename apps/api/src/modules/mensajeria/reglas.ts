import {
  MENSAJES_MENSAJERIA,
  type Interlocutor,
  type MotivoBloqueoChat,
} from '@foodhub/shared';

/**
 * Las dos reglas del modulo que no dependen de la base.
 *
 * Viven aparte del servicio -mismo criterio que `pedidos/reglas.test.ts` y
 * `dashboard/reglas.ts`- porque son la parte del modulo que decide QUE pasa, no
 * COMO se lee. Como funciones puras se pueden probar sin levantar Postgres, que
 * es justo lo que el entorno de pruebas no tiene.
 */

/**
 * Por que una conversacion no admite mensajes nuevos, o `null` si los admite.
 *
 * LA BAJA GANA SOBRE LA SUSPENSION cuando se dan las dos a la vez. No es
 * arbitrario: son estados de naturaleza distinta y la interfaz hace cosas
 * distintas con cada uno. La baja es DEFINITIVA -archiva la conversacion, oculta
 * la identidad (US-MSG-07) y no se revierte- mientras que la suspension es
 * REVERSIBLE: el administrador la levanta desde el panel y el chat vuelve a
 * andar solo. Mostrar "suspendido" sobre una cuenta que ya no existe prometeria
 * una vuelta que no va a pasar.
 *
 * `bloqueadaPorBaja` y `interlocutor.eliminado` se evaluan los DOS aunque en
 * teoria vayan siempre juntos: el flag lo escribe la baja de la cuenta
 * (US-GURP-04 / US-GURP-09) y el estado sale de `usuario`. Si alguna vez una
 * fila quedara con uno solo de los dos -una baja aplicada antes de que existiera
 * esta funcionalidad, por ejemplo- la conversacion se bloquea igual.
 */
export function motivoDeBloqueo(
  bloqueadaPorBaja: boolean,
  interlocutor: Interlocutor,
): MotivoBloqueoChat | null {
  if (bloqueadaPorBaja || interlocutor.eliminado) return 'BAJA';
  if (interlocutor.suspendido) return 'SUSPENSION';
  return null;
}

/**
 * Texto del rechazo cuando la conversacion no admite mensajes nuevos.
 *
 * US-MSG-01 fija el de la suspension hablando de "este cocinero" porque su unico
 * actor es el cliente. Con un cliente suspendido del otro lado ese texto
 * mentiria, asi que ahi se usa la variante neutra, marcada como PROPIA en
 * `@foodhub/shared`.
 */
export function mensajeDeBloqueo(
  motivo: MotivoBloqueoChat,
  interlocutor: Interlocutor,
): string {
  if (motivo === 'BAJA') return MENSAJES_MENSAJERIA.destinatarioEliminado;
  return interlocutor.esCocinero
    ? MENSAJES_MENSAJERIA.cocineroNoDisponible
    : MENSAJES_MENSAJERIA.interlocutorNoDisponible;
}
