/**
 * PAN-AUT-04.1 · Lectura del enlace de acceso que llega por correo.
 *
 * Este módulo no toca red ni estado: traduce la URL cruda que entrega Android a
 * uno de tres resultados y nada más. Quien decide qué hacer con eso es
 * `useEnlaceDeAcceso`.
 *
 * SON DOS ENLACES CON EL MISMO DESTINO
 * ---------------------------------------------------------------------------
 * A `foodhub://nueva-password` llegan dos correos distintos de GoTrue:
 *
 *   `type=recovery`  US-AUT-04 · el usuario pidió recuperar su contraseña;
 *   `type=invite`    US-GURP-06 · un administrador dio de alta su cuenta desde
 *                    el panel y todavía no tiene contraseña propia.
 *
 * Los dos terminan en la misma pantalla porque son el mismo problema —una
 * sesión que abrió GoTrue y una cuenta sin credencial elegida por su dueño—,
 * pero se distinguen con `motivo` porque no se le dice lo mismo a alguien que
 * recupera el acceso que a alguien que entra por primera vez.
 *
 * POR QUÉ HAY QUE LEER EL ENLACE A MANO
 * ---------------------------------------------------------------------------
 * `detectSessionInUrl` está en `false` en supabase.ts porque no hay
 * `window.location` en una app nativa. Pero el enlace del correo usa el mismo
 * mecanismo de GoTrue: valida el token contra `/auth/v1/verify` y redirige a
 * `foodhub://nueva-password#access_token=...&refresh_token=...&type=recovery`
 * (flujo implicit, el único que puede usar este proyecto: quien dispara
 * `resetPasswordForEmail` es la API —ver auth.service.ts—, no el teléfono, así
 * que no hay dónde guardar el `code_verifier` que pediría PKCE).
 *
 * Sin esta lectura el SDK nunca se entera de esos tokens.
 */

/** Ruta a la que GoTrue redirige el enlace (`URL_RECUPERACION_PASSWORD`). */
const RUTA_ENLACE = 'nueva-password';

/** Por qué llegó el enlace. Cambia lo que dice la pantalla, no lo que hace. */
export type MotivoDelEnlace = 'recuperacion' | 'invitacion';

/** El `type` del fragmento, traducido al vocabulario del dominio. */
const MOTIVO_POR_TIPO: Record<string, MotivoDelEnlace> = {
  recovery: 'recuperacion',
  invite: 'invitacion',
};

/** Lo que trae un enlace de acceso, ya interpretado. */
export type EnlaceDeAcceso =
  /** Enlace válido: GoTrue ya verificó el token y devolvió la sesión. */
  | {
      readonly tipo: 'tokens';
      readonly motivo: MotivoDelEnlace;
      readonly accessToken: string;
      readonly refreshToken: string;
    }
  /** Enlace vencido, ya usado o revocado: GoTrue redirigió con `error`. */
  | { readonly tipo: 'error' };

/**
 * Interpreta la URL con la que se abrió la app.
 *
 * Devuelve `null` solo cuando la URL no tiene nada que ver con esta pantalla:
 * no vino ningún enlace (arranque normal desde el ícono) o vino un deep link a
 * otra ruta. Todo lo demás produce un resultado que la pantalla dibuja.
 *
 * La distinción importa: sin ella, un enlace roto quedaba indistinguible de "no
 * vino ningún enlace" y el gate resolvía el arranque como si el usuario hubiera
 * abierto la app desde el ícono, mandándolo a la bienvenida sin explicar nada.
 */
export function leerEnlaceDeAcceso(url: string | null): EnlaceDeAcceso | null {
  if (!url) return null;

  const { ruta, parametros } = desarmar(url);
  if (ruta !== RUTA_ENLACE) return null;

  const motivo = MOTIVO_POR_TIPO[parametros.get('type') ?? ''];
  const accessToken = parametros.get('access_token');
  const refreshToken = parametros.get('refresh_token');

  if (motivo && accessToken !== null && refreshToken !== null) {
    return { tipo: 'tokens', motivo, accessToken, refreshToken };
  }

  /**
   * Cualquier otra cosa que aterrice en esta ruta viene del correo y no sirve:
   * el enlace venció o ya se usó (GoTrue redirige con `error`/`error_code` en
   * lugar de los tokens) o el cliente de correo lo recortó. Para el usuario son
   * el mismo problema con la misma salida, así que se informan igual y no se
   * inventan tres mensajes distintos.
   */
  return { tipo: 'error' };
}

/**
 * Parte la URL en ruta y parámetros, sin usar `new URL()`.
 *
 * `foodhub://` no es un esquema de URL válido para el parser de la plataforma y
 * el resultado de `new URL()` sobre esquemas propios varía entre motores: lo que
 * en uno cae en `host` en otro cae en `pathname`. Con dos expresiones regulares
 * el resultado es el mismo en todos lados y no depende de qué polyfill haya.
 */
function desarmar(url: string): {
  ruta: string;
  parametros: URLSearchParams;
} {
  const sinEsquema = url.replace(/^[a-zA-Z][\w+.-]*:\/\//, '');
  const corte = sinEsquema.search(/[?#]/);

  const ruta = (corte === -1 ? sinEsquema : sinEsquema.slice(0, corte)).replace(
    /^\/+|\/+$/g,
    '',
  );

  /**
   * GoTrue manda los tokens en el fragmento (flujo implicit) y el error unas
   * veces en el fragmento y otras en la query, según la versión del servidor.
   * Se juntan los dos en una sola bolsa en lugar de apostar a uno.
   */
  const cola = corte === -1 ? '' : sinEsquema.slice(corte + 1);

  return { ruta, parametros: new URLSearchParams(cola.replace(/[?#]/g, '&')) };
}
