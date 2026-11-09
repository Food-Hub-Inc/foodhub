import type { FormatoImagenPerfil } from '@foodhub/shared';
import { solicitarUrlDeCargaDeImagenAyuda } from '../api/almacenamiento.js';
import { subirArchivoASupabase } from './subirArchivoASupabase.js';

/**
 * US-AYU-05 - Sube una imagen ilustrativa del manual a Supabase Storage.
 *
 * Mismo flujo que la imagen de categoría: la API firma una URL acotada y el
 * archivo viaja del navegador directo al bucket, sin pasar por la API.
 */
export async function subirImagenAyuda(archivo: File): Promise<string> {
  const carga = await solicitarUrlDeCargaDeImagenAyuda({
    mimeType: archivo.type as FormatoImagenPerfil,
    tamano: archivo.size,
  });

  return subirArchivoASupabase(archivo, carga);
}
