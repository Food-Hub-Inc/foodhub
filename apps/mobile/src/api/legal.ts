import type {
  DocumentoLegalVigente,
  InformacionDeContacto,
  TipoVersionTerminos,
} from '@foodhub/shared';
import { api } from '../lib/api';

/**
 * Informacion legal y datos de contacto — US-AYU-04 (PAN-AYU-04).
 *
 * Capa HTTP: este archivo solo sabe hablar con la API. La cache, los
 * estados de carga y la apertura del dialogo de "compartir" viven en
 * `useLegal.ts` (React Query + expo-sharing).
 */

/**
 * Trae un documento legal vigente (terminos o privacidad) para la pantalla
 * que el usuario abrio desde el sub-hub de Informacion legal.
 */
export function obtenerDocumentoLegal(
  tipo: TipoVersionTerminos,
): Promise<DocumentoLegalVigente> {
  return api.obtener<DocumentoLegalVigente>(
    `/catalogo/terminos-vigentes/${encodeURIComponent(tipo)}`,
  );
}

/**
 * Trae correo y horario de atencion del equipo de soporte para "Contacto
 * del soporte".
 */
export function obtenerInformacionDeContacto(): Promise<InformacionDeContacto> {
  return api.obtener<InformacionDeContacto>(
    '/catalogo/informacion-de-contacto',
  );
}

/**
 * Descarga el PDF del documento legal vigente al cache del dispositivo y
 * devuelve la URI local. El nombre de archivo viene del header
 * `Content-Disposition` que la API setea, pero como `DownloadTask` lo
 * resuelve solo, aca le pasamos uno razonable y devolvemos la URI final
 * para que el caller la pase a `Share.shareAsync` o al visor del sistema.
 */
export async function descargarPdfLegal(
  tipo: TipoVersionTerminos,
): Promise<string> {
  const prefijo = tipo === 'TERMINOS' ? 'terminos' : 'privacidad';
  const nombre = `${prefijo}-foodhub.pdf`;
  return api.descargarBinario(
    `/catalogo/terminos-vigentes/${encodeURIComponent(tipo)}/pdf`,
    nombre,
  );
}
