import { asc, eq } from 'drizzle-orm';
import { categoria } from '@foodhub/db';
import type { CategoriaListado } from '@foodhub/shared';
import { db } from '../../lib/db.js';

/**
 * Lectura de tablas de referencia que Publicaciones consume.
 *
 * Categoria es una entidad administrable del Modulo de configuracion y
 * parametros (alcance 2.2.2.2.3): el ABM completo es otro modulo, y este
 * servicio solo expone la proyeccion de solo lectura que necesita el
 * desplegable de categoria del formulario de plato (US-PUB-01).
 */

/**
 * US-PUB-01 - Categorias activas, para el desplegable del formulario.
 *
 * Sin paginacion: es una tabla de referencia chica (el administrador la
 * gestiona a mano desde el panel), no un listado de negocio que crezca sin
 * límite como `publicacion` o `pedido`.
 */
export async function listarCategoriasActivas(): Promise<CategoriaListado[]> {
  return db
    .select({
      id: categoria.id,
      nombre: categoria.nombre,
      imagenPredeterminadaUrl: categoria.imagenPredeterminadaUrl,
    })
    .from(categoria)
    .where(eq(categoria.activo, true))
    .orderBy(asc(categoria.nombre));
}
