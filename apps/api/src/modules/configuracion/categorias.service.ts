import { and, count, desc, eq, ilike, inArray, type SQL } from 'drizzle-orm';
import { categoria, publicacion } from '@foodhub/db';
import {
  MENSAJES_CONFIGURACION,
  type CategoriaListado,
  type CrearCategoriaInput,
  type EditarCategoriaInput,
  type FiltrosCategoria,
  type PaginaCategorias,
} from '@foodhub/shared';
import { db } from '../../lib/db.js';
import { tieneCodigoSql } from '../../lib/errores-postgres.js';
import { AppError, noEncontrado } from '../../middleware/error.middleware.js';
import { registrarOperacion } from '../auditoria/auditoria.service.js';

/**
 * Modulo de Configuracion y parametros — categorias de platos (US-CFG-01,
 * RF054, PAN-ADM-04).
 *
 * `23505` (unique_violation) se dispara al chocar con
 * `categoria_nombre_activo_uq`. `23503` (foreign_key_violation) se dispara al
 * intentar `DELETE` una categoria que una publicacion todavia referencia,
 * porque `publicacion.categoria_id` tiene `onDelete: 'restrict'`. Se
 * reutiliza esa restriccion de la base en lugar de repetir la regla con un
 * `select exists` propio: la base ya la garantiza sin ventana de carrera.
 */

type FilaCategoria = typeof categoria.$inferSelect;

function aCategoriaListado(
  fila: FilaCategoria,
  publicacionesActivas: number,
): CategoriaListado {
  return {
    id: fila.id,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    imagenPredeterminadaUrl: fila.imagenPredeterminadaUrl,
    activo: fila.activo,
    publicacionesActivas,
    fechaCreacion: fila.fechaCreacion.toISOString(),
  };
}

async function contarPublicacionesActivas(
  categoriaId: string,
): Promise<number> {
  const [fila] = await db
    .select({ total: count() })
    .from(publicacion)
    .where(
      and(
        eq(publicacion.categoriaId, categoriaId),
        eq(publicacion.activo, true),
      ),
    );
  return fila?.total ?? 0;
}

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------

/** US-CFG-01 - Busqueda por nombre y filtro por estado de habilitacion. */
function armarFiltroCategorias(filtros: FiltrosCategoria): SQL | undefined {
  const condiciones: SQL[] = [];

  if (filtros.busqueda) {
    const patron = `%${filtros.busqueda.replaceAll('%', '\\%').replaceAll('_', '\\_')}%`;
    condiciones.push(ilike(categoria.nombre, patron));
  }
  if (filtros.estado) {
    condiciones.push(eq(categoria.activo, filtros.estado === 'HABILITADA'));
  }

  return condiciones.length > 0 ? and(...condiciones) : undefined;
}

/**
 * US-CFG-01 - Listado paginado del panel, con la cantidad de publicaciones
 * activas de cada categoria en una unica consulta agrupada (evita N+1).
 */
export async function listarCategorias(
  filtros: FiltrosCategoria,
): Promise<PaginaCategorias> {
  const filtro = armarFiltroCategorias(filtros);

  const [filas, [totalizador]] = await Promise.all([
    db
      .select()
      .from(categoria)
      .where(filtro)
      .orderBy(desc(categoria.fechaCreacion))
      .limit(filtros.porPagina)
      .offset((filtros.pagina - 1) * filtros.porPagina),
    db.select({ total: count() }).from(categoria).where(filtro),
  ]);

  const ids = filas.map((fila) => fila.id);
  const conteos = ids.length
    ? await db
        .select({ categoriaId: publicacion.categoriaId, total: count() })
        .from(publicacion)
        .where(
          and(
            inArray(publicacion.categoriaId, ids),
            eq(publicacion.activo, true),
          ),
        )
        .groupBy(publicacion.categoriaId)
    : [];
  const mapaConteos = new Map(conteos.map((c) => [c.categoriaId, c.total]));

  return {
    datos: filas.map((fila) =>
      aCategoriaListado(fila, mapaConteos.get(fila.id) ?? 0),
    ),
    total: totalizador?.total ?? 0,
    pagina: filtros.pagina,
    porPagina: filtros.porPagina,
  };
}

// ---------------------------------------------------------------------------
// Escritura
// ---------------------------------------------------------------------------

