import {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  sql,
  type SQL,
} from 'drizzle-orm';
import { categoria, itemPedido, pedido, publicacion } from '@foodhub/db';
import {
  PUBLICACIONES_POR_PAGINA,
  type EstadoPublicacion,
  type FiltrosPublicacion,
  type OrdenPublicacion,
  type PaginaPublicaciones,
  type PublicacionDetalle,
  type PublicacionListado,
} from '@foodhub/shared';
import { db } from '../../lib/db.js';
import { noEncontrado } from '../../middleware/error.middleware.js';

/**
 * Modulo de Publicaciones (US-PUB-01 a US-PUB-05).
 *
 * US-PUB-05 crea este archivo desde cero: el listado y el detalle de "Mis
 * publicaciones". Las historias siguientes (crear, editar, disponibilidad,
 * eliminar) agregan sus propias funciones aca, sin tocar lo que ya queda
 * probado en esta.
 */

// ---------------------------------------------------------------------------
// Filtro compartido del listado propio (US-PUB-05)
// ---------------------------------------------------------------------------

/**
 * Filtros combinables de "Mis publicaciones": busqueda por nombre (insensible
 * a mayusculas/minusculas via `ilike`), categoria y estado (multi-seleccion) y
 * rango de precio. SIEMPRE incluye `cocineroId` y `activo = true`: un cocinero
 * jamas ve publicaciones ajenas ni las que dio de baja el mismo (US-PUB-03).
 *
 * `and(...)` tipa su retorno como `SQL | undefined` porque la firma no le
 * garantiza al compilador que reciba al menos una condicion. Las dos primeras
 * de esta lista son incondicionales, asi que en los hechos nunca es
 * `undefined`; la asercion de tipo lo deja explicito.
 */
export function armarFiltroPublicaciones(
  cocineroId: string,
  filtros: FiltrosPublicacion,
): SQL {
  const condiciones: SQL[] = [
    eq(publicacion.cocineroId, cocineroId),
    eq(publicacion.activo, true),
  ];

  if (filtros.busqueda) {
    const patron = `%${filtros.busqueda.replaceAll('%', '\\%').replaceAll('_', '\\_')}%`;
    condiciones.push(ilike(publicacion.nombre, patron));
  }
  if (filtros.categoriaIds && filtros.categoriaIds.length > 0) {
    condiciones.push(inArray(publicacion.categoriaId, filtros.categoriaIds));
  }
  if (filtros.estados && filtros.estados.length > 0) {
    condiciones.push(inArray(publicacion.estadoPublicacion, filtros.estados));
  }
  if (filtros.precioMinimo !== undefined) {
    condiciones.push(gte(publicacion.precio, String(filtros.precioMinimo)));
  }
  if (filtros.precioMaximo !== undefined) {
    condiciones.push(lte(publicacion.precio, String(filtros.precioMaximo)));
  }

  return and(...condiciones)!;
}

// ---------------------------------------------------------------------------
// Cantidad de pedidos recibidos (Decision 2 del plan del modulo)
// ---------------------------------------------------------------------------

/**
 * Subconsulta que cuenta, por publicacion, los pedidos COMPLETADOS que la
 * incluyeron. Cuenta unicamente `estadoPedidoActual = 'COMPLETADO'`: un pedido
 * "Creado" o "Rechazado" nunca se concreto, y contarlo infla la cifra que el
 * cocinero usa para evaluar que tan bien vende cada plato (Decision 2 del plan
 * del modulo).
 *
 * Se agrupa por `publicacionId` DENTRO de la subconsulta, antes del LEFT JOIN
 * con `publicacion` en el llamador: asi el join nunca duplica una fila de
 * publicacion, sin importar cuantos pedidos completados tenga.
 */
function subconsultaCantidadPedidos() {
  const pedidosPorPublicacion = db
    .select({
      publicacionId: itemPedido.publicacionId,
      cantidad: countDistinct(itemPedido.pedidoId).as('cantidad_pedidos'),
    })
    .from(itemPedido)
    .innerJoin(pedido, eq(pedido.id, itemPedido.pedidoId))
    .where(eq(pedido.estadoPedidoActual, 'COMPLETADO'))
    .groupBy(itemPedido.publicacionId)
    .as('pedidos_por_publicacion');

  return {
    tabla: pedidosPorPublicacion,
    // LEFT JOIN: una publicacion sin pedidos completados no tiene fila en la
    // subconsulta, y sin el coalesce esa ausencia se leeria como null en vez
    // de 0. `.mapWith(Number)` evita que el bigint de `count` vuelva como
    // string (mismo motivo por el que `count()` de drizzle lo hace internamente).
    cantidad:
      sql<number>`coalesce(${pedidosPorPublicacion.cantidad}, 0)`.mapWith(
        Number,
      ),
  };
}

// ---------------------------------------------------------------------------
// Orden del listado (US-PUB-05, desplegable "Ordenar por")
// ---------------------------------------------------------------------------

/**
 * `cantidadPedidos` para el caso "Mas pedidos" es la columna derivada del LEFT
 * JOIN de `subconsultaCantidadPedidos`, no una columna propia de
 * `publicacion`: es la parte mas delicada del listado (ver el plan del modulo).
 */
function ordenarPor(
  orden: OrdenPublicacion,
  cantidadPedidos: SQL<number>,
): SQL[] {
  switch (orden) {
    case 'NOMBRE':
      return [asc(publicacion.nombre)];
    case 'PRECIO_ASC':
      return [asc(publicacion.precio)];
    case 'PRECIO_DESC':
      return [desc(publicacion.precio)];
    case 'MAS_PEDIDOS':
      return [desc(cantidadPedidos)];
    case 'RECIENTES':
      return [desc(publicacion.fechaCreacion)];
  }
}

