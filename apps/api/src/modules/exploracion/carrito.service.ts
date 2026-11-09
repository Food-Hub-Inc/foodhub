import { asc, eq, sql } from 'drizzle-orm';
import { carrito, itemCarrito, publicacion, usuario } from '@foodhub/db';
import {
  CANTIDAD_MAXIMA_POR_PLATO,
  MENSAJES_EXPLORACION,
  MENSAJE_CANTIDAD_MAXIMA,
  type AgregarAlCarritoRespuesta,
  type Carrito,
  type CarritoRespuesta,
  type ItemCarrito,
} from '@foodhub/shared';
import { db } from '../../lib/db.js';
import {
  aValoracion,
  subconsultaValoracionPorCocinero,
} from '../../lib/valoraciones.js';
import { AppError, noEncontrado } from '../../middleware/error.middleware.js';
import {
  aCocineroResumen,
  columnasCocinero,
  publicacionVisible,
  todas,
} from './consultas.js';

/**
 * US-EXP-07 - Carrito del cliente.
 *
 * UN SOLO CARRITO ACTIVO POR CLIENTE. Lo garantiza el indice
 * `carrito_cliente_uq` a nivel de base, y de ahi sale la forma de todo este
 * archivo: ninguna funcion recibe un `carritoId` por parametro, porque el
 * cliente autenticado determina univocamente cual es su carrito. Es tambien lo
 * que hace posible el cuarto criterio de US-EXP-05: preguntar "Tu carrito tiene
 * platos de otro cocinero. Queres vaciarlo y comenzar uno nuevo?" solo tiene
 * sentido si no pueden convivir dos.
 *
 * LOS SNAPSHOTS NO SE LEEN DE LA PUBLICACION VIGENTE. `item_carrito` guarda
 * nombre, precio e imagen tal como estaban al agregar el plato, asi que el
 * cliente ve lo que eligio aunque el cocinero lo edite mientras tanto. El unico
 * dato que si sale de la publicacion vigente es `tiempoEstimadoPreparacion`,
 * porque no tiene columna de snapshot y es una referencia, no parte del precio.
 */

// ---------------------------------------------------------------------------
// Depuracion de platos que dejaron de estar disponibles
// ---------------------------------------------------------------------------

/**
 * Quita del carrito los platos que ya no se pueden pedir y devuelve sus nombres.
 *
 * Implementa el penultimo criterio de US-EXP-07: "Al ingresar al carrito o al
 * intentar confirmar el pedido, muestre una advertencia visible sobre el item
 * afectado (...). Elimine ese item del carrito automaticamente". Corre en CADA
 * lectura y en cada escritura del carrito, que es lo que "al ingresar" exige;
 * no hay proceso periodico detras.
 *
 * Dos motivos de baja, no uno: el estado `NO_DISPONIBLE` que menciona el
 * criterio, y `activo = false`, que es la baja logica de la publicacion
 * (US-PUB-03). Los dos dejan al plato imposible de pedir, y para el cliente son
 * el mismo hecho.
 *
 * El `EXISTS` correlacionado resuelve el borrado en una sola sentencia, sin
 * traer los items al proceso para decidir cuales borrar. `RETURNING` devuelve el
 * nombre del SNAPSHOT -no el de la publicacion actual-: el aviso tiene que
 * nombrar el plato como el cliente lo agrego.
 */
async function depurarNoDisponibles(carritoId: string): Promise<string[]> {
  const quitados = await db
    .delete(itemCarrito)
    .where(
      todas([
        eq(itemCarrito.carritoId, carritoId),
        sql`exists (
          select 1 from ${publicacion}
          where ${publicacion.id} = ${itemCarrito.publicacionId}
            and (
              ${publicacion.activo} = false
              or ${publicacion.estadoPublicacion} = 'NO_DISPONIBLE'
            )
        )`,
      ]),
    )
    .returning({ nombre: itemCarrito.nombrePlatoSnapshot });

  return quitados.map((item) => item.nombre);
}

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------

/**
 * Rango del tiempo estimado de preparacion del carrito, en minutos.
 *
 * Alimenta la referencia "Listo en 25-30 min" del primer criterio de US-EXP-07.
 * El criterio marca ese texto como ejemplo ("ej.") y no fija como se calcula el
 * rango, asi que se toma el minimo y el maximo de los platos del carrito: con un
 * solo plato -o con varios que declaran el mismo tiempo- minimo y maximo
 * coinciden y la interfaz muestra un numero en lugar de un rango.
 *
 * `null` si ningun plato declara tiempo: es un campo opcional en US-PUB-01.
 *
 * Funcion PURA: se prueba sin base.
 */
