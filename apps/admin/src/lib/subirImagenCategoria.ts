import type { FormatoImagenPerfil } from '@foodhub/shared';
import {
  solicitarUrlDeCargaDeImagenCategoria,
  solicitarUrlDeCargaDeImagenCategoriaExistente,
} from '../api/almacenamiento.js';
import { subirArchivoASupabase } from './subirArchivoASupabase.js';

/** Sube la imagen representativa de una categoría a Supabase Storage — US-CFG-01. */
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

  return subirArchivoASupabase(archivo, carga);
}
