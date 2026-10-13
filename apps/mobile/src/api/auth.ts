import type {
  PerfilUsuario,
  RegistroClienteInput,
  RegistroCocineroInput,
  SolicitarRecuperacionInput,
} from '@foodhub/shared';
import { api } from '../lib/api';
import { crearClienteSinSesion, supabase } from '../lib/supabase';
import { darDeBajaTokenDePush } from '../lib/tokenDePush';

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
 *
 * La segunda mitad de US-AUT-04 —canjear el enlace del correo y fijar la
 * contraseña nueva— no está acá sino en `hooks/useRecuperacion.ts`: opera sobre
 * un cliente de Supabase descartable, propio de ese flujo, y no sobre la sesión
 * de la app que manejan estas funciones.
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
 * US-AUT-05 · PAN-AUT-05. Borra el token del Keystore y corta el refresh.
 *
 * Antes da de baja el Expo Push Token del dispositivo: con la sesión ya
 * cerrada la API rechaza la baja y el celular seguiría recibiendo los push de
 * esta cuenta.
 */
export async function cerrarSesion(): Promise<void> {
  await darDeBajaTokenDePush();
  await supabase.auth.signOut();
}
