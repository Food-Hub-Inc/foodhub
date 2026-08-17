import type {
  CambiarPasswordInput,
  EditarPerfilInput,
  PerfilUsuario,
} from '@foodhub/shared';
import { api } from '../lib/api';

/**
 * Perfil propio — módulo de Gestión de Usuarios, Roles y Permisos
 * (US-GURP-01 a US-GURP-04) · PAN-GURP-01.
 *
 * Ninguna de estas rutas recibe un id: todas operan sobre `req.usuario.id`, que
 * la API saca del token. Por diseño no existe la posibilidad de tocar el perfil
 * ajeno cambiando un número en la URL, así que tampoco existe acá el parámetro
 * que lo permitiría.
 */

/** US-GURP-01. Perfil completo del usuario autenticado. */
export function obtenerMiPerfil(): Promise<PerfilUsuario> {
  return api.obtener<PerfilUsuario>('/usuarios/yo');
}

/**
 * US-GURP-02. Edición parcial: solo viajan los campos que el usuario tocó.
 *
 * `token` lo usa únicamente el registro, que guarda la foto de perfil con una
 * sesión que todavía no está abierta en la app (ver `useRegistro`). Desde
 * PAN-GURP-01 se omite y vale la sesión del Keystore.
 */
export function editarMiPerfil(
  datos: EditarPerfilInput,
  token?: string,
): Promise<PerfilUsuario> {
  return api.modificar<PerfilUsuario>('/usuarios/yo', datos, token);
}

/**
 * US-GURP-03. Cambio de contraseña.
 *
 * Manda también la contraseña actual aunque la sesión esté iniciada: la API
 * reautentica con ella antes de cambiar nada. Sin ese paso, cualquiera que
 * encuentre el teléfono desbloqueado se queda con la cuenta.
 */
export function cambiarMiPassword(datos: CambiarPasswordInput): Promise<void> {
  return api.enviar<void>('/usuarios/yo/password', datos);
}

/**
 * US-GURP-04. Baja lógica: la fila no se borra nunca.
 *
 * El body con la confirmación explícita evita que un reintento automático del
 * cliente dispare una baja irreversible.
 */
export function eliminarMiCuenta(): Promise<void> {
  return api.eliminar<void>('/usuarios/yo', { confirmacion: true });
}