export function rangoDeTiempo(items: readonly ItemCarrito[]): {
  tiempoEstimadoMinimo: number | null;
  tiempoEstimadoMaximo: number | null;
} {
  const tiempos = items
    .map((item) => item.tiempoEstimadoPreparacion)
    .filter((minutos): minutos is number => minutos !== null);

  if (tiempos.length === 0) {
    return { tiempoEstimadoMinimo: null, tiempoEstimadoMaximo: null };
  }

  return {
    tiempoEstimadoMinimo: Math.min(...tiempos),
    tiempoEstimadoMaximo: Math.max(...tiempos),
  };
}

/**
 * Lee el carrito del cliente, ya depurado, o `null` si no tiene ninguno.
 *
 * OJO: la cabecera NO aplica `cocineroVisible()`. Si el cocinero fue suspendido
 * mientras el carrito existia, el carrito se sigue mostrando en lugar de
 * romperse con un carrito sin cabecera. Bloquear la compra en ese caso es
 * responsabilidad de US-PED-01, que valida al confirmar; ningun criterio de
 * US-EXP-07 pide vaciar el carrito por la suspension del cocinero, y hacerlo por
 * cuenta propia destruiria la seleccion del cliente por algo que puede
 * revertirse (US-GURP-08 rehabilita cuentas).
 */
async function leerCarrito(clienteId: string): Promise<Carrito | null> {
  const valoracion = subconsultaValoracionPorCocinero();

  const [cabecera] = await db
    .select({
      carritoId: carrito.id,
      ...columnasCocinero,
      valoracionPromedio: valoracion.promedio,
    })
    .from(carrito)
    .innerJoin(usuario, eq(usuario.id, carrito.cocineroId))
    .leftJoin(valoracion.tabla, eq(valoracion.tabla.cocineroId, usuario.id))
    .where(eq(carrito.clienteId, clienteId))
    .limit(1);

  if (!cabecera) return null;

  const [items, [suma]] = await Promise.all([
    db
      .select({
        id: itemCarrito.id,
        publicacionId: itemCarrito.publicacionId,
        nombre: itemCarrito.nombrePlatoSnapshot,
        precioUnitario: itemCarrito.precioUnitarioSnapshot,
        cantidad: itemCarrito.cantidad,
        imagenUrl: itemCarrito.imagenSnapshot,
        tiempoEstimadoPreparacion: publicacion.tiempoEstimadoPreparacion,
      })
      .from(itemCarrito)
      .innerJoin(publicacion, eq(publicacion.id, itemCarrito.publicacionId))
      .where(eq(itemCarrito.carritoId, cabecera.carritoId))
      // `item_carrito` no tiene fecha de alta y su id es aleatorio, asi que el
      // orden de insercion no es recuperable. Alfabetico por nombre es el unico
      // criterio estable y ademas legible: el carrito no cambia de orden solo
      // porque el cliente toco "+".
      .orderBy(asc(itemCarrito.nombrePlatoSnapshot), asc(itemCarrito.id)),

    // El total se suma EN LA BASE y vuelve como texto. Sumar en JavaScript
    // obligaria a convertir los `numeric` a `number` y reintroduciria el error
    // de punto flotante que la columna fue elegida para evitar.
    db
      .select({
        total: sql<string>`coalesce(sum(${itemCarrito.precioUnitarioSnapshot} * ${itemCarrito.cantidad}), 0)::text`,
      })
      .from(itemCarrito)
      .where(eq(itemCarrito.carritoId, cabecera.carritoId)),
  ]);

  return {
    id: cabecera.carritoId,
    cocinero: {
      ...aCocineroResumen(cabecera),
      valoracionPromedio: aValoracion(cabecera.valoracionPromedio),
    },
    items,
    total: suma?.total ?? '0',
    ...rangoDeTiempo(items),
  };
}

