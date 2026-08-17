import type { FormatoImagenPerfil } from '@foodhub/shared';
import { solicitarUrlDeCargaDeLogoPlataforma } from '../api/almacenamiento.js';
import { subirArchivoASupabase } from './subirArchivoASupabase.js';

/** Sube el logo de la plataforma a Supabase Storage — US-CFG-03. */
export async function subirLogoPlataforma(archivo: File): Promise<string> {
  const carga = await solicitarUrlDeCargaDeLogoPlataforma({
    mimeType: archivo.type as FormatoImagenPerfil,
    tamano: archivo.size,
  });

  return subirArchivoASupabase(archivo, carga);
}
