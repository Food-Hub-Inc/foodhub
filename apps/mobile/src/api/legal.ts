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
 * estados de carga y el guardado del PDF en la carpeta Descargas viven en
 * `useLegal.ts` (React Query + expo-downloads).
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
 * Nombre con el que se guarda el documento en Descargas. Vive aca (y no en
 * `useLegal.ts`) para que la descarga a cache y el guardado posterior usen el
 * mismo nombre.
 */
export function nombreDeDocumentoLegal(tipo: TipoVersionTerminos): string {
  const prefijo = tipo === 'TERMINOS' ? 'terminos' : 'privacidad';
  return `${prefijo}-foodhub.pdf`;
}

/**
 * Descarga el PDF del documento legal vigente al cache del dispositivo y
 * devuelve la URI local. El guardado en la carpeta Descargas y la apertura
 * del visor viven en `useLegal.ts`.
 */
export async function descargarPdfLegal(
  tipo: TipoVersionTerminos,
): Promise<string> {
  return api.descargarBinario(
    `/catalogo/terminos-vigentes/${encodeURIComponent(tipo)}/pdf`,
    nombreDeDocumentoLegal(tipo),
  );
}
