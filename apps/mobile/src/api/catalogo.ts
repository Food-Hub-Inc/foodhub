import type { CategoriaResumen } from '@foodhub/shared';
import { api } from '../lib/api';

/**
 * Tabla de referencia de categorías — módulo de Publicaciones (US-PUB-01,
 * desplegable de categoría; US-PUB-05, filtro y resolución de la imagen
 * predeterminada del plato).
 */

/** Categorías activas, sin paginación: es una tabla chica que gestiona el administrador. */
export function listarCategorias(): Promise<CategoriaResumen[]> {
  return api.obtener<CategoriaResumen[]>('/catalogo/categorias');
}
