import { api } from '../lib/api';

/**
 * Reporte de un intento de login fallido — US-AUD-01, segundo criterio.
 *
 * El login va del teléfono directo a Supabase Auth y nunca pasa por la API, de
 * modo que el backend no puede observar el fallo por sí mismo: es la app la que
 * avisa cuando `signInWithPassword` rechaza las credenciales.
 *
 * Solo se manda el correo intentado. La IP y la fecha las pone el servidor: si
 * el cliente pudiera informarlas, el registro dejaría de ser evidencia.
 *
 * El endpoint responde 204 siempre, incluso si la escritura falla. Acá se
 * ignora cualquier error por el mismo motivo: es un reporte de auditoría, no
 * una operación de la que dependa el usuario, y un fallo suyo no puede
 * convertirse en un mensaje de error sobre un login que ya falló por otra causa.
 */
export function reportarLoginFallido(email: string): void {
  void api
    .enviar<void>('/seguridad/login-fallido', { email })
    .catch(() => undefined);
}
