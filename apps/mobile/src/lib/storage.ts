import { File } from 'expo-file-system';
import type { UrlDeCarga } from '@foodhub/shared';
import { CLAVE_ANONIMA } from './supabase';

/**
 * Subida de un archivo a Supabase Storage contra una URL ya firmada.
 *
 * DOS PASOS, Y EL SEGUNDO NO PASA POR LA API:
 *
 *   1. la API firma una URL de carga acotada a quien pide y a dónde escribe;
 *   2. el archivo viaja del teléfono DIRECTO al bucket.
 *
 * Es la decisión de arquitectura del punto de factibilidad técnica del
 * documento de proyecto, y el motivo por el que el body de la API está limitado
 * a 1 MB: nunca recibe binarios.
 *
 * Esta función es el paso 2, que es idéntico suba lo que suba: la foto de
 * perfil (US-GURP-02), la de un plato (US-PUB-01) o una imagen del chat
 * (US-MSG-03). Lo que cambia entre los tres es QUIÉN firma y con qué límites, y
 * eso vive en el endpoint de cada uno.
 */

/**
 * Un año de caché. El nombre del archivo lleva la marca de tiempo de la subida,
 * así que la URL cambia cada vez que se reemplaza el contenido: nunca hay una
 * versión vieja que invalidar y cachear agresivamente es gratis.
 */
const CACHE_SEGUNDOS = 31_536_000;

export async function subirArchivoFirmado(entrada: {
  uri: string;
  mimeType: string;
  carga: UrlDeCarga;
}): Promise<string> {
  /**
   * `File.upload` transfiere el archivo desde el módulo nativo sin leerlo a
   * memoria. Con `arrayBuffer()` los 8 MB que admite el criterio de US-MSG-03
   * pasarían enteros por el heap de JavaScript, que en un teléfono de gama baja
   * es justo lo que dispara el cierre por falta de memoria.
   *
   * Los encabezados replican los que manda `uploadToSignedUrl` del SDK: el
   * `token` de la URL firmada autoriza la escritura, pero el gateway de
   * Supabase igual exige el `apikey` en toda request.
   */
  const respuesta = await new File(entrada.uri).upload(entrada.carga.url, {
    httpMethod: 'PUT',
    headers: {
      apikey: CLAVE_ANONIMA,
      authorization: `Bearer ${CLAVE_ANONIMA}`,
      'content-type': entrada.mimeType,
      'cache-control': `max-age=${String(CACHE_SEGUNDOS)}`,
    },
  });

  /**
   * `upload` resuelve incluso con un 4xx: solo rechaza si no pudo leer el
   * archivo o si la request nunca llegó. El estado hay que mirarlo a mano o una
   * subida rechazada se guardaría como exitosa y la fila quedaría apuntando a
   * un objeto que no existe.
   */
  if (respuesta.status < 200 || respuesta.status >= 300) {
    throw new Error(
      `Supabase Storage rechazó la subida (${String(respuesta.status)}).`,
    );
  }

  return entrada.carga.urlPublica;
}
