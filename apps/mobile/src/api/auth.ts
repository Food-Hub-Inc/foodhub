import type {
  PerfilUsuario,
  RegistroClienteInput,
  RegistroCocineroInput,
  SolicitarRecuperacionInput,
} from '@foodhub/shared';
import { api } from '../lib/api';
import { crearClienteSinSesion, supabase } from '../lib/supabase';

/**
 * Operaciones del módulo de Autenticación y Control de Acceso (US-AUT-01 a
 * US-AUT-05) vistas desde la app.
 *
 * El reparto entre la API y Supabase Auth no es arbitrario y está fijado en
 * `docs/API-TRANSVERSALES.md`:
 *
 *   REGISTRO   lo hace la API con la service role key, porque crea la cuenta de
 *              GoTrue y la fila de `usuario` en una sola operación. Un `signUp`
 *              desde el teléfono podría dejar una cuenta de autenticación sin
 *              perfil si la segunda escritura falla.
 *   LOGIN      va directo a Supabase con el SDK: la API no ve nunca la
 *              contraseña, solo verifica después el JWT que emitió Supabase.
 *   RECUPERAR  lo dispara la API, que además decide si el correo existe.
 */

/** US-AUT-01 · PAN-AUT-01. Devuelve el perfil recién creado. */
export function registrarCliente(
  datos: RegistroClienteInput,
): Promise<PerfilUsuario> {
  return api.enviar<PerfilUsuario>('/auth/registro/cliente', datos);
}

/** US-AUT-02 · PAN-AUT-02. Además del perfil, crea la fila de `cocinero`. */
export function registrarCocinero(
  datos: RegistroCocineroInput,
): Promise<PerfilUsuario> {
  return api.enviar<PerfilUsuario>('/auth/registro/cocinero', datos);
}

/**
 * US-AUT-04 · PAN-AUT-04.
 *
 * Un 404 con `MENSAJES_AUTH.correoNoRegistrado` significa que el correo no
 * tiene cuenta. Que la respuesta lo revele es una decisión del equipo tomada
 * sobre el criterio de aceptación textual de la historia, no un descuido.
 */
export function solicitarRecuperacion(
  datos: SolicitarRecuperacionInput,
): Promise<{ mensaje: string }> {
  return api.enviar<{ mensaje: string }>('/auth/recuperacion', datos);
}

/**
 * US-AUT-01 y US-AUT-02, quinto criterio: el registro deja la sesión iniciada.
 *
 * Se llama inmediatamente después del 201 con las MISMAS credenciales que el
 * usuario acaba de tipear. No hay endpoint que devuelva un token: la API no
 * emite JWT, solo los verifica.
 */
export async function iniciarSesion(
  email: string,
  password: string,
): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/**
 * Sesión conseguida sin abrir la de la aplicación. Ver `abrirSesionProvisoria`.
 */
export interface SesionProvisoria {
  accessToken: string;
  refreshToken: string;
}

/**
 * US-AUT-01 y US-AUT-02. Autentica SIN que la app se dé por enterada.
 *
 * El registro necesita un token antes de dejar entrar al usuario, porque la
 * foto de perfil se sube contra la sesión recién creada y el endpoint que firma
 * la URL de carga exige autenticación. Si esa autenticación se hiciera sobre el
 * cliente compartido, `GateDeSesion` redirigiría al feed en el acto y la
 * pantalla de registro desaparecería en mitad de la subida.
 *
 * El cliente descartable no persiste nada, así que la sesión de la app sigue
 * cerrada hasta que `adoptarSesion` la abre.
 */
export async function abrirSesionProvisoria(
  email: string,
  password: string,
): Promise<SesionProvisoria> {
  const { data, error } = await crearClienteSinSesion().auth.signInWithPassword(
    { email, password },
  );
  if (error) throw error;

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  };
}

/**
 * US-AUT-01 y US-AUT-02, quinto criterio: el registro deja la sesión iniciada.
 *
 * Adopta en el cliente real los tokens que emitió la autenticación provisoria,
 * en lugar de volver a autenticar. Evita un segundo viaje a GoTrue y, sobre
 * todo, evita dejar dos sesiones abiertas por cada registro: la que se usó para
 * subir la foto y la que entra a la app serían la misma.
 *
 * `setSession` persiste en el Keystore y dispara `onAuthStateChange`, que es lo
 * que hace que `GateDeSesion` mande al cliente al feed y al cocinero a sus
 * publicaciones. No hace falta navegar a mano.
 */
export async function adoptarSesion(sesion: SesionProvisoria): Promise<void> {
  const { error } = await supabase.auth.setSession({
    access_token: sesion.accessToken,
    refresh_token: sesion.refreshToken,
  });
  if (error) throw error;
}

/**
 * US-AUT-04 · PAN-AUT-04.1. Fija la contraseña nueva.
 *
 * Tampoco tiene endpoint, por el mismo motivo que el login: la contraseña
 * nunca pasa por la API. `updateUser` la aplica sobre la sesión de recuperación
 * que deja el enlace del correo, así que la pantalla que llama a esto tiene que
 * comprobar antes que esa sesión exista; sin ella Supabase responde
 * `AuthSessionMissingError` y no hay a quién cambiarle la credencial.
 */
export async function fijarNuevaPassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

/** US-AUT-05 · PAN-AUT-05. Borra el token del Keystore y corta el refresh. */
export async function cerrarSesion(): Promise<void> {
  await supabase.auth.signOut();
}

/**
 * US-AUT-04 · PAN-AUT-04.1. Fija la contraseña nueva.
 *
 * No recibe el token del correo: el enlace ya dejó una sesión de recuperación
 * abierta cuando esta pantalla se monta, y `updateUser` opera sobre ella. Por
 * eso el formulario solo pide la contraseña y no vuelve a pedir el correo.
 *
 * Al terminar se cierra la sesión a propósito. La de recuperación sirve para
 * cambiar la credencial y nada más; dejarla abierta metería al usuario en la
 * app sin haber usado nunca su contraseña nueva, y el criterio de aceptación
 * pide volver al inicio de sesión.
 */
export async function restablecerPassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
  await supabase.auth.signOut();
}
