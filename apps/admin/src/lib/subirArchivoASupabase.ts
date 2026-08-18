import type { UrlDeCarga } from '@foodhub/shared';

/**
 * Segundo paso de cualquier subida a Supabase Storage desde el panel: el
 * archivo viaja del navegador directo al bucket contra una URL ya firmada
 * (primer paso, específico de cada endpoint — ver `api/almacenamiento.ts`).
 *
 * Mismo patrón que `subirFotoDePerfil` en la app móvil. Se extrae acá porque
 * lo usan tanto la imagen de categoría (US-CFG-01) como el logo de la
 * plataforma (US-CFG-03): son la misma mecánica de subida sobre dos
 * contratos de firma distintos.
 */
const CLAVE_ANONIMA = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Un año de caché: el nombre del archivo lleva la marca de tiempo, así que nunca hay una versión vieja que invalidar. */
const CACHE_SEGUNDOS = 31_536_000;

export async function subirArchivoASupabase(
  archivo: File,
  carga: UrlDeCarga,
): Promise<string> {
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
