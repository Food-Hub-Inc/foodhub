import { File } from 'expo-file-system';
import { solicitarUrlDeCargaDeFotoResena } from '../api/almacenamiento';
import type { FotoElegida } from '../components/ui/SelectorDeFoto';
import { CLAVE_ANONIMA } from './supabase';

/**
 * Sube la foto adjunta a una reseña y devuelve su URL definitiva — US-RES-01.
 *
 * Calco de `subirFotoDePlato.ts`: mismo mecanismo de dos pasos (la API firma,
 * el dispositivo sube contra la URL firmada) y los mismos encabezados del PUT.
 * Lo único que cambia es el endpoint, porque el bucket y el rol son otros.
 */

/**
 * Un año de caché, igual que las otras dos subidas. El nombre del archivo lleva
 * la marca de tiempo, así que la URL cambia en cada subida: nunca hay una
 * versión vieja que invalidar.
 */
const CACHE_SEGUNDOS = 31_536_000;

export async function subirFotoDeResena(foto: FotoElegida): Promise<string> {
  const carga = await solicitarUrlDeCargaDeFotoResena({
    mimeType: foto.mimeType,
    tamano: foto.tamano,
  });

  /**
   * `File.upload` transfiere desde el módulo nativo sin leer el archivo a
   * memoria. Con `arrayBuffer()` los 5 MB que admite el criterio pasarían
   * enteros por el heap de JavaScript, que en un teléfono de gama baja es lo
   * que dispara el cierre por falta de memoria.
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
   * archivo o si la request nunca llegó. Sin mirar el estado, una subida
   * rechazada se guardaría como exitosa y la reseña quedaría apuntando a un
   * objeto que no existe.
   */
  if (respuesta.status < 200 || respuesta.status >= 300) {
    throw new Error(
      `Supabase Storage rechazó la subida (${String(respuesta.status)}).`,
    );
  }

  return carga.urlPublica;
}
