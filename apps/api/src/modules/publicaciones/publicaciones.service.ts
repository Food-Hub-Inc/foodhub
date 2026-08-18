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
  MENSAJES_PUBLICACION,
  PUBLICACIONES_POR_PAGINA,
  type CrearPublicacionInput,
  type EditarPublicacionInput,
  type EstadoPedido,
  type EstadoPublicacion,
  type FiltrosPublicacion,
  type OrdenPublicacion,
  type PaginaPublicaciones,
  type PublicacionDetalle,
  type PublicacionListado,
} from '@foodhub/shared';
import { db } from '../../lib/db.js';
import {
  aValoracion,
  subconsultaValoracionPorPublicacion,
} from '../../lib/valoraciones.js';
import { AppError, noEncontrado } from '../../middleware/error.middleware.js';
import { limpiarFotoDePlatoAnterior } from '../almacenamiento/almacenamiento.service.js';

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
  /** `numeric` de PostgreSQL: llega como string, o `null` si no hay resenas. */
  valoracionPromedio: string | null;
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
    valoracionPromedio: aValoracion(fila.valoracionPromedio),
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
  const { tabla: valoracionPorPublicacion, promedio: valoracionPromedio } =
    subconsultaValoracionPorPublicacion();

  const [filas, [totalizador]] = await Promise.all([
    db
      .select({ ...columnasComunes, cantidadPedidos, valoracionPromedio })
      .from(publicacion)
      .innerJoin(categoria, eq(categoria.id, publicacion.categoriaId))
      .leftJoin(
        pedidosPorPublicacion,
        eq(pedidosPorPublicacion.publicacionId, publicacion.id),
      )
      .leftJoin(
        valoracionPorPublicacion,
        eq(valoracionPorPublicacion.publicacionId, publicacion.id),
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
  const { tabla: valoracionPorPublicacion, promedio: valoracionPromedio } =
    subconsultaValoracionPorPublicacion();

  const [fila] = await db
    .select({
      ...columnasComunes,
      descripcion: publicacion.descripcion,
      tiempoEstimadoPreparacion: publicacion.tiempoEstimadoPreparacion,
      fechaUltimaEdicion: publicacion.fechaUltimaEdicion,
      cantidadPedidos,
      valoracionPromedio,
    })
    .from(publicacion)
    .innerJoin(categoria, eq(categoria.id, publicacion.categoriaId))
    .leftJoin(
      pedidosPorPublicacion,
      eq(pedidosPorPublicacion.publicacionId, publicacion.id),
    )
    .leftJoin(
      valoracionPorPublicacion,
      eq(valoracionPorPublicacion.publicacionId, publicacion.id),
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

// ---------------------------------------------------------------------------
// Alta (US-PUB-01)
// ---------------------------------------------------------------------------

/**
 * Traduce el contrato de alta validado a las columnas del INSERT. Es una
 * funcion PURA -sin acceso a `db`- a proposito: asi la regla de negocio mas
 * importante del alta (no fija `estadoPublicacion`, los opcionales ausentes
 * quedan en `null` y no en `undefined`) se puede probar sin mockear la base,
 * con el mismo criterio que ya usa `armarFiltroPublicaciones` en este archivo.
 */
export function valoresDeAltaPublicacion(
  cocineroId: string,
  datos: CrearPublicacionInput,
): typeof publicacion.$inferInsert {
  return {
    cocineroId,
    categoriaId: datos.categoriaId,
    nombre: datos.nombre,
    descripcion: datos.descripcion,
    precio: datos.precio,
    imagenUrl: datos.imagenUrl ?? null,
    tiempoEstimadoPreparacion: datos.tiempoEstimadoPreparacion ?? null,
    // `estadoPublicacion` NO se fija aca: nace 'DISPONIBLE' por el default de
    // la columna (US-PUB-04, ultimo criterio de aceptacion) y
    // `crearPublicacionSchema` ni siquiera acepta el campo en el contrato de
    // alta (ver el comentario de ese schema en packages/shared).
  };
}

/**
 * US-PUB-01 - Alta de una publicacion.
 *
 * Sin validacion extra de categoria: la FK `publicacion.categoria_id` ya
 * restringe contra una categoria inexistente o dada de baja a nivel de base.
 *
 * Sin notificacion push a los clientes favoritos: el modulo de Notificaciones
 * (US-NOT-06) no existe todavia en la API -sin FCM, sin endpoint, sin el valor
 * de enum correspondiente-, asi que queda totalmente fuera de alcance de este
 * modulo.
 */
export async function crearPublicacion(entrada: {
  cocineroId: string;
  datos: CrearPublicacionInput;
}): Promise<PublicacionDetalle> {
  const [creada] = await db
    .insert(publicacion)
    .values(valoresDeAltaPublicacion(entrada.cocineroId, entrada.datos))
    .returning({ id: publicacion.id });

  // Un INSERT sin WHERE siempre devuelve la fila recien creada, salvo que la
  // propia sentencia ya haya lanzado (constraint, FK). Si no hay fila aca,
  // algo exploto antes de llegar a esta linea.
  if (!creada) throw new Error('No se pudo crear la publicación.');

  return obtenerPublicacionPropia(entrada.cocineroId, creada.id);
}

// ---------------------------------------------------------------------------
// Disponibilidad (US-PUB-04)
// ---------------------------------------------------------------------------

/**
 * US-PUB-04 - Cambio de disponibilidad. Endpoint propio y liviano, separado
 * de `editarPublicacion` (que agrega US-PUB-02): el criterio de aceptación
 * exige que el cambio "se aplica de forma inmediata sin necesidad de
 * confirmación adicional", así que no hay modal ni motivo para pasar por el
 * schema completo de edición.
 *
 * El `WHERE` exige `cocineroId` (y `activo`) ademas del `id`, igual que
 * `obtenerPublicacionPropia`: un cocinero jamas puede cambiar la
 * disponibilidad de una publicacion ajena, ni siquiera conociendo su id.
 * Cero filas afectadas -por ajena, inexistente o ya dada de baja- se traduce
 * en el mismo 404 que el resto del modulo, nunca en un 403: no hay que
 * confirmarle a quien pregunta que el id pertenece a un recurso real de otro
 * cocinero.
 *
 * Sin `registrarOperacion`: es un toggle de alta frecuencia que la propia
 * historia no exige trazar (a diferencia de las bajas y suspensiones del
 * panel, que si lo hacen); agregarlo seria construir algo no pedido.
 */
export async function cambiarDisponibilidad(entrada: {
  cocineroId: string;
  publicacionId: string;
  estadoPublicacion: EstadoPublicacion;
}): Promise<{ id: string; estadoPublicacion: EstadoPublicacion }> {
  const [actualizada] = await db
    .update(publicacion)
    .set({ estadoPublicacion: entrada.estadoPublicacion })
    .where(
      and(
        eq(publicacion.id, entrada.publicacionId),
        eq(publicacion.cocineroId, entrada.cocineroId),
        eq(publicacion.activo, true),
      ),
    )
    .returning({
      id: publicacion.id,
      estadoPublicacion: publicacion.estadoPublicacion,
    });

  if (!actualizada) throw noEncontrado('la publicación');
  return actualizada;
}

// ---------------------------------------------------------------------------
// Edicion (US-PUB-02)
// ---------------------------------------------------------------------------

/**
 * Traduce el contrato de edicion (parcial) a las columnas del UPDATE.
 *
 * Funcion pura -igual criterio que `valoresDeAltaPublicacion`-, asi que se
 * prueba sin mockear `db`. Cada campo se incluye SOLO si el cocinero lo
 * mando: un `undefined` explicito en `datos` significa "no tocado" y tiene
 * que desaparecer del `SET`, nunca pisar la columna. `imagenUrl` es el unico
 * campo donde `null` es un valor valido y distinto de "no tocado" (ver el
 * comentario de `imagenUrlSchema` en `packages/shared`), por eso se compara
 * contra `undefined` y no con un chequeo de verdad/falsedad.
 */
export function cambiosDeEdicion(
  datos: EditarPublicacionInput,
): Partial<typeof publicacion.$inferInsert> {
  return {
    ...(datos.nombre !== undefined ? { nombre: datos.nombre } : {}),
    ...(datos.descripcion !== undefined
      ? { descripcion: datos.descripcion }
      : {}),
    ...(datos.precio !== undefined ? { precio: datos.precio } : {}),
    ...(datos.categoriaId !== undefined
      ? { categoriaId: datos.categoriaId }
      : {}),
    ...(datos.imagenUrl !== undefined ? { imagenUrl: datos.imagenUrl } : {}),
    ...(datos.tiempoEstimadoPreparacion !== undefined
      ? { tiempoEstimadoPreparacion: datos.tiempoEstimadoPreparacion }
      : {}),
  };
}

/**
 * Decide si la edicion tiene que limpiar la foto anterior del plato en
 * Storage, y con que argumentos.
 *
 * Funcion pura -no toca `db` ni Storage- para poder probar la condicion
 * "solo cuando `imagenUrl` participo de la edicion" sin mockear la subida ni
 * el borrado. `imagenUrlEnPayload === undefined` es "el cocinero no toco la
 * imagen": ni se sube nada nuevo ni hay nada que borrar. Cualquier otro valor
 * -una URL nueva o `null` ("Quitar imagen")- exige revisar la carpeta.
 */
export function limpiezaDeImagenTrasEditar(entrada: {
  cocineroId: string;
  imagenUrlEnPayload: string | null | undefined;
  imagenUrlAnterior: string | null;
}): Parameters<typeof limpiarFotoDePlatoAnterior>[0] | null {
  if (entrada.imagenUrlEnPayload === undefined) return null;

  return {
    cocineroId: entrada.cocineroId,
    urlAnterior: entrada.imagenUrlAnterior,
    urlNueva: entrada.imagenUrlEnPayload,
  };
}

/**
 * US-PUB-02 - Edicion parcial de una publicacion propia.
 *
 * La URL anterior de la imagen SOLO se lee cuando `imagenUrl` participa de
 * esta edicion (ver `limpiezaDeImagenTrasEditar`): es el unico dato que la
 * limpieza de Storage necesita y que este UPDATE no devuelve por si solo, asi
 * que evitar la lectura en el caso comun (editar precio, nombre, etc. sin
 * tocar la foto) ahorra una consulta.
 *
 * Ownership: TODOS los `WHERE` de esta funcion exigen `cocineroId` ademas del
 * `id` -igual criterio que `obtenerPublicacionPropia` y
 * `cambiarDisponibilidad`-, asi que una publicacion ajena, inexistente o ya
 * dada de baja siempre responde 404, nunca 403 (no confirma la existencia de
 * un recurso ajeno).
 *
 * Sin `registrarOperacion`: el modulo de Publicaciones no audita sus cambios,
 * mismo criterio que ya aplica `crearPublicacion` y `cambiarDisponibilidad`.
 *
 * Sin notificacion push: US-NOT-06 no existe todavia en la API (ver el
 * comentario de `crearPublicacion`), y el propio criterio de aceptacion de
 * esta historia aclara que la edicion NO genera push a diferencia del alta.
 */
export async function editarPublicacion(entrada: {
  cocineroId: string;
  publicacionId: string;
  datos: EditarPublicacionInput;
}): Promise<PublicacionDetalle> {
  const { cocineroId, publicacionId, datos } = entrada;

  let imagenAnterior: string | null = null;
  if (datos.imagenUrl !== undefined) {
    const [previa] = await db
      .select({ imagenUrl: publicacion.imagenUrl })
      .from(publicacion)
      .where(
        and(
          eq(publicacion.id, publicacionId),
          eq(publicacion.cocineroId, cocineroId),
          eq(publicacion.activo, true),
        ),
      )
      .limit(1);

    if (!previa) throw noEncontrado('la publicación');
    imagenAnterior = previa.imagenUrl;
  }

  const [actualizada] = await db
    .update(publicacion)
    .set({ ...cambiosDeEdicion(datos), fechaUltimaEdicion: new Date() })
    .where(
      and(
        eq(publicacion.id, publicacionId),
        eq(publicacion.cocineroId, cocineroId),
        eq(publicacion.activo, true),
      ),
    )
    .returning({ id: publicacion.id });

  if (!actualizada) throw noEncontrado('la publicación');

  const limpieza = limpiezaDeImagenTrasEditar({
    cocineroId,
    imagenUrlEnPayload: datos.imagenUrl,
    imagenUrlAnterior: imagenAnterior,
  });
  if (limpieza) void limpiarFotoDePlatoAnterior(limpieza);

  return obtenerPublicacionPropia(cocineroId, publicacionId);
}

// ---------------------------------------------------------------------------
// Baja logica (US-PUB-03)
// ---------------------------------------------------------------------------

/**
 * Estados de pedido que bloquean la baja de una publicacion (US-PUB-03,
 * tercer criterio de aceptacion: "pedidos asociados en estado 'Creado',
 * 'Aceptado' o 'Listo'"). 'RECHAZADO' y 'COMPLETADO' son estados terminales
 * -el pedido ya no va a cambiar- y por eso no bloquean la baja.
 */
const ESTADOS_PEDIDO_ACTIVO: EstadoPedido[] = ['CREADO', 'ACEPTADO', 'LISTO'];

/**
 * US-PUB-03 - Baja logica de una publicacion propia.
 *
 * Nunca es un `DELETE` fisico: `publicacion.activo` pasa a `false` (ver el
 * comentario del propio schema en `packages/db/src/schema/publicaciones.ts`,
 * "un pedido historico referencia la publicacion, y perder ese dato dejaria
 * el historial del cliente mostrando platos vacios"). Por eso el
 * `onDelete: 'restrict'` que protege `item_pedido.publicacion_id` -pensado
 * para impedir un DELETE fisico de una publicacion con pedidos asociados- NO
 * se dispara nunca desde este modulo: esta funcion jamas ejecuta un DELETE
 * contra `publicacion`.
 *
 * Tres pasos, en este orden:
 *   1. Ownership + existencia: la publicacion tiene que ser del cocinero que
 *      pide la baja y seguir activa. 404 si no -mismo criterio que el resto
 *      del modulo: nunca 403, para no confirmarle a quien pregunta que el id
 *      pertenece a un recurso real de otro cocinero.
 *   2. Pedidos activos: si existe al menos un `item_pedido` de esta
 *      publicacion cuyo pedido esta en 'CREADO', 'ACEPTADO' o 'LISTO',
 *      rechaza con 409 SIN tocar la fila - el criterio de aceptacion exige
 *      que "la eliminacion no se efectuara y la publicacion permanece
 *      intacta".
 *   3. Baja logica: recien aca se ejecuta el UPDATE.
 *
 * `resena` no participa de ninguno de estos pasos: no tiene FK a
 * `publicacion` (se relaciona con `pedido`), asi que es fisicamente
 * imposible tocarla por accidente desde aca - es, ademas, lo que exige el
 * ultimo criterio de aceptacion de la historia (conservar las resenas del
 * cocinero tras la baja).
 *
 * Sin notificacion push ni `registrarOperacion`: mismo alcance que el resto
 * del modulo (ver el comentario de `crearPublicacion` sobre US-NOT-06, y el
 * de `cambiarDisponibilidad` sobre la auditoria).
 */
export async function eliminarPublicacion(entrada: {
  cocineroId: string;
  publicacionId: string;
}): Promise<void> {
  const { cocineroId, publicacionId } = entrada;

  const [propia] = await db
    .select({ id: publicacion.id })
    .from(publicacion)
    .where(
      and(
        eq(publicacion.id, publicacionId),
        eq(publicacion.cocineroId, cocineroId),
        eq(publicacion.activo, true),
      ),
    )
    .limit(1);

  if (!propia) throw noEncontrado('la publicación');

  const [pedidoActivo] = await db
    .select({ id: itemPedido.id })
    .from(itemPedido)
    .innerJoin(pedido, eq(pedido.id, itemPedido.pedidoId))
    .where(
      and(
        eq(itemPedido.publicacionId, publicacionId),
        inArray(pedido.estadoPedidoActual, ESTADOS_PEDIDO_ACTIVO),
      ),
    )
    .limit(1);

  if (pedidoActivo) {
    throw new AppError(
      409,
      MENSAJES_PUBLICACION.pedidosActivosNoEliminable,
      'PEDIDOS_ACTIVOS',
    );
  }

  await db
    .update(publicacion)
    .set({ activo: false })
    .where(
      and(
        eq(publicacion.id, publicacionId),
        eq(publicacion.cocineroId, cocineroId),
        eq(publicacion.activo, true),
      ),
    );
}
