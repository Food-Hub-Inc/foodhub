import { darDeBajaDispositivo } from '../api/notificaciones';

/**
 * Expo Push Token que este dispositivo registró para la sesión actual
 * (punto 1.3.1.11).
 *
 * Vive en un módulo y no en el hook que lo registra porque la baja tiene que
 * correr ANTES del `signOut`, desde `cerrarSesion()`: la API exige sesión para
 * dar de baja el token, y un efecto que reacciona a la sesión ya cerrada llega
 * tarde (respondía 401 y el celular seguía recibiendo los push de la cuenta
 * anterior).
 */
let tokenActual: string | null = null;

export function recordarTokenDePush(token: string | null): void {
  tokenActual = token;
}

/**
 * Da de baja el token mientras la sesión todavía es válida. Nunca lanza: si la
 * red falla, el cierre de sesión sigue igual; el token queda activo hasta que
 * otra cuenta lo registre o Expo lo informe como muerto.
 */
export async function darDeBajaTokenDePush(): Promise<void> {
  const token = tokenActual;
  if (!token) return;
  tokenActual = null;
  await darDeBajaDispositivo(token).catch(() => undefined);
}
