import type { FormatoImagenPerfil } from '@foodhub/shared';
import {
  solicitarUrlDeCargaDeImagenCategoria,
  solicitarUrlDeCargaDeImagenCategoriaExistente,
} from '../api/almacenamiento.js';

/**
 * Sube la imagen representativa de una categoría a Supabase Storage — US-CFG-01.
 *
 * MISMO PATRÓN DE DOS PASOS que `subirFotoDePerfil` en la app móvil: la API
 * firma la URL contra el bucket de configuración y el archivo viaja del
 * navegador directo al bucket, sin pasar por el servidor de Express (que
 * limita el body a 1 MB y nunca recibe binarios).
 */
const CLAVE_ANONIMA = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Un año de caché: el nombre lleva la marca de tiempo, así que nunca hay una versión vieja que invalidar. */
const CACHE_SEGUNDOS = 31_536_000;

export async function subirImagenCategoria(
  archivo: File,
  categoriaId: string | null,
): Promise<string> {
  const datos = {
    mimeType: archivo.type as FormatoImagenPerfil,
    tamano: archivo.size,
  };

  const carga = categoriaId
    ? await solicitarUrlDeCargaDeImagenCategoriaExistente(categoriaId, datos)
    : await solicitarUrlDeCargaDeImagenCategoria(datos);

  const respuesta = await fetch(carga.url, {
    method: 'PUT',
    headers: {
      apikey: CLAVE_ANONIMA,
      authorization: `Bearer ${CLAVE_ANONIMA}`,
      'content-type': archivo.type,
      'cache-control': `max-age=${String(CACHE_SEGUNDOS)}`,
    },
    body: archivo,
  });

  if (!respuesta.ok) {
    throw new Error(
      `Supabase Storage rechazó la subida (${String(respuesta.status)}).`,
    );
  }

  return carga.urlPublica;
}
