import { z } from 'zod';

/**
 * Contrato de lectura de Categoria.
 *
 * Categoria es una tabla de referencia del Modulo de configuracion y
 * parametros (alcance 2.2.2.2.3): el administrador la da de alta o baja desde
 * el panel, por eso es una tabla y no un ENUM (ver el criterio de traduccion
 * documentado en `packages/db/src/schema/enums.ts`). Este schema es la
 * proyeccion de solo lectura que necesita el modulo de Publicaciones para
 * poblar el desplegable de categoria del formulario de plato (US-PUB-01) y
 * para resolver la imagen predeterminada cuando la publicacion no tiene foto
 * propia (US-PUB-02, "Quitar imagen").
 *
 * El ABM de categorias en si (alta, edicion, baja desde el panel) es otro
 * modulo y no forma parte de este contrato.
 *
 * Se llama "Resumen" y no "Listado" para no colisionar con
 * `categoriaListadoSchema` de `categoria.schema.ts`: esa es la fila completa
 * del listado de PAN-ADM-04 (con `activo`, `publicacionesActivas`, etc.), un
 * contrato distinto del panel de administracion que esta proyeccion minima no
 * reemplaza.
 */
export const categoriaResumenSchema = z.object({
  id: z.uuid(),
  nombre: z.string(),
  imagenPredeterminadaUrl: z.url().nullable(),
});

export type CategoriaResumen = z.infer<typeof categoriaResumenSchema>;
