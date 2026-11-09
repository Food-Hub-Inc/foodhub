import {
  MENSAJES_AUTH,
  MENSAJES_ERROR,
  MENSAJES_POR_CODIGO_SUPABASE,
} from '@foodhub/shared';
import {
  Directory,
  DownloadTask,
  File as ExpoFile,
  Paths,
} from 'expo-file-system';
import { useSesion } from '../hooks/useSesion';
import { obtenerToken, supabase } from './supabase';

/**
 * Cliente HTTP de la aplicación móvil contra la API de FoodHub.
 *
 * Resuelve en un solo lugar las tres cosas que toda pantalla necesita y
 * ninguna debería reimplementar:
 *
 *   1. adjuntar el `Authorization: Bearer <token>` de la sesión de Supabase;
 *   2. traducir el formato de error de la API `{ error: { codigo, mensaje } }`
 *      a una excepción tipada que conserva el código y el status;
 *   3. distinguir un fallo de red de un rechazo del servidor, que para el
 *      usuario son dos problemas distintos con dos soluciones distintas.
 *
 * Es gemelo del cliente del panel (`apps/admin/src/lib/api.ts`): mismo
 * contrato, mismos nombres, misma traducción de errores. Que se parezcan no es
 * casualidad, es lo que hace que un cambio en `docs/API-TRANSVERSALES.md` se
 * refleje igual en los dos clientes.
 */

const urlApi = process.env.EXPO_PUBLIC_API_URL;

if (!urlApi) {
  throw new Error(
    'Falta EXPO_PUBLIC_API_URL en el .env de apps/mobile. Copiá .env.example y completala.',
  );
}

/**
 * Prefijo de versión de la API. Vive acá y no en el `.env`: es parte del
 * contrato, no del ambiente. Cambiar de `v1` a `v2` es un cambio de código.
 */
const BASE = `${urlApi.replace(/\/+$/, '')}/api/v1`;

/** Detalle de un error de validación de zod devuelto por la API. */
export interface CampoInvalido {
  campo: string;
  mensaje: string;
}

/**
 * Error devuelto por la API o por la capa de transporte.
 *
 * Lleva el `codigo` además del `estado` porque varias decisiones de la interfaz
 * dependen de cuál de los 403 posibles llegó: `CUENTA_SUSPENDIDA` y
 * `ROL_INSUFICIENTE` comparten status y significan cosas distintas para el
 * usuario.
 */
export class ErrorApi extends Error {
  readonly estado: number;
  readonly codigo: string;
  readonly campos: readonly CampoInvalido[];

  constructor(
    estado: number,
    codigo: string,
    mensaje: string,
    campos: readonly CampoInvalido[] = [],
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.estado = estado;
    this.codigo = codigo;
    this.campos = campos;
  }

  /** Mensaje de un campo puntual, para mostrarlo debajo del input que falló. */
  mensajeDe(campo: string): string | undefined {
    return this.campos.find((c) => c.campo === campo)?.mensaje;
  }
}

/** `true` si el error es una respuesta de la API y no un fallo de JavaScript. */
export function esErrorApi(error: unknown): error is ErrorApi {
  return error instanceof ErrorApi;
}

/**
 * Código de error de Supabase Auth, si el error viene de ahí.
 *
 * Se comprueba la forma y no `instanceof AuthApiError`: el SDK no exporta esa
 * clase de forma estable y un `catch` recibe siempre `unknown`. Lo único que
 * hace falta es el campo `code`, que GoTrue documenta como su identificador
 * estable de error.
 */
export function codigoDeSupabase(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const codigo = (error as { code?: unknown }).code;
  return typeof codigo === 'string' ? codigo : undefined;
}

/**
 * Texto que se le muestra al usuario ante cualquier error.
 *
 * Un `Error` de JavaScript sin controlar lleva detalle técnico en su mensaje
 * (nombres de módulos, stack). Mostrarlo filtra información y no ayuda a nadie:
 * fuera de un `ErrorApi` se responde siempre con el mensaje genérico.
 *
 * La excepción son los errores de Supabase Auth con un código que ya tiene
 * texto nuestro aprobado: el login y el restablecimiento por enlace hablan
 * directo con GoTrue y su error nunca pasa por la API, así que sin esta
 * traducción "la contraseña es igual a la anterior" se mostraba como
 * "Ocurrió un error inesperado".
 */
export function mensajeDeError(error: unknown): string {
  if (esErrorApi(error)) return error.message;

  const codigo = codigoDeSupabase(error);
  const traducido =
    codigo === undefined ? undefined : MENSAJES_POR_CODIGO_SUPABASE[codigo];

  return traducido ?? MENSAJES_ERROR.interno;
}

