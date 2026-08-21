import { solicitarUrlDeCargaDeFotoPerfil } from '../api/almacenamiento';
import type { FotoElegida } from '../components/ui/SelectorDeFoto';
import { subirArchivoFirmado } from './storage';

/**
 * Sube la foto de perfil a Supabase Storage y devuelve su URL definitiva.
 *
 * La API firma la URL contra el id de la sesión y el archivo viaja del teléfono
 * directo al bucket; el detalle de esa transferencia vive en `storage.ts`, que
 * comparten los tres flujos de subida de la app.
 *
 * `token` solo lo usa el registro, que sube la foto antes de abrir la sesión en
 * la app (ver `useRegistro`). Desde "Mi perfil" se omite y vale la sesión real.
 */
export async function subirFotoDePerfil(
  foto: FotoElegida,
  token?: string,
): Promise<string> {
  const carga = await solicitarUrlDeCargaDeFotoPerfil(
    { mimeType: foto.mimeType, tamano: foto.tamano },
    token,
  );

  return subirArchivoFirmado({
    uri: foto.uri,
    mimeType: foto.mimeType,
    carga,
  });
}