/**
 * Busca el carrito del cliente y lo depura. Si la depuracion lo deja sin items,
 * borra el carrito: el estado vacio de PAN-PED-01.1 es una pantalla propia, no
 * un carrito con cero items, y dejar la fila vacia haria que el proximo
 * "Agregar al carrito" de OTRO cocinero disparara la pregunta de reemplazo sin
 * que hubiera nada que reemplazar.
 *
 * Se exporta porque el modulo de Pedidos la corre tambien al confirmar
 * (US-EXP-07: "al ingresar al carrito O AL INTENTAR CONFIRMAR EL PEDIDO"): sin
 * eso, un plato que dejo de estar disponible mientras el cliente miraba la
 * pantalla entraria igual al pedido.
 */
export async function depurarYLimpiar(clienteId: string): Promise<string[]> {
  const [propio] = await db
    .select({ id: carrito.id })
    .from(carrito)
    .where(eq(carrito.clienteId, clienteId))
    .limit(1);

  if (!propio) return [];

  const quitados = await depurarNoDisponibles(propio.id);
  if (quitados.length === 0) return [];

  const [restante] = await db
    .select({ id: itemCarrito.id })
    .from(itemCarrito)
    .where(eq(itemCarrito.carritoId, propio.id))
    .limit(1);

  if (!restante) {
    await db.delete(carrito).where(eq(carrito.id, propio.id));
  }

  return quitados;
}

/** US-EXP-07 - Carrito vigente del cliente. */
export async function obtenerCarrito(
  clienteId: string,
): Promise<CarritoRespuesta> {
  const itemsQuitados = await depurarYLimpiar(clienteId);
  return { carrito: await leerCarrito(clienteId), itemsQuitados };
}

// ---------------------------------------------------------------------------
// Alta de un plato (cuarto y quinto criterio de US-EXP-05)
// ---------------------------------------------------------------------------

/**
 * US-EXP-05 - Agrega un plato al carrito, o incrementa su cantidad si ya estaba.
 *
 * Las tres reglas del criterio, en orden:
 *
 *   1. Un plato "No disponible" no se puede agregar. La interfaz ya deshabilita
 *      el boton, pero el servidor lo verifica igual: el estado pudo cambiar
 *      entre que se dibujo la pantalla y el toque.
 *   2. Si el carrito es de otro cocinero, se responde 409
 *      `CARRITO_DE_OTRO_COCINERO` con el literal de la pregunta. El carrito
 *      anterior se borra SOLO si el cliente vuelve con `reemplazarCarrito`.
 *      Nunca se destruye por decision del servidor.
 *   3. Si el plato ya estaba, la cantidad sube en 1 y `cantidadActual` alimenta
 *      el literal "Cantidad actual [nro]".
 *
 * Todo lo que escribe va en UNA transaccion. Sin ella, dos toques rapidos del
 * boton pueden intercalarse entre el SELECT del item y su UPDATE y perder un
 * incremento; y el borrado del carrito anterior podria quedar hecho sin que el
 * item nuevo llegue a insertarse, dejando al cliente sin nada.
 */
/**
 * La conexion dentro de una transaccion de Drizzle. Los dos pasos de escritura
 * de `agregarAlCarrito` la reciben por parametro en lugar de usar `db`: si
 * tomaran `db`, sus sentencias saldrian por otra conexion del pool y quedarian
 * FUERA de la transaccion, que es exactamente el bug que la transaccion viene a
 * evitar.
 */
type Transaccion = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** El plato ya validado, tal como lo lee `agregarAlCarrito`. */
interface PlatoParaCarrito {
  cocineroId: string;
  nombre: string;
  precio: string;
  imagenUrl: string | null;
}

/**
 * Devuelve el id del carrito donde va a caer el plato, creandolo si hace falta.
 *
 * Es el paso que implementa el cuarto criterio de US-EXP-05. El carrito anterior
 * se borra SOLO con `reemplazarCarrito`; sin la bandera responde 409 y no toca
 * nada, que es lo que permite a la app preguntar primero.
 */
