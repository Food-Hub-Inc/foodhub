import { createContext, useContext } from 'react';
import type { PerfilUsuario } from '@foodhub/shared';
import type { ErrorApi } from '../lib/api.js';

/**
 * Estado de la sesión del panel, tal como lo necesitan el guardia de ruta y la
 * barra lateral.
 *
 * Combina dos fuentes que hay que mirar juntas:
 *
 *   Supabase Auth  dice si hay un token válido en el navegador.
 *   La API         dice quién es esa persona y en qué estado está su cuenta.
 *
 * Un token vigente no alcanza para entrar: la cuenta pudo haberse suspendido
 * después de emitirlo, y el rol solo lo conoce la tabla `usuario`.
 */
export interface EstadoSesion {
  /** Todavía no se sabe si hay sesión, o se está resolviendo el perfil. */
  estaCargando: boolean;
  /** Hay un token de Supabase en el navegador. */
  tieneToken: boolean;
  /** Perfil devuelto por `GET /usuarios/yo`. */
  perfil: PerfilUsuario | null;
  /** Falló la consulta del perfil (cuenta suspendida, sin red, 500…). */
  error: ErrorApi | null;
  reintentar: () => void;
  cerrarSesion: () => Promise<void>;
}

/**
 * Se inicializa en `null` a propósito: así `useSesion` puede distinguir "no hay
 * proveedor montado" de "hay proveedor y todavía no sabe nada", y el error sale
 * en desarrollo en vez de manifestarse como una redirección misteriosa.
 */
export const ContextoSesion = createContext<EstadoSesion | null>(null);

export function useSesion(): EstadoSesion {
  const estado = useContext(ContextoSesion);
  if (!estado) {
    throw new Error('useSesion debe usarse dentro de <ProveedorDeSesion>.');
  }
  return estado;
}
