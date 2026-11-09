import {
  MENSAJES_AUTH,
  MENSAJES_ERROR,
  MENSAJES_POR_CODIGO_SUPABASE,
} from '@foodhub/shared';
import { obtenerToken, supabase } from './supabase.js';

/**
 * Cliente HTTP del panel contra la API de FoodHub.
 *
 * Resuelve en un solo lugar las tres cosas que todas las pantallas necesitan y
 * ninguna debería reimplementar:
 *
 *   1. adjuntar el `Authorization: Bearer <token>` de la sesión de Supabase;
 *   2. traducir el formato de error de la API `{ error: { codigo, mensaje } }`
 *      a una excepción tipada que conserva el código y el status;
 *   3. distinguir un fallo de red de un rechazo del servidor, que para el
 *      usuario son dos problemas distintos con dos soluciones distintas.
 *
 * El contrato de los endpoints está en `docs/API-TRANSVERSALES.md`.
 */

const urlApi = import.meta.env.VITE_API_URL;

if (!urlApi) {
  throw new Error(
    'Falta VITE_API_URL. Copiá .env.example a .env y completala.',
  );
}

/** Prefijo de versión de la API. Vive acá y no en el .env: es parte del contrato, no del ambiente. */
const BASE = `${urlApi.replace(/\/+$/, '')}/api/v1`;

/** Detalle de un error de validación de zod devuelto por la API. */
export interface CampoInvalido {
  campo: string;
  mensaje: string;
}

/**
 * Error devuelto por la API o por la capa de transporte.
 *
 * Lleva el `codigo` además del `status` porque varias decisiones de la interfaz
 * dependen de cuál de los 403 posibles llegó: `CUENTA_SUSPENDIDA` y
 * `ROL_INSUFICIENTE` comparten status y significan cosas distintas.
 */
export class ErrorApi extends Error {
  readonly status: number;
  readonly codigo: string;
  readonly campos: readonly CampoInvalido[];

  constructor(
    status: number,
    codigo: string,
    mensaje: string,
    campos: readonly CampoInvalido[] = [],
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.status = status;
    this.codigo = codigo;
    this.campos = campos;
  }

  /** Mensaje de un campo puntual, para mostrarlo debajo del input que falló. */
  mensajeDe(campo: string): string | undefined {
    return this.campos.find((c) => c.campo === campo)?.mensaje;
  }
}

/** Valores admitidos en un query string. `undefined` se omite. */
export type ParametrosConsulta = Record<
  string,
  string | number | undefined | null
>;

function construirUrl(ruta: string, parametros?: ParametrosConsulta): string {
  const url = new URL(`${BASE}${ruta}`);
  for (const [clave, valor] of Object.entries(parametros ?? {})) {
    // Un filtro vacío no es un filtro: mandarlo como cadena vacía haría que el
    // servidor busque registros cuyo campo sea literalmente "".
    if (valor === undefined || valor === null || valor === '') continue;
    url.searchParams.set(clave, String(valor));
  }
  return url.toString();
}

async function encabezados(): Promise<Headers> {
  const cabeceras = new Headers({ Accept: 'application/json' });
  const token = await obtenerToken();
  if (token) cabeceras.set('Authorization', `Bearer ${token}`);
  return cabeceras;
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

const CODIGOS_SESION_MUERTA = new Set([
  'SIN_TOKEN',
  'TOKEN_INVALIDO',
  'PERFIL_INEXISTENTE',
]);

async function aError(respuesta: Response): Promise<ErrorApi> {
  let cuerpo: CuerpoError = {};
  try {
    cuerpo = (await respuesta.json()) as CuerpoError;
  } catch {
    // Un 502 del proxy o un 429 del rate limiter pueden responder HTML.
  }

  const codigo = cuerpo.error?.codigo ?? `HTTP_${respuesta.status}`;
  const mensaje = cuerpo.error?.mensaje ?? mensajePorDefecto(respuesta.status);

  /**
   * Un token vencido o revocado no se arregla reintentando y deja al panel en
   * un estado engañoso: la sesión sigue en localStorage, la interfaz se ve
   * iniciada y todas las consultas fallan. Se cierra acá para que el guardia de
   * ruta redirija al login en el mismo tick.
   */
  if (respuesta.status === 401 && CODIGOS_SESION_MUERTA.has(codigo)) {
    await supabase.auth.signOut();
  }

  return new ErrorApi(
    respuesta.status,
    codigo,
    mensaje,
    cuerpo.error?.campos ?? [],
  );
}

function mensajePorDefecto(status: number): string {
  if (status === 401) return MENSAJES_AUTH.sesionExpirada;
  if (status === 404) return MENSAJES_ERROR.noEncontrado;
  if (status === 429) return MENSAJES_ERROR.demasiadasSolicitudes;
  return MENSAJES_ERROR.interno;
}

/**
 * `fetch` solo rechaza cuando la request no llegó a destino: DNS caído, API
 * apagada, CORS. Un 500 es una promesa resuelta. Traducir ese caso es lo que
 * permite decirle al usuario "revisá tu conexión" en vez de "error interno".
 */
async function pedir(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new ErrorApi(0, 'SIN_CONEXION', MENSAJES_ERROR.sinConexion);
  }
}