async function resolverCarritoDestino(
  tx: Transaccion,
  entrada: {
    clienteId: string;
    cocineroId: string;
    reemplazarCarrito: boolean;
  },
): Promise<string> {
  const [propio] = await tx
    .select({ id: carrito.id, cocineroId: carrito.cocineroId })
    .from(carrito)
    .where(eq(carrito.clienteId, entrada.clienteId))
    .limit(1);

  if (propio) {
    // Mismo cocinero: se sigue usando el carrito que ya estaba.
    if (propio.cocineroId === entrada.cocineroId) return propio.id;

    if (!entrada.reemplazarCarrito) {
      throw new AppError(
        409,
        MENSAJES_EXPLORACION.carritoDeOtroCocinero,
        'CARRITO_DE_OTRO_COCINERO',
      );
    }
    // `item_carrito.carrito_id` es ON DELETE CASCADE: borrar el carrito se
    // lleva sus items sin que haya que enumerarlos.
    await tx.delete(carrito).where(eq(carrito.id, propio.id));
  }

  const [creado] = await tx
    .insert(carrito)
    .values({ clienteId: entrada.clienteId, cocineroId: entrada.cocineroId })
    .returning({ id: carrito.id });

  if (!creado) throw new Error('No se pudo crear el carrito.');
  return creado.id;
}

/**
 * Suma una unidad del plato al carrito: lo inserta con cantidad 1, o incrementa
 * en 1 la fila que ya estaba (quinto criterio de US-EXP-05).
 *
 * Los snapshots se copian de la publicacion vigente SOLO al insertar. Al
 * incrementar no se tocan: si el cocinero cambio el precio despues de que el
 * cliente agrego el plato, el carrito tiene que seguir mostrando el precio con
 * el que lo agrego.
 */
async function sumarUnaUnidad(
  tx: Transaccion,
  entrada: { carritoId: string; plato: PlatoParaCarrito & { id: string } },
): Promise<{ cantidadActual: number; eraNuevoItem: boolean }> {
  const { carritoId, plato } = entrada;

  const [existente] = await tx
    .select({ id: itemCarrito.id, cantidad: itemCarrito.cantidad })
    .from(itemCarrito)
    .where(
      todas([
        eq(itemCarrito.carritoId, carritoId),
        eq(itemCarrito.publicacionId, plato.id),
      ]),
    )
    .limit(1);

  if (!existente) {
    await tx.insert(itemCarrito).values({
      carritoId,
      publicacionId: plato.id,
      cantidad: 1,
      precioUnitarioSnapshot: plato.precio,
      nombrePlatoSnapshot: plato.nombre,
      imagenSnapshot: plato.imagenUrl,
    });
    return { cantidadActual: 1, eraNuevoItem: true };
  }

  if (existente.cantidad >= CANTIDAD_MAXIMA_POR_PLATO) {
    // El criterio dice "incremente en 1" sin contemplar el techo. Se rechaza
    // con el mismo mensaje que ya usa el schema de cantidad, en vez de dejar la
    // cantidad quieta y devolver un exito que miente.
    throw new AppError(
      409,
      MENSAJE_CANTIDAD_MAXIMA,
      'CANTIDAD_MAXIMA_ALCANZADA',
    );
  }

  const cantidadActual = existente.cantidad + 1;
  await tx
    .update(itemCarrito)
    .set({ cantidad: cantidadActual })
    .where(eq(itemCarrito.id, existente.id));

  return { cantidadActual, eraNuevoItem: false };
}

export async function agregarAlCarrito(entrada: {
  clienteId: string;
  publicacionId: string;
  reemplazarCarrito: boolean;
}): Promise<AgregarAlCarritoRespuesta> {
  const { clienteId, publicacionId, reemplazarCarrito } = entrada;

  const [plato] = await db
    .select({
      id: publicacion.id,
      cocineroId: publicacion.cocineroId,
      nombre: publicacion.nombre,
      precio: publicacion.precio,
      imagenUrl: publicacion.imagenUrl,
      estadoPublicacion: publicacion.estadoPublicacion,
    })
    .from(publicacion)
    .innerJoin(usuario, eq(usuario.id, publicacion.cocineroId))
    .where(todas([eq(publicacion.id, publicacionId), ...publicacionVisible()]))
    .limit(1);

  if (!plato) throw noEncontrado('la publicación');

  if (plato.estadoPublicacion === 'NO_DISPONIBLE') {
    throw new AppError(
      409,
      MENSAJES_EXPLORACION.sinUnidadesDisponibles,
      'PLATO_NO_DISPONIBLE',
    );
  }

  const resultado = await db.transaction(async (tx) => {
    const carritoId = await resolverCarritoDestino(tx, {
      clienteId,
      cocineroId: plato.cocineroId,
      reemplazarCarrito,
    });

    const sumado = await sumarUnaUnidad(tx, { carritoId, plato });

    await tx
      .update(carrito)
      .set({ fechaUltimaModificacion: new Date() })
      .where(eq(carrito.id, carritoId));

    return sumado;
  });

  const itemsQuitados = await depurarYLimpiar(clienteId);
  const actualizado = await leerCarrito(clienteId);

  // El plato recien agregado esta disponible, asi que la depuracion no puede
  // haber dejado el carrito vacio: siempre queda al menos esa fila.
  if (!actualizado) throw new Error('No se pudo leer el carrito.');

  return { carrito: actualizado, itemsQuitados, ...resultado };
}

