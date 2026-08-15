import { createClient, type AuthError } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import { logger } from './logger.js';

/**
 * Clientes de Supabase del lado del servidor.
 *
 * La API no emite tokens ni valida credenciales por su cuenta: delega en
 * GoTrue. Para eso necesita dos identidades distintas, y mezclarlas es la
 * forma mas rapida de abrir un agujero de seguridad.
 *
 *   supabaseAdmin        service role. IGNORA las politicas RLS por completo.
 *                        Solo puede existir en este proceso: si la clave llega
 *                        al bundle de mobile o admin, cualquiera con la app
 *                        instalada tiene acceso total a la base.
 *   crearClienteAnonimo  clave publica. Se usa para las operaciones que un
 *                        usuario haria por si mismo (reautenticarse, pedir el
 *                        enlace de recuperacion).
 */

/**
 * `autoRefreshToken` y `persistSession` van en false porque este proceso no
 * tiene sesion propia ni almacenamiento donde persistirla: cada request llega
 * con su propio JWT. Dejarlos activos hace que el cliente arranque un timer de
 * refresco que nunca tiene nada que refrescar.
 */
const opcionesSinSesion = {
  auth: { autoRefreshToken: false, persistSession: false },
} as const;

/**
 * El tipo se infiere de `createClient` en lugar de anotarse como
 * `SupabaseClient`: los valores por defecto de los parametros genericos del
 * alias exportado no coinciden con los que produce la factory, y anotarlo
 * degrada todo el cliente a `any`.
 */
export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  opcionesSinSesion,
);

/**
 * Cliente anonimo NUEVO en cada llamada, y no una instancia compartida.
 *
 * `signInWithPassword` deja la sesion resultante guardada en memoria dentro del
 * cliente y, a partir de ahi, ese cliente firma sus requests con el token del
 * ultimo usuario que se autentico. Un singleton compartido entre requests
 * concurrentes mezclaria identidades. Un cliente descartable no puede.
 */
export function crearClienteAnonimo() {
  return createClient(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY,
    opcionesSinSesion,
  );
}

/**
 * Distingue "ese correo ya tiene cuenta" de cualquier otro fallo de GoTrue.
 *
 * GoTrue devuelve 422 para varias validaciones distintas (contrasena debil,
 * correo mal formado, correo ya usado), asi que mirar solo el status
 * convertiria cualquiera de ellas en un "correo duplicado" y le mostraria al
 * usuario un mensaje que no tiene nada que ver con lo que le pasa. El campo
 * `code` es el unico dato estable para diferenciarlas.
 */
export function esCorreoYaRegistrado(error: AuthError): boolean {
  return error.code === 'email_exists';
}

/**
 * Ejecuta la creacion del perfil y, si falla, borra la cuenta de GoTrue.
 *
 * Sin esta compensacion el correo queda ocupado por una credencial sin perfil:
 * el usuario no puede entrar (no tiene fila en `usuario`) ni volver a
 * registrarse (el correo ya existe), y solo alguien con acceso al panel de
 * Supabase puede desbloquearlo. Es la aproximacion mas cercana a una operacion
 * atomica entre dos sistemas que no comparten transaccion.
 *
 * El fallo del borrado se loguea pero no se propaga: el error que le importa a
 * quien llamo es el original, no el de la limpieza.
 */
export async function conCompensacionDeCuenta<T>(
  idCuenta: string,
  crearPerfil: () => Promise<T>,
): Promise<T> {
  try {
    return await crearPerfil();
  } catch (error) {
    try {
      await supabaseAdmin.auth.admin.deleteUser(idCuenta);
    } catch (errorBorrado) {
      logger.error(
        { err: errorBorrado, idCuenta },
        'quedó una cuenta de GoTrue sin perfil asociado',
      );
    }
    throw error;
  }
}

/**
 * Revoca sesiones de GoTrue a partir de un access token valido.
 *
 * `global` invalida todos los refresh tokens del usuario, no solo el del
 * dispositivo que hizo la llamada: es lo que exige la baja de cuenta de
 * US-GURP-04, donde la cuenta tiene que dejar de funcionar en todos lados.
 * `local` revoca unicamente la sesion del token informado.
 *
 * Es "fire and forget" como el resto de la instrumentacion: si GoTrue no
 * responde, el estado de la cuenta en la base ya cambio y el middleware de
 * autenticacion bloquea igual en la proxima request. Convertir eso en un 500
 * le haria creer al usuario que la baja no se aplico.
 */
export async function revocarSesiones(
  accessToken: string,
  alcance: 'global' | 'local',
): Promise<void> {
  try {
    const { error } = await supabaseAdmin.auth.admin.signOut(
      accessToken,
      alcance,
    );
    if (error) {
      logger.error(
        { err: error, alcance },
        'no se pudieron revocar las sesiones',
      );
    }
  } catch (error) {
    logger.error(
      { err: error, alcance },
      'no se pudieron revocar las sesiones',
    );
  }
}
