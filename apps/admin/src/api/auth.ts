import type { SolicitarRecuperacionInput } from '@foodhub/shared';
import { api } from '../lib/api.js';

/**
 * US-AUT-04 · Solicitud del enlace de recuperación, desde el panel.
 *
 * Es el mismo endpoint que usa la app móvil: quien decide a dónde apunta el
 * enlace del correo es la API, mirando el rol de la cuenta
 * (`DESTINO_RECUPERACION` en `auth.service.ts`). Un administrador recibe el
 * enlace al panel; un cliente o un cocinero, el deep link a la aplicación.
 *
 * Por eso este formulario no filtra por rol ni lo intenta adivinar: si alguien
 * que no es administrador escribe su correo acá, recibe igual el enlace que le
 * corresponde y termina en la app, que es su interfaz. Filtrar sería además
 * revelar quién es administrador a cualquiera que pruebe correos.
 *
 * El 404 con `MENSAJES_AUTH.correoNoRegistrado` significa que el correo no tiene
 * cuenta. Que la respuesta lo revele es una decisión del equipo tomada sobre el
 * criterio de aceptación textual de US-AUT-04, no un descuido.
 */
export function solicitarRecuperacion(
  datos: SolicitarRecuperacionInput,
): Promise<{ mensaje: string }> {
  return api.enviar<{ mensaje: string }>('/auth/recuperacion', datos);
}