// ---------------------------------------------------------------------------
// Cantidades y bajas (US-EXP-07)
// ---------------------------------------------------------------------------

/**
 * Verifica que el item pertenezca al carrito del cliente que hace el pedido.
 *
 * Es la unica defensa contra que un cliente modifique el carrito de otro
 * cambiando el id de la URL: `item_carrito` no tiene columna de cliente, asi que
 * la pertenencia se prueba subiendo por `carrito_id`. 404 y no 403, mismo
 * criterio que el resto del sistema.
 */
async function exigirItemPropio(
  clienteId: string,
  itemId: string,
): Promise<{ carritoId: string }> {
  const [propio] = await db
    .select({ carritoId: itemCarrito.carritoId })
    .from(itemCarrito)
    .innerJoin(carrito, eq(carrito.id, itemCarrito.carritoId))
    .where(
      todas([eq(itemCarrito.id, itemId), eq(carrito.clienteId, clienteId)]),
    )
    .limit(1);

  if (!propio) throw noEncontrado('el plato en tu carrito');
  return propio;
}

/**
 * US-EXP-07 - Cambia la cantidad de un item ("+" y "-" de la pantalla).
 *
 * Solo llega aca con cantidad >= 1: `cantidadItemSchema` lo garantiza. Bajar de
 * 1 no es un cambio de cantidad sino una baja, y la pantalla la resuelve con el
 * dialogo "Queres quitar este plato del carrito?" antes de llamar a
 * `quitarItem`.
 */
export async function cambiarCantidadItem(entrada: {
  clienteId: string;
  itemId: string;
  cantidad: number;
}): Promise<CarritoRespuesta> {
  const { carritoId } = await exigirItemPropio(
    entrada.clienteId,
    entrada.itemId,
  );

  await db
    .update(itemCarrito)
    .set({ cantidad: entrada.cantidad })
    .where(eq(itemCarrito.id, entrada.itemId));

  await db
    .update(carrito)
    .set({ fechaUltimaModificacion: new Date() })
    .where(eq(carrito.id, carritoId));

  return obtenerCarrito(entrada.clienteId);
}

/**
 * US-EXP-07 - Quita un item del carrito ("x", o "-" con cantidad 1).
 *
 * Si era el ultimo, borra tambien el carrito: mismo criterio que
 * `depurarYLimpiar`, el estado vacio es la ausencia de carrito y no un carrito
 * sin items.
 */
export async function quitarItem(entrada: {
  clienteId: string;
  itemId: string;
}): Promise<CarritoRespuesta> {
  const { carritoId } = await exigirItemPropio(
    entrada.clienteId,
    entrada.itemId,
  );

  await db.delete(itemCarrito).where(eq(itemCarrito.id, entrada.itemId));

  const [restante] = await db
    .select({ id: itemCarrito.id })
    .from(itemCarrito)
    .where(eq(itemCarrito.carritoId, carritoId))
    .limit(1);

  if (restante) {
    await db
      .update(carrito)
      .set({ fechaUltimaModificacion: new Date() })
      .where(eq(carrito.id, carritoId));
  } else {
    await db.delete(carrito).where(eq(carrito.id, carritoId));
  }

  return obtenerCarrito(entrada.clienteId);
}

/**
 * US-EXP-07 - Vacia el carrito completo (boton "Vaciar carrito").
 *
 * Borra el carrito, no solo sus items, por el mismo motivo que `quitarItem`.
 * Sin verificar que exista: vaciar un carrito que ya no esta deja el mismo
 * estado que el cliente pidio, igual criterio que la baja de un favorito.
 */
export async function vaciarCarrito(
  clienteId: string,
): Promise<CarritoRespuesta> {
  await db.delete(carrito).where(eq(carrito.clienteId, clienteId));
  return { carrito: null, itemsQuitados: [] };
}
