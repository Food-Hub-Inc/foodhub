import { and, count, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { categoria, publicacion, usuario } from '@foodhub/db';
import type {
  DetallePublicacionAdmin,
  FiltrosPublicacionAdmin,
  PaginaPublicacionesAdmin,
  PublicacionAdmin,
} from '@foodhub/shared';
import { db } from '../../lib/db.js';
import { noEncontrado } from '../../middleware/error.middleware.js';
import { registrarOperacion } from '../auditoria/auditoria.service.js';

/**
 * Moderación de publicaciones desde el panel — US-ADM-04, RF050 y RF051
 * (PAN-ADM-02, pestaña "Publicaciones").
 *
 * La baja del administrador es la MISMA baja lógica que la del cocinero
 * (`activo = false`), más la traza de quién la hizo y por qué. Como el feed,
 * el mapa, el detalle y el carrito ya filtran por `activo`, el contenido "sale
 * de las vistas disponibles para clientes" sin tocar ninguno de esos módulos.
 */

/** La fila del listado y del detalle, con su cocinero y su categoría. */
const columnas = {
  id: publicacion.id,
  nombre: publicacion.nombre,
  descripcion: publicacion.descripcion,
  imagenUrl: publicacion.imagenUrl,
  precio: publicacion.precio,
  estadoPublicacion: publicacion.estadoPublicacion,
  fechaCreacion: publicacion.fechaCreacion,
  categoriaId: categoria.id,
  categoriaNombre: categoria.nombre,
  categoriaImagen: categoria.imagenPredeterminadaUrl,
  cocineroId: usuario.id,
  cocineroNombre: usuario.nombre,
  cocineroApellido: usuario.apellido,
};

/**
 * `publicacion.cocinero_id` apunta a `cocinero.usuario_id`, que es el mismo
 * valor que `usuario.id`: se une directo contra `usuario`, que es donde están
 * el nombre y el apellido, sin pasar por `cocinero`.
 */
function consultaBase() {
  return db
    .select(columnas)
    .from(publicacion)
    .innerJoin(categoria, eq(categoria.id, publicacion.categoriaId))
    .innerJoin(usuario, eq(usuario.id, publicacion.cocineroId));
}

type Fila = Awaited<ReturnType<typeof consultaBase>>[number];

function aPublicacionAdmin(fila: Fila): PublicacionAdmin {
  return {
    id: fila.id,
    nombre: fila.nombre,
    imagenUrl: fila.imagenUrl,
    precio: fila.precio,
    estadoPublicacion: fila.estadoPublicacion,
    categoria: {
      id: fila.categoriaId,
      nombre: fila.categoriaNombre,
      imagenPredeterminadaUrl: fila.categoriaImagen,
    },
    cocinero: {
      id: fila.cocineroId,
      nombre: fila.cocineroNombre,
      apellido: fila.cocineroApellido,
    },
    fechaCreacion: fila.fechaCreacion.toISOString(),
  };
}

/**
 * Segundo criterio: busca por plato O por cocinero en un único campo, y
 * combina categoría y estado. Solo publicaciones vigentes: lo dado de baja ya
 * no es contenido que moderar.
 *
 * El cocinero se compara contra "nombre apellido" concatenado, así "Ana Pérez"
 * la encuentra aunque ninguna de las dos columnas tenga el texto completo.
 */
function armarFiltro(filtros: FiltrosPublicacionAdmin): SQL | undefined {
  const condiciones: SQL[] = [eq(publicacion.activo, true)];

  if (filtros.busqueda) {
    const patron = `%${filtros.busqueda.replaceAll('%', '\\%').replaceAll('_', '\\_')}%`;
    const porTexto = or(
      ilike(publicacion.nombre, patron),
      ilike(sql`${usuario.nombre} || ' ' || ${usuario.apellido}`, patron),
    );
    if (porTexto) condiciones.push(porTexto);
  }
  if (filtros.categoriaId) {
    condiciones.push(eq(publicacion.categoriaId, filtros.categoriaId));
  }
  if (filtros.estadoPublicacion) {
    condiciones.push(
      eq(publicacion.estadoPublicacion, filtros.estadoPublicacion),
    );
  }

  return and(...condiciones);
}

/** Primer y segundo criterio: listado paginado, lo más nuevo primero. */
export async function listarPublicaciones(
  filtros: FiltrosPublicacionAdmin,
): Promise<PaginaPublicacionesAdmin> {
  const filtro = armarFiltro(filtros);

  const [filas, [totalizador]] = await Promise.all([
    consultaBase()
      .where(filtro)
      // Desempate por id: sin él, dos publicaciones creadas en el mismo
      // instante (el seed lo hace) podrían repetirse entre páginas.
      .orderBy(desc(publicacion.fechaCreacion), desc(publicacion.id))
      .limit(filtros.porPagina)
      .offset((filtros.pagina - 1) * filtros.porPagina),
    db
      .select({ total: count() })
      .from(publicacion)
      .innerJoin(usuario, eq(usuario.id, publicacion.cocineroId))
      .where(filtro),
  ]);

  return {
    datos: filas.map(aPublicacionAdmin),
    total: totalizador?.total ?? 0,
    pagina: filtros.pagina,
    porPagina: filtros.porPagina,
  };
}

/** Tercer criterio: el detalle para revisar antes de decidir. */
export async function obtenerPublicacion(
  publicacionId: string,
): Promise<DetallePublicacionAdmin> {
  const [fila] = await consultaBase()
    .where(and(eq(publicacion.id, publicacionId), eq(publicacion.activo, true)))
    .limit(1);

  if (!fila) throw noEncontrado('la publicación');

  return { ...aPublicacionAdmin(fila), descripcion: fila.descripcion };
}

/**
 * Cuarto criterio: baja con motivo obligatorio, traza y auditoría.
 *
 * NO SE BLOQUEA POR PEDIDOS EN CURSO, a diferencia de la baja del propio
 * cocinero (US-PUB-03). Decisión del equipo: un plato que infringe las
 * políticas se retira igual, y los pedidos ya confirmados siguen su flujo
 * porque `item_pedido` guarda el snapshot de nombre, precio e imagen.
 *
 * El UPDATE lleva `activo = true` en el WHERE en lugar de un SELECT previo: si
 * dos administradores la eliminan a la vez, el segundo recibe 404 en lugar de
 * pisar el motivo del primero.
 */
export async function eliminarPublicacion(entrada: {
  publicacionId: string;
  adminId: string;
  motivo: string;
  ipOrigen: string | null;
}): Promise<void> {
  const { publicacionId, adminId, motivo } = entrada;

  const [eliminada] = await db
    .update(publicacion)
    .set({
      activo: false,
      motivoEliminacionAdmin: motivo,
      eliminadaPorAdminId: adminId,
    })
    .where(and(eq(publicacion.id, publicacionId), eq(publicacion.activo, true)))
    .returning({
      nombre: publicacion.nombre,
      cocineroId: publicacion.cocineroId,
    });

  if (!eliminada) throw noEncontrado('la publicación');

  void registrarOperacion({
    usuarioId: adminId,
    operacion: 'BAJA',
    tipoObjeto: 'publicacion',
    objetoAfectadoId: publicacionId,
    ipOrigen: entrada.ipOrigen,
    datosAdicionales: {
      nombre: eliminada.nombre,
      cocineroId: eliminada.cocineroId,
      motivo,
    },
  });

  // PENDIENTE US-NOT-03: acá va la notificación al cocinero propietario
  // (`emitirNotificacion` con PUBLICACION_ELIMINADA_ADMIN), que vive en
  // `feature/notificaciones` y todavía no está en develop. Va DESPUÉS de la
  // baja: si el UPDATE no afectó ninguna fila, no hay nada que avisar.
}
