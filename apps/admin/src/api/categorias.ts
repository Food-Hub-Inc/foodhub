import type {
  CategoriaListado,
  CrearCategoriaInput,
  EditarCategoriaInput,
  EstadoHabilitacionCategoria,
  PaginaCategorias,
} from '@foodhub/shared';
import { api } from '../lib/api.js';

/**
 * Superficie de `/configuracion/categorias` para el panel — US-CFG-01,
 * pantalla PAN-ADM-04.
 *
 * Igual que `api/usuarios.ts`: este módulo solo traduce filtros y datos, no
 * decide nada. La unicidad del nombre y el bloqueo por publicaciones
 * asociadas los aplica el servidor.
 */

export interface FiltrosListado {
  busqueda: string;
  estado: EstadoHabilitacionCategoria | null;
  pagina: number;
  porPagina: number;
}

export const FILTROS_INICIALES: FiltrosListado = {
  busqueda: '',
  estado: null,
  pagina: 1,
  porPagina: 20,
};

export function hayFiltrosAplicados(filtros: FiltrosListado): boolean {
  return filtros.busqueda.trim() !== '' || filtros.estado !== null;
}

export function claveListadoCategorias(filtros: FiltrosListado) {
  return ['categorias', filtros] as const;
}

export function listarCategorias(
  filtros: FiltrosListado,
): Promise<PaginaCategorias> {
  return api.obtener<PaginaCategorias>('/configuracion/categorias', {
    busqueda: filtros.busqueda.trim() || undefined,
    estado: filtros.estado,
    pagina: filtros.pagina,
    porPagina: filtros.porPagina,
  });
}

export function crearCategoria(
  datos: CrearCategoriaInput,
): Promise<CategoriaListado> {
  return api.enviar<CategoriaListado>('/configuracion/categorias', datos);
}

export function editarCategoria(
  id: string,
  datos: EditarCategoriaInput,
): Promise<CategoriaListado> {
  return api.modificar<CategoriaListado>(
    `/configuracion/categorias/${id}`,
    datos,
  );
}

export function habilitarCategoria(id: string): Promise<{ mensaje: string }> {
  return api.enviar<{ mensaje: string }>(
    `/configuracion/categorias/${id}/habilitacion`,
  );
}

export function deshabilitarCategoria(
  id: string,
): Promise<{ mensaje: string }> {
  return api.eliminar<{ mensaje: string }>(
    `/configuracion/categorias/${id}/habilitacion`,
  );
}

/**
 * Eliminación física. El servidor la bloquea con 409 si la categoría tiene
 * publicaciones (activas o eliminadas) asociadas.
 */
export function eliminarCategoria(id: string): Promise<{ mensaje: string }> {
  return api.eliminar<{ mensaje: string }>(`/configuracion/categorias/${id}`);
}