/** US-CFG-01 - Alta de categoria. */
export async function crearCategoria(entrada: {
  datos: CrearCategoriaInput;
  administradorId: string;
  ipOrigen: string | null;
}): Promise<CategoriaListado> {
  let fila: FilaCategoria;
  try {
    const [insertada] = await db
      .insert(categoria)
      .values({
        nombre: entrada.datos.nombre,
        descripcion: entrada.datos.descripcion ?? null,
        imagenPredeterminadaUrl: entrada.datos.imagenPredeterminadaUrl ?? null,
      })
      .returning();
    if (!insertada) throw new Error('el alta de categoría no devolvió fila.');
    fila = insertada;
  } catch (error) {
    if (tieneCodigoSql(error, '23505')) {
      throw new AppError(
        409,
        MENSAJES_CONFIGURACION.nombreCategoriaDuplicado,
        'NOMBRE_DUPLICADO',
      );
    }
    throw error;
  }

  void registrarOperacion({
    usuarioId: entrada.administradorId,
    operacion: 'ALTA',
    tipoObjeto: 'categoria',
    objetoAfectadoId: fila.id,
    ipOrigen: entrada.ipOrigen,
    datosAdicionales: { nombre: fila.nombre },
  });

  return aCategoriaListado(fila, 0);
}

/** US-CFG-01 - Edicion parcial de nombre, descripcion e imagen. */
export async function editarCategoria(entrada: {
  categoriaId: string;
  datos: EditarCategoriaInput;
  administradorId: string;
  ipOrigen: string | null;
}): Promise<CategoriaListado> {
  const { categoriaId, datos } = entrada;

  let fila: FilaCategoria;
  try {
    const [actualizada] = await db
      .update(categoria)
      .set(datos)
      .where(eq(categoria.id, categoriaId))
      .returning();
    if (!actualizada) throw noEncontrado('la categoría');
    fila = actualizada;
  } catch (error) {
    if (tieneCodigoSql(error, '23505')) {
      throw new AppError(
        409,
        MENSAJES_CONFIGURACION.nombreCategoriaDuplicado,
        'NOMBRE_DUPLICADO',
      );
    }
    throw error;
  }

  void registrarOperacion({
    usuarioId: entrada.administradorId,
    operacion: 'MODIFICACION',
    tipoObjeto: 'categoria',
    objetoAfectadoId: categoriaId,
    ipOrigen: entrada.ipOrigen,
    datosAdicionales: { campos: Object.keys(datos), ...datos },
  });

  const publicacionesActivas = await contarPublicacionesActivas(categoriaId);
  return aCategoriaListado(fila, publicacionesActivas);
}

/**
 * US-CFG-01 - Habilitar o deshabilitar (baja logica). Deshabilitar exige
 * confirmacion en la UI; habilitar no, pero el servicio es el mismo: la
 * distincion es enteramente del cliente.
 */
export async function establecerHabilitacionCategoria(entrada: {
  categoriaId: string;
  activo: boolean;
  administradorId: string;
  ipOrigen: string | null;
}): Promise<void> {
  const [fila] = await db
    .update(categoria)
    .set({ activo: entrada.activo })
    .where(eq(categoria.id, entrada.categoriaId))
    .returning();
  if (!fila) throw noEncontrado('la categoría');

  void registrarOperacion({
    usuarioId: entrada.administradorId,
    operacion: 'MODIFICACION',
    tipoObjeto: 'categoria',
    objetoAfectadoId: entrada.categoriaId,
    ipOrigen: entrada.ipOrigen,
    datosAdicionales: { activo: entrada.activo },
  });
}

/**
 * US-CFG-01 - Eliminacion fisica. Bloqueada por la base con
 * `foreign_key_violation` si hay una publicacion (activa o eliminada) que
 * todavia referencia la categoria: `publicacion.categoria_id` tiene
 * `onDelete: 'restrict'`.
 */
export async function eliminarCategoria(entrada: {
  categoriaId: string;
  administradorId: string;
  ipOrigen: string | null;
}): Promise<void> {
  try {
    const [fila] = await db
      .delete(categoria)
      .where(eq(categoria.id, entrada.categoriaId))
      .returning();
    if (!fila) throw noEncontrado('la categoría');
  } catch (error) {
    if (tieneCodigoSql(error, '23503')) {
      throw new AppError(
        409,
        MENSAJES_CONFIGURACION.categoriaConPublicacionesAsociadas,
        'CATEGORIA_CON_PUBLICACIONES',
      );
    }
    throw error;
  }

  void registrarOperacion({
    usuarioId: entrada.administradorId,
    operacion: 'BAJA',
    tipoObjeto: 'categoria',
    objetoAfectadoId: entrada.categoriaId,
    ipOrigen: entrada.ipOrigen,
    datosAdicionales: { tipo: 'eliminación física' },
  });
}
