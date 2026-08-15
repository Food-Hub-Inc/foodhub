import { api } from '../lib/api.js';

/**
 * Reporte de un intento de inicio de sesión fallido — US-AUD-01.
 *
 * El login del panel va DIRECTO contra Supabase Auth y nunca pasa por la API,
 * de modo que el backend no puede observar el fallo por sí mismo. Es el cliente
 * el que avisa. Solo se manda el correo intentado: la IP y la fecha las pone el
 * servidor, porque un dato que informa el propio cliente no sirve como
 * evidencia.
 */
export async function reportarLoginFallido(email: string): Promise<void> {
  try {
    await api.enviar<void>('/seguridad/login-fallido', { email });
  } catch {
    /**
     * Deliberadamente silencioso, igual que el endpoint (responde 204 aunque la
     * escritura falle). Si el reporte de auditoría fallara y eso cambiara lo
     * que ve el usuario, un atacante podría distinguir un correo registrado de
     * uno que no lo está por la diferencia de comportamiento.
     */
  }
}
