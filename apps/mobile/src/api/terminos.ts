import type { TerminosVigentesParaAceptar } from '@foodhub/shared';
import { api } from '../lib/api';

/**
 * Términos y condiciones — lado de re-aceptación de US-CFG-04 (RF058, último
 * criterio). El resto del módulo (alta, edición, publicación, historial) es
 * exclusivo del panel de administración; acá solo vive lo que necesita
 * cualquier usuario autenticado para volver a aceptar una versión nueva.
 */

/** Versión vigente de ambos documentos, para mostrarlos en la pantalla de re-aceptación. */
export function obtenerTerminosVigentesParaAceptar(): Promise<TerminosVigentesParaAceptar> {
  return api.obtener<TerminosVigentesParaAceptar>(
    '/catalogo/terminos-vigentes',
  );
}

/** Registra la aceptación del usuario autenticado. */
export function aceptarTerminosVigentes(): Promise<void> {
  return api.enviar<void>('/usuarios/yo/aceptar-terminos');
}