/**
 * Forma de un cuerpo de error de la API. Se tipa como parcial porque llega de
 * la red: nada garantiza que un proxy o un 502 del hosting respeten el formato.
 */
interface CuerpoError {
  error?: {
    codigo?: string;
    mensaje?: string;
    campos?: CampoInvalido[];
  };
}

/**
 * Códigos que significan que el token dejó de servir. No se arreglan
 * reintentando: hay que volver a iniciar sesión.
 */
const CODIGOS_SESION_MUERTA = new Set([
  'SIN_TOKEN',
  'TOKEN_INVALIDO',
  'PERFIL_INEXISTENTE',
]);

/**
 * Los 403 que significan que la cuenta dejó de estar habilitada.
 *
 * Son 403 y no 401 —el token es válido, lo que cambió es el estado de la
 * cuenta— así que no entran por `CODIGOS_SESION_MUERTA`. Sin este caso, un
 * usuario al que le suspendían la cuenta con la sesión ya abierta se quedaba
 * dentro de la app viendo "No pudimos cargar tu perfil", con un botón de
 * reintento que contra un 403 no podía funcionar nunca.
 */
const CODIGOS_CUENTA_BLOQUEADA = new Set([
  'CUENTA_SUSPENDIDA',
  'CUENTA_ELIMINADA',
]);

/**
 * Token con el que firmar la request.
 *
 * Se puede pasar uno explícito, y no siempre el de la sesión guardada, por un
 * único caso: el registro sube la foto de perfil ANTES de abrir la sesión en la
 * app (ver `useRegistro`). En ese momento hay un token válido pero todavía no
 * hay sesión en el cliente de Supabase, así que `obtenerToken` devolvería null.
 */
async function encabezados(tokenExplicito?: string): Promise<Headers> {
  const cabeceras = new Headers({ Accept: 'application/json' });
  const token = tokenExplicito ?? (await obtenerToken());
  if (token) cabeceras.set('Authorization', `Bearer ${token}`);
  return cabeceras;
}

function mensajePorDefecto(estado: number): string {
  if (estado === 401) return MENSAJES_AUTH.sesionExpirada;
  if (estado === 404) return MENSAJES_ERROR.noEncontrado;
  if (estado === 429) return MENSAJES_ERROR.demasiadasSolicitudes;
  return MENSAJES_ERROR.interno;
}

/**
 * Cierra la sesión cuando la respuesta dice que ya no sirve para nada.
 *
 * Son dos casos con la misma consecuencia y distinto motivo:
 *
 *   401 con token muerto     la app queda en un estado engañoso: la sesión
 *                            sigue en el Keystore, la interfaz se ve iniciada y
 *                            todas las consultas fallan.
 *   403 con cuenta bloqueada la cuenta dejó de estar habilitada mientras la
 *                            sesión estaba abierta (US-AUT-03). Acá además se
 *                            deja el aviso ANTES de cerrar, para que el login
 *                            lo encuentre ya puesto cuando el gate lo monte. El
 *                            texto es el que mandó la API, o sea el literal
 *                            exacto del criterio: repetirlo del lado del
 *                            cliente sería tener dos copias que se
 *                            desincronizan.
 *
 * Nada de esto aplica cuando la request llevaba un token explícito: ese token
 * no es la sesión de la app —todavía no hay ninguna— y cerrar la que hubiera
 * expulsaría a un usuario que no tiene nada que ver con el fallo.
 */
async function cerrarSesionSiHaceFalta(datos: {
  estado: number;
  codigo: string;
  mensaje: string;
  conTokenExplicito: boolean;
}): Promise<void> {
  if (datos.conTokenExplicito) return;

  if (datos.estado === 401 && CODIGOS_SESION_MUERTA.has(datos.codigo)) {
    await supabase.auth.signOut();
    return;
  }

  if (datos.estado === 403 && CODIGOS_CUENTA_BLOQUEADA.has(datos.codigo)) {
    useSesion.getState().fijarAviso(datos.mensaje);
    await supabase.auth.signOut();
  }
}

async function aError(
  respuesta: Response,
  tokenExplicito?: string,
): Promise<ErrorApi> {
  let cuerpo: CuerpoError = {};
  try {
    cuerpo = (await respuesta.json()) as CuerpoError;
  } catch {
    // Un 502 del proxy o un 429 del rate limiter pueden responder HTML.
  }

  const codigo = cuerpo.error?.codigo ?? `HTTP_${String(respuesta.status)}`;
  const mensaje = cuerpo.error?.mensaje ?? mensajePorDefecto(respuesta.status);

  await cerrarSesionSiHaceFalta({
    estado: respuesta.status,
    codigo,
    mensaje,
    conTokenExplicito: tokenExplicito !== undefined,
  });

  return new ErrorApi(
    respuesta.status,
    codigo,
    mensaje,
    cuerpo.error?.campos ?? [],
  );
}

