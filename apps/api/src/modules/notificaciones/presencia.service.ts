import type { MarcarPresenciaInput } from '@foodhub/shared';

/**
 * US-NOT-02: "Si el usuario tiene la conversacion abierta en pantalla en el
 * momento en que llega el mensaje, no se envia notificacion push."
 *
 * La presencia real (quien esta mirando que chat AHORA) vive en el canal de
 * Supabase Realtime `chat:<id>`, no en la base. En vez de que la API consulte
 * Realtime -acoplandose a ese servicio y agregando latencia al envio de cada
 * mensaje-, el cliente del destinatario declara que conversacion tiene
 * enfocada: `conversacionId` mientras la pantalla de chat esta activa, `null`
 * al salir.
 *
 * LIMITACION CONOCIDA (documentada en `docs/API-NOTIFICACIONES.md`): este
 * registro es un `Map` EN MEMORIA DEL PROCESO, con TTL corto. En un despliegue
 * de dos instancias en Railway cada una ve solo a los clientes que le pegaron a
 * ella, asi que el peor caso es UN push redundante mientras el chat esta
 * abierto. Nunca se pierde una notificacion: la fila del historial se escribe
 * igual. Es una concesion deliberada del MVP, alineada con la decision de "sin
 * cola de mensajes" (punto 1.3.1.12). Evolucion futura: store compartido o
 * consulta de presencia contra Realtime.
 */

/**
 * Cuanto vale una declaracion de presencia sin renovarse. El cliente reenvia
 * el ping cada ~30 s mientras la pantalla siga enfocada; este margen tolera un
 * ping perdido antes de asumir que el usuario ya no esta mirando.
 */
const TTL_PRESENCIA_MS = 40_000;

interface Presencia {
  conversacionId: string;
  expiraEn: number;
}

const presenciaPorUsuario = new Map<string, Presencia>();

/** El cliente declara -o retira, con `null`- que conversacion esta mirando. */
export function registrarPresencia(
  usuarioId: string,
  entrada: MarcarPresenciaInput,
): void {
  if (entrada.conversacionId === null) {
    presenciaPorUsuario.delete(usuarioId);
    return;
  }

  presenciaPorUsuario.set(usuarioId, {
    conversacionId: entrada.conversacionId,
    expiraEn: Date.now() + TTL_PRESENCIA_MS,
  });
}

/**
 * ¿El usuario tiene esa conversacion abierta ahora mismo? Si la entrada vencio
 * se descarta al pasar: un `Map` que solo se limpia al consultar alcanza para
 * este volumen (una entrada por usuario con el chat abierto).
 */
export function estaViendoConversacion(
  usuarioId: string,
  conversacionId: string,
): boolean {
  const presencia = presenciaPorUsuario.get(usuarioId);
  if (!presencia) return false;

  if (presencia.expiraEn <= Date.now()) {
    presenciaPorUsuario.delete(usuarioId);
    return false;
  }

  return presencia.conversacionId === conversacionId;
}

/** Solo para pruebas: deja el registro en blanco entre casos. */
export function _reiniciarPresencia(): void {
  presenciaPorUsuario.clear();
}