async function conCuerpo<T>(
  metodo: 'POST' | 'PATCH' | 'DELETE',
  ruta: string,
  datos?: unknown,
): Promise<T> {
  const cabeceras = await encabezados();
  if (datos !== undefined) cabeceras.set('Content-Type', 'application/json');

  const respuesta = await pedir(construirUrl(ruta), {
    method: metodo,
    headers: cabeceras,
    ...(datos === undefined ? {} : { body: JSON.stringify(datos) }),
  });

  if (!respuesta.ok) throw await aError(respuesta);
  return (await leerCuerpo(respuesta)) as T;
}

/**
 * Un 204 no tiene cuerpo y `response.json()` sobre él lanza. Devolver
 * `undefined` es correcto: quien llama a un endpoint sin respuesta declara `void`.
 */
async function leerCuerpo(respuesta: Response): Promise<unknown> {
  if (respuesta.status === 204) return undefined;
  const texto = await respuesta.text();
  if (!texto) return undefined;
  return JSON.parse(texto);
}

export const api = {
  async obtener<T>(ruta: string, parametros?: ParametrosConsulta): Promise<T> {
    const respuesta = await pedir(construirUrl(ruta, parametros), {
      method: 'GET',
      headers: await encabezados(),
    });
    if (!respuesta.ok) throw await aError(respuesta);
    return (await leerCuerpo(respuesta)) as T;
  },

  enviar<T>(ruta: string, datos?: unknown): Promise<T> {
    return conCuerpo<T>('POST', ruta, datos);
  },

  modificar<T>(ruta: string, datos: unknown): Promise<T> {
    return conCuerpo<T>('PATCH', ruta, datos);
  },

  eliminar<T>(ruta: string, datos?: unknown): Promise<T> {
    return conCuerpo<T>('DELETE', ruta, datos);
  },

  /**
   * Descarga un `text/csv` de la API.
   *
   * No se puede resolver con un `<a href>`: el endpoint exige el encabezado
   * `Authorization` y una navegación del navegador no lo lleva. Se trae el
   * archivo con fetch y se dispara la descarga desde un blob local.
   */
  async descargarCsv(
    ruta: string,
    nombreArchivo: string,
    parametros?: ParametrosConsulta,
  ): Promise<void> {
    const cabeceras = await encabezados();
    cabeceras.set('Accept', 'text/csv');

    const respuesta = await pedir(construirUrl(ruta, parametros), {
      method: 'GET',
      headers: cabeceras,
    });
    if (!respuesta.ok) throw await aError(respuesta);

    const blob = await respuesta.blob();
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombreArchivo;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    // Sin esto el blob queda retenido en memoria hasta que se cierre la pestaña.
    URL.revokeObjectURL(url);
  },
};

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
 * Convierte cualquier excepción en un mensaje mostrable al usuario.
 *
 * Gemelo de `apps/mobile/src/lib/api.ts`: los errores de Supabase Auth con
 * texto propio aprobado se traducen; el resto cae al genérico para no filtrar
 * detalle técnico.
 */
export function mensajeDeError(error: unknown): string {
  if (error instanceof ErrorApi) return error.message;

  const codigo = codigoDeSupabase(error);
  const traducido =
    codigo === undefined ? undefined : MENSAJES_POR_CODIGO_SUPABASE[codigo];

  return traducido ?? MENSAJES_ERROR.interno;
}
