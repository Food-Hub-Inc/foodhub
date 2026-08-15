import { File } from 'expo-file-system';
import { solicitarUrlDeCargaDeFotoPerfil } from '../api/almacenamiento';
import type { FotoElegida } from '../components/ui/SelectorDeFoto';
import { CLAVE_ANONIMA } from './supabase';

/**
 * Sube la foto de perfil a Supabase Storage y devuelve su URL definitiva.
 *
 * DOS PASOS, Y EL SEGUNDO NO PASA POR LA API:
 *
 *   1. la API firma una URL de carga contra el id de la sesión;
 *   2. el archivo viaja del teléfono DIRECTO al bucket.
 *
 * Es la decisión de arquitectura del punto de factibilidad técnica del
 * documento de proyecto, y el motivo por el que el body de la API está
 * limitado a 1 MB: nunca recibe binarios.
 *
 * `token` solo lo usa el registro, que sube la foto antes de abrir la sesión en
 * la app (ver `useRegistro`). Desde "Mi perfil" se omite y vale la sesión real.
 */

/**
 * Un año de caché. El nombre del archivo lleva la marca de tiempo de la
 * subida, así que la URL cambia cada vez que se reemplaza la foto: nunca hay
 * una versión vieja que invalidar y cachear agresivamente es gratis.
 */
const CACHE_SEGUNDOS = 31_536_000;

export async function subirFotoDePerfil(
  foto: FotoElegida,
  token?: string,
): Promise<string> {
  const carga = await solicitarUrlDeCargaDeFotoPerfil(
    { mimeType: foto.mimeType, tamano: foto.tamano },
    token,
  );

  /**
   * `File.upload` transfiere el archivo desde el módulo nativo sin leerlo a
   * memoria. Con `arrayBuffer()` los 5 MB que admite el criterio de aceptación
   * pasarían enteros por el heap de JavaScript, que en un teléfono de gama baja
   * es justo lo que dispara el cierre por falta de memoria.
   *
   * Los encabezados replican los que manda `uploadToSignedUrl` del SDK: el
   * `token` de la URL firmada autoriza la escritura, pero el gateway de
   * Supabase igual exige el `apikey` en toda request.
   */
  const respuesta = await new File(foto.uri).upload(carga.url, {
    httpMethod: 'PUT',
    headers: {
      apikey: CLAVE_ANONIMA,
      authorization: `Bearer ${CLAVE_ANONIMA}`,
      'content-type': foto.mimeType,
      'cache-control': `max-age=${String(CACHE_SEGUNDOS)}`,
    },
  });

  /**
   * `upload` resuelve incluso con un 4xx: solo rechaza si no pudo leer el
   * archivo o si la request nunca llegó. El estado hay que mirarlo a mano o una
   * subida rechazada se guardaría como exitosa y el perfil quedaría apuntando a
   * un objeto que no existe.
   */
  if (respuesta.status < 200 || respuesta.status >= 300) {
    throw new Error(
      `Supabase Storage rechazó la subida (${String(respuesta.status)}).`,
    );
  }

  return carga.urlPublica;
}
