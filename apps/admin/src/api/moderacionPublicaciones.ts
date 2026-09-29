import {
  PUBLICACIONES_ADMIN_POR_PAGINA,
  type DetallePublicacionAdmin,
  type EstadoPublicacion,
  type PaginaPublicacionesAdmin,
} from '@foodhub/shared';
import { api } from '../lib/api.js';

/**
 * Superficie de `/moderacion/publicaciones` — US-ADM-04, pestaña
 * "Publicaciones" de PAN-ADM-02.
 *
 * Igual que `api/usuarios.ts`: traduce filtros a query string y no decide
 * nada. Qué se puede eliminar y cómo queda trazado lo resuelve el servidor.
 */

export interface FiltrosListado {
  busqueda: string;
  categoriaId: string | null;
  estadoPublicacion: EstadoPublicacion | null;
  pagina: number;
  porPagina: number;
}

export const FILTROS_INICIALES: FiltrosListado = {
  busqueda: '',
  categoriaId: null,
  estadoPublicacion: null,
  pagina: 1,
  porPagina: PUBLICACIONES_ADMIN_POR_PAGINA,
};

export function hayFiltrosAplicados(filtros: FiltrosListado): boolean {
  return (
    filtros.busqueda.trim() !== '' ||
    filtros.categoriaId !== null ||
    filtros.estadoPublicacion !== null
  );
}

/** Prefijo común: la baja invalida el listado en todas sus combinaciones. */
export const CLAVE_PUBLICACIONES_ADMIN = [
  'moderacion',
  'publicaciones',
] as const;

export function claveListadoPublicaciones(filtros: FiltrosListado) {
  return [...CLAVE_PUBLICACIONES_ADMIN, filtros] as const;
}

export function listarPublicaciones(
  filtros: FiltrosListado,
): Promise<PaginaPublicacionesAdmin> {
  return api.obtener<PaginaPublicacionesAdmin>('/moderacion/publicaciones', {
    busqueda: filtros.busqueda.trim() || undefined,
    categoriaId: filtros.categoriaId,
    estadoPublicacion: filtros.estadoPublicacion,
    pagina: filtros.pagina,
    porPagina: filtros.porPagina,
  });
}

export function obtenerPublicacion(
  id: string,
): Promise<DetallePublicacionAdmin> {
  return api.obtener<DetallePublicacionAdmin>(
    `/moderacion/publicaciones/${id}`,
  );
}

/** US-ADM-04 · Baja por moderación, con el motivo obligatorio en el cuerpo. */
export function eliminarPublicacion(entrada: {
  id: string;
  motivo: string;
}): Promise<void> {
  return api.eliminar<void>(`/moderacion/publicaciones/${entrada.id}`, {
    motivo: entrada.motivo,
  });
}
