import { File } from 'expo-file-system';
import { solicitarUrlDeCargaDeFotoPlato } from '../api/almacenamiento';
import type { FotoElegida } from '../components/ui/SelectorDeFoto';
import { CLAVE_ANONIMA } from './supabase';

/**
 * Sube la foto de un plato a Supabase Storage y devuelve su URL definitiva.
 *
 * Calco de `subirFotoDePerfil.ts` -mismo mecanismo de dos pasos, mismos
 * encabezados del PUT- contra el bucket de publicaciones. A diferencia de
 * aquel, no acepta un `token` explícito: la foto de un plato solo se sube con
 * el cocinero ya autenticado en la app (no hay, como en el registro, un tramo
 * previo a la sesión).
 */

/**
 * Un año de caché. El nombre del archivo lleva la marca de tiempo de la
 * subida, así que la URL cambia cada vez que se reemplaza la foto: nunca hay
 * una versión vieja que invalidar y cachear agresivamente es gratis.
 */
const CACHE_SEGUNDOS = 31_536_000;

export async function subirFotoDePlato(foto: FotoElegida): Promise<string> {
  const carga = await solicitarUrlDeCargaDeFotoPlato({
    mimeType: foto.mimeType,
    tamano: foto.tamano,
  });

  /**
   * `File.upload` transfiere el archivo desde el módulo nativo sin leerlo a
   * memoria. Con `arrayBuffer()` los 5 MB que admite el criterio de aceptación
   * pasarían enteros por el heap de JavaScript, que en un teléfono de gama baja
   * es justo lo que dispara el cierre por falta de memoria.
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
   * subida rechazada se guardaría como exitosa y la publicación quedaría
   * apuntando a un objeto que no existe.
   */
  if (respuesta.status < 200 || respuesta.status >= 300) {
    throw new Error(
      `Supabase Storage rechazó la subida (${String(respuesta.status)}).`,
    );
  }

  return carga.urlPublica;
}