/**
 * `fetch` solo rechaza cuando la request no llegó a destino: sin datos, wifi
 * caído, API apagada. Un 500 es una promesa resuelta. Traducir ese caso es lo
 * que permite decirle al usuario "revisá tu conexión" en vez de "error interno",
 * que en un teléfono es la diferencia entre saber qué hacer y no saberlo.
 */
async function pedir(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new ErrorApi(0, 'SIN_CONEXION', MENSAJES_ERROR.sinConexion);
  }
}

/**
 * Un 204 no tiene cuerpo y `response.json()` sobre él lanza. Devolver
 * `undefined` es correcto: quien llama a un endpoint sin respuesta declara `void`.
 */
async function leerCuerpo(respuesta: Response): Promise<unknown> {
  if (respuesta.status === 204) return undefined;
  const texto = await respuesta.text();
  if (!texto) return undefined;
  return JSON.parse(texto) as unknown;
}

async function conCuerpo<T>(
  metodo: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  ruta: string,
  datos?: unknown,
  token?: string,
): Promise<T> {
  const cabeceras = await encabezados(token);
  if (datos !== undefined) cabeceras.set('Content-Type', 'application/json');

  const respuesta = await pedir(`${BASE}${ruta}`, {
    method: metodo,
    headers: cabeceras,
    ...(datos === undefined ? {} : { body: JSON.stringify(datos) }),
  });

  if (!respuesta.ok) throw await aError(respuesta, token);
  return (await leerCuerpo(respuesta)) as T;
}

export const api = {
  async obtener<T>(ruta: string): Promise<T> {
    const respuesta = await pedir(`${BASE}${ruta}`, {
      method: 'GET',
      headers: await encabezados(),
    });
    if (!respuesta.ok) throw await aError(respuesta);
    return (await leerCuerpo(respuesta)) as T;
  },

  enviar<T>(ruta: string, datos?: unknown, token?: string): Promise<T> {
    return conCuerpo<T>('POST', ruta, datos, token);
  },

  /**
   * PUT. Lo usan las altas IDEMPOTENTES: marcar un favorito (US-EXP-06) deja el
   * mismo estado la primera vez y la quinta, y el indice unico de la base lo
   * garantiza. Con POST, un doble toque del corazon tendria que responder un
   * error que al usuario no le dice nada.
   *
   * Sin cuerpo en el caso normal: el id del recurso va en la ruta y el del
   * cliente sale de la sesion, asi que no queda nada que mandar.
   */
  reemplazar<T>(ruta: string, datos?: unknown): Promise<T> {
    return conCuerpo<T>('PUT', ruta, datos);
  },

  modificar<T>(ruta: string, datos: unknown, token?: string): Promise<T> {
    return conCuerpo<T>('PATCH', ruta, datos, token);
  },

  eliminar<T>(ruta: string, datos?: unknown): Promise<T> {
    return conCuerpo<T>('DELETE', ruta, datos);
  },

  /**
   * Descarga un binario (PDF u otro) autentificado con el token de la sesion
   * y lo guarda en el directorio cache del dispositivo.
   *
   * Devuelve la URI local del archivo para que el caller la guarde en la
   * carpeta Descargas, la abra con `Linking.openURL` o el visor que
   * corresponda.
   *
   * Usa `DownloadTask` de expo-file-system (no `fetch`+`blob`): en RN un
   * blob no tiene URL estable para abrir desde otra app, y descargar directo
   * a cache esquiva ese problema. Los headers de auth se envian como
   * `headers` de la tarea.
   */
  async descargarBinario(ruta: string, nombreArchivo: string): Promise<string> {
    const token = await obtenerToken();
    const urlCompleta = `${BASE}${ruta}`;
    const destino = new Directory(Paths.cache, 'foodhub');
    if (!destino.exists) destino.create();

    const archivoDestino = new ExpoFile(destino, nombreArchivo);
    const tarea = new DownloadTask(urlCompleta, archivoDestino, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    try {
      const resultado = await tarea.downloadAsync();
      if (!resultado) {
        throw new Error('La descarga del archivo no devolvió un archivo.');
      }
      return resultado.uri;
    } finally {
      tarea.release();
    }
  },
};