// ---------------------------------------------------------------------------
// Filas -> contrato publico
// ---------------------------------------------------------------------------

interface FilaListado {
  id: string;
  nombre: string;
  precio: string;
  imagenUrl: string | null;
  estadoPublicacion: EstadoPublicacion;
  fechaCreacion: Date;
  categoriaId: string;
  categoriaNombre: string;
  categoriaImagenPredeterminadaUrl: string | null;
  cantidadPedidos: number;
}

interface FilaDetalle extends FilaListado {
  descripcion: string | null;
  tiempoEstimadoPreparacion: number | null;
  fechaUltimaEdicion: Date | null;
}

function aPublicacionListado(fila: FilaListado): PublicacionListado {
  return {
    id: fila.id,
    nombre: fila.nombre,
    precio: fila.precio,
    imagenUrl: fila.imagenUrl,
    estadoPublicacion: fila.estadoPublicacion,
    categoria: {
      id: fila.categoriaId,
      nombre: fila.categoriaNombre,
      imagenPredeterminadaUrl: fila.categoriaImagenPredeterminadaUrl,
    },
    cantidadPedidos: fila.cantidadPedidos,
    // Siempre null: ver el comentario de `publicacionListadoSchema` en
    // packages/shared (defecto de diseno del modelo de datos, fuera de
    // alcance del modulo de Publicaciones).
    valoracionPromedio: null,
    fechaCreacion: fila.fechaCreacion.toISOString(),
  };
}

function aPublicacionDetalle(fila: FilaDetalle): PublicacionDetalle {
  return {
    ...aPublicacionListado(fila),
    // `descripcion` es NOT NULL a nivel de negocio (US-PUB-01 la exige
    // obligatoria en el alta), aunque la columna de `publicacion` en si no
    // lleve esa restriccion. El fallback no deberia ejercitarse con datos
    // creados por la propia API.
    descripcion: fila.descripcion ?? '',
    tiempoEstimadoPreparacion: fila.tiempoEstimadoPreparacion,
    fechaUltimaEdicion: fila.fechaUltimaEdicion
      ? fila.fechaUltimaEdicion.toISOString()
      : null,
  };
}

// ---------------------------------------------------------------------------
// Listado y detalle (US-PUB-05)
// ---------------------------------------------------------------------------

const columnasComunes = {
  id: publicacion.id,
  nombre: publicacion.nombre,
  precio: publicacion.precio,
  imagenUrl: publicacion.imagenUrl,
  estadoPublicacion: publicacion.estadoPublicacion,
  fechaCreacion: publicacion.fechaCreacion,
  categoriaId: categoria.id,
  categoriaNombre: categoria.nombre,
  categoriaImagenPredeterminadaUrl: categoria.imagenPredeterminadaUrl,
};

/** US-PUB-05 - Listado paginado y filtrado de "Mis publicaciones". */
export async function listarPublicacionesPropias(
  cocineroId: string,
  filtros: FiltrosPublicacion,
): Promise<PaginaPublicaciones> {
  const filtro = armarFiltroPublicaciones(cocineroId, filtros);
  const { tabla: pedidosPorPublicacion, cantidad: cantidadPedidos } =
    subconsultaCantidadPedidos();

  const [filas, [totalizador]] = await Promise.all([
    db
      .select({ ...columnasComunes, cantidadPedidos })
      .from(publicacion)
      .innerJoin(categoria, eq(categoria.id, publicacion.categoriaId))
      .leftJoin(
        pedidosPorPublicacion,
        eq(pedidosPorPublicacion.publicacionId, publicacion.id),
      )
      .where(filtro)
      .orderBy(...ordenarPor(filtros.orden, cantidadPedidos))
      .limit(PUBLICACIONES_POR_PAGINA)
      .offset((filtros.pagina - 1) * PUBLICACIONES_POR_PAGINA),
    db.select({ total: count() }).from(publicacion).where(filtro),
  ]);

  return {
    datos: filas.map(aPublicacionListado),
    total: totalizador?.total ?? 0,
    pagina: filtros.pagina,
    porPagina: PUBLICACIONES_POR_PAGINA,
  };
}

/**
 * US-PUB-05 - Detalle de una publicacion propia.
 *
 * 404 si no existe O si es de otro cocinero: nunca 403. Un 403 le confirmaria
 * a quien pregunta que el id pertenece a una publicacion real de otro
 * cocinero; el 404 no distingue los dos casos y no revela nada.
 */
export async function obtenerPublicacionPropia(
  cocineroId: string,
  publicacionId: string,
): Promise<PublicacionDetalle> {
  const { tabla: pedidosPorPublicacion, cantidad: cantidadPedidos } =
    subconsultaCantidadPedidos();

  const [fila] = await db
    .select({
      ...columnasComunes,
      descripcion: publicacion.descripcion,
      tiempoEstimadoPreparacion: publicacion.tiempoEstimadoPreparacion,
      fechaUltimaEdicion: publicacion.fechaUltimaEdicion,
      cantidadPedidos,
    })
    .from(publicacion)
    .innerJoin(categoria, eq(categoria.id, publicacion.categoriaId))
    .leftJoin(
      pedidosPorPublicacion,
      eq(pedidosPorPublicacion.publicacionId, publicacion.id),
    )
    .where(
      and(
        eq(publicacion.id, publicacionId),
        eq(publicacion.cocineroId, cocineroId),
        eq(publicacion.activo, true),
      ),
    )
    .limit(1);

  if (!fila) throw noEncontrado('la publicación');
  return aPublicacionDetalle(fila);
}
