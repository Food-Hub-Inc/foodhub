import type { PerfilUsuario } from '@foodhub/shared';
import { api } from '../lib/api.js';

/**
 * Perfil de la persona autenticada — `GET /usuarios/yo` (US-GURP-01).
 *
 * El panel lo usa para dos cosas distintas: saber si quien entró es
 * administrador (US-GURP-10) y mostrar su nombre en la barra lateral.
 *
 * La clave de caché no lleva el id del usuario porque el endpoint no lo recibe:
 * opera siempre sobre el token. Al cerrar sesión se limpia la caché entera, así
 * que no hay riesgo de que el perfil anterior sobreviva al cambio de cuenta.
 */
export const CLAVE_PERFIL = ['perfil'] as const;

export function obtenerPerfilPropio(): Promise<PerfilUsuario> {
  return api.obtener<PerfilUsuario>('/usuarios/yo');
}

export const consultaPerfil = {
  queryKey: CLAVE_PERFIL,
  queryFn: obtenerPerfilPropio,
};
