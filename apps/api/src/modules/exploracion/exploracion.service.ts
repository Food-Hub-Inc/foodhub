import {
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  lte,
  sql,
  type SQL,
} from 'drizzle-orm';
import {
  categoria,
  cocinero,
  favoritoCocinero,
  favoritoPublicacion,
  publicacion,
  usuario,
} from '@foodhub/db';
import {
  PUBLICACIONES_FEED_POR_PAGINA,
  type CocineroMapa,
  type CocineroPublico,
  type FiltrosFeed,
  type PaginaFeed,
  type PublicacionFeed,
  type PublicacionPublica,
  type ZonaVisible,
} from '@foodhub/shared';
import { db } from '../../lib/db.js';
import {
  aValoracion,
  subconsultaValoracionPorCocinero,
  subconsultaValoracionPorPublicacion,
} from '../../lib/valoraciones.js';
import { noEncontrado } from '../../middleware/error.middleware.js';
import {
  aCocineroResumen,
  aDistanciaKm,
  aPublicacionResumen,
  coincideConTexto,
  cocineroVisible,
  columnasCocinero,
  columnasPublicacion,
  dentroDeLaZona,
  dentroDelRadio,
  distanciaEnKm,
  ESTADOS_OFRECIDOS,
  latitudDelCocinero,
  longitudDelCocinero,
  publicacionVisible,
  todas,
  type Coordenadas,
} from './consultas.js';

/**
 * Modulo de Exploracion y busqueda: el lado cliente del producto.
 *
 * Cubre US-EXP-01 (feed), US-EXP-02 (mapa), US-EXP-03 (filtros), US-EXP-04
 * (perfil publico del cocinero) y US-EXP-05 (detalle del plato). Los favoritos
 * (US-EXP-06) y el carrito (US-EXP-07) tienen sus propios servicios porque
 * escriben, y este solo lee.
 *
 * LA UBICACION LLEGA POR PARAMETRO Y ES OPCIONAL. El cliente no la declara al
 * registrarse -`registroClienteSchema` no la pide y el CHECK
 * `usuario_cocinero_con_ubicacion` solo se la exige al cocinero-, asi que la app
 * la pide al GPS y la manda en cada consulta sin persistirla. Cuando no llega,
 * el feed sigue funcionando: pierde la distancia y el orden por cercania, no la
 * pantalla entera.
 */

/** Coordenadas de los filtros, o `null` si el cliente no comparte ubicacion. */
function coordenadasDe(filtros: FiltrosFeed): Coordenadas | null {
  return filtros.lat !== undefined && filtros.lng !== undefined
    ? { lat: filtros.lat, lng: filtros.lng }
    : null;
}

/**
 * "El plato es de un cocinero que este cliente marco como favorito".
 *
 * Es un `EXISTS` correlacionado y no un JOIN contra `favorito_cocinero`: un
 * JOIN duplicaria la fila del plato si algun dia el favorito dejara de ser unico
 * por par, y el EXISTS corta en la primera coincidencia. Lo cubre
 * `favorito_cocinero_cliente_idx`.
 */
function esDeCocineroFavorito(clienteId: string): SQL {
  return sql`exists (
    select 1 from ${favoritoCocinero}
    where ${favoritoCocinero.clienteId} = ${clienteId}
      and ${favoritoCocinero.cocineroId} = ${publicacion.cocineroId}
  )`;
}

// ---------------------------------------------------------------------------
// US-EXP-01 y US-EXP-03 - Feed
// ---------------------------------------------------------------------------

/** El promedio de la subconsulta de valoracion, tal como lo expone su helper. */
type PromedioValoracion = ReturnType<
  typeof subconsultaValoracionPorPublicacion
>['promedio'];

/**
 * Filtros combinables del feed (US-EXP-03), en una funcion aparte.
 *
 * Vive separada de `listarFeed` por el mismo motivo que
 * `armarFiltroPublicaciones` en el modulo de Publicaciones: es la parte del
 * endpoint que concentra las decisiones de negocio -que se ve y que no-, y
 * mezclarla con el armado de la consulta y el mapeo de la respuesta deja una
 * funcion que nadie puede leer de una sentada.
 *
 * Las dos primeras condiciones son incondicionales: un plato dado de baja o de
 * un cocinero suspendido nunca entra al feed, con o sin filtros.
 */
export function armarFiltroFeed(entrada: {
  clienteId: string;
  filtros: FiltrosFeed;
  coordenadas: Coordenadas | null;
  promedioValoracion: PromedioValoracion;
}): SQL {
  const { clienteId, filtros, coordenadas, promedioValoracion } = entrada;

  const condiciones: SQL[] = [
    ...publicacionVisible(),
    inArray(publicacion.estadoPublicacion, ESTADOS_OFRECIDOS),
  ];

  if (filtros.busqueda) condiciones.push(coincideConTexto(filtros.busqueda));
  if (filtros.categoriaIds && filtros.categoriaIds.length > 0) {
    condiciones.push(inArray(publicacion.categoriaId, filtros.categoriaIds));
  }
  if (filtros.precioMinimo !== undefined) {
    condiciones.push(gte(publicacion.precio, String(filtros.precioMinimo)));
  }
  if (filtros.precioMaximo !== undefined) {
    condiciones.push(lte(publicacion.precio, String(filtros.precioMaximo)));
  }
  // El filtro por distancia solo puede aplicarse si hay desde donde medir. Sin
  // coordenadas se ignora en silencio en lugar de devolver cero resultados: la
  // app no ofrece ese filtro cuando el permiso esta denegado, asi que llegar
  // aca con uno sin el otro seria un cliente desactualizado, no un usuario.
  if (coordenadas && filtros.distanciaMaximaKm !== undefined) {
    condiciones.push(dentroDelRadio(coordenadas, filtros.distanciaMaximaKm));
  }
  if (filtros.valoracionMinima !== undefined) {
    // Un plato sin resenas tiene `promedio` nulo y NO pasa este filtro: pedir
    // "de 4 estrellas para arriba" excluye a lo que todavia nadie califico.
    condiciones.push(sql`${promedioValoracion} >= ${filtros.valoracionMinima}`);
  }
  if (filtros.soloFavoritos) {
    condiciones.push(esDeCocineroFavorito(clienteId));
  }

  return todas(condiciones);
}

/**
 * US-EXP-01 y US-EXP-03 - Feed de platos, con busqueda y filtros combinables.
 *
 * Devuelve una publicacion mas de las que caben en la pagina y la descarta:
 * asi `hayMas` sale de un hecho -habia otra fila- y no de comparar un `total`
 * contra el offset, que exige una segunda consulta con `count()`. El scroll
 * infinito no muestra "pagina 3 de 12", asi que ese total no lo necesita nadie.
 */
export async function listarFeed(
  clienteId: string,
  filtros: FiltrosFeed,
): Promise<PaginaFeed> {
  const coordenadas = coordenadasDe(filtros);
  const valoracion = subconsultaValoracionPorPublicacion();
  const filtro = armarFiltroFeed({
    clienteId,
    filtros,
    coordenadas,
    promedioValoracion: valoracion.promedio,
  });

  const distancia = coordenadas ? distanciaEnKm(coordenadas) : null;

  /**
   * El desempate por `id` no es decorativo: sin un orden total, dos platos a la
   * misma distancia (o creados en el mismo instante) pueden salir en distinto
   * orden en dos paginas consecutivas, y el scroll infinito repetiria uno y se
   * comeria otro.
   */
  const orden = distancia
    ? [asc(distancia), asc(publicacion.id)]
    : [desc(publicacion.fechaCreacion), asc(publicacion.id)];

  const filas = await db
    .select({
      ...columnasPublicacion,
      ...columnasCocinero,
      distanciaKm: distancia ?? sql<number | null>`null`,
    })
    .from(publicacion)
    .innerJoin(categoria, eq(categoria.id, publicacion.categoriaId))
    .innerJoin(usuario, eq(usuario.id, publicacion.cocineroId))
    .leftJoin(
      valoracion.tabla,
      eq(valoracion.tabla.publicacionId, publicacion.id),
    )
    .where(filtro)
    .orderBy(...orden)
    .limit(PUBLICACIONES_FEED_POR_PAGINA + 1)
    .offset((filtros.pagina - 1) * PUBLICACIONES_FEED_POR_PAGINA);

  const hayMas = filas.length > PUBLICACIONES_FEED_POR_PAGINA;
  const datos: PublicacionFeed[] = filas
    .slice(0, PUBLICACIONES_FEED_POR_PAGINA)
    .map((fila) => ({
      ...aPublicacionResumen(fila),
      cocinero: aCocineroResumen(fila),
      distanciaKm: aDistanciaKm(fila.distanciaKm),
    }));

  return {
    datos,
    pagina: filtros.pagina,
    porPagina: PUBLICACIONES_FEED_POR_PAGINA,
    hayMas,
  };
}

// ---------------------------------------------------------------------------
// US-EXP-02 - Mapa
// ---------------------------------------------------------------------------

/**
 * Tope de marcadores por consulta.
 *
 * No sale de un criterio de aceptacion: es una proteccion. Sin limite, un mapa
 * alejado al maximo pide todos los cocineros del pais en una sola respuesta.
 * 500 esta muy por encima de lo que el agrupamiento del cliente maneja con
 * fluidez, asi que en la practica no recorta nada visible; existe para que el
 * peor caso no tumbe la API.
 */
const MAXIMO_MARCADORES = 500;

/**
 * Subconsulta que cuenta, por cocinero, sus platos ofrecidos ahora mismo.
 *
 * Alimenta "cantidad de platos disponibles en ese momento" del segundo criterio
 * de US-EXP-02. Agrupa dentro de la subconsulta para que el LEFT JOIN no
 * duplique al cocinero.
 */
function subconsultaPlatosOfrecidos() {
  const tabla = db
    .select({
      cocineroId: publicacion.cocineroId,
      cantidad: count().as('platos_disponibles'),
    })
    .from(publicacion)
    .where(
      todas([
        eq(publicacion.activo, true),
        inArray(publicacion.estadoPublicacion, ESTADOS_OFRECIDOS),
      ]),
    )
    .groupBy(publicacion.cocineroId)
    .as('platos_por_cocinero');

  return { tabla, cantidad: tabla.cantidad };
}

/**
 * US-EXP-02 - Cocineros con marcador en la zona visible del mapa.
 *
 * Consulta por ZONA VISIBLE y no por radio: el criterio de aceptacion habla de
 * "la zona visible del mapa", y un radio dejaria huecos en las esquinas de la
 * pantalla cuando el usuario la arrastra.
 *
 * Devuelve todo cocinero con la cuenta ACTIVA, tenga o no platos ofrecidos: el
 * primer criterio dice "cada cocinero activo", y el segundo prevé mostrar la
 * cantidad de platos disponibles en la tarjeta -un dato que solo tiene sentido
 * si puede ser cero-.
 */
export async function listarCocinerosDelMapa(
  zona: ZonaVisible,
): Promise<CocineroMapa[]> {
  const valoracion = subconsultaValoracionPorCocinero();
  const platos = subconsultaPlatosOfrecidos();

  const filas = await db
    .select({
      ...columnasCocinero,
      lat: latitudDelCocinero,
      lng: longitudDelCocinero,
      valoracionPromedio: valoracion.promedio,
      platosDisponibles: sql<number>`coalesce(${platos.cantidad}, 0)`.mapWith(
        Number,
      ),
    })
    .from(usuario)
    .leftJoin(valoracion.tabla, eq(valoracion.tabla.cocineroId, usuario.id))
    .leftJoin(platos.tabla, eq(platos.tabla.cocineroId, usuario.id))
    .where(todas([...cocineroVisible(), dentroDeLaZona(zona)]))
    .limit(MAXIMO_MARCADORES);

  return filas.map((fila) => ({
    ...aCocineroResumen(fila),
    lat: fila.lat,
    lng: fila.lng,
    valoracionPromedio: aValoracion(fila.valoracionPromedio),
    platosDisponibles: fila.platosDisponibles,
  }));
}

// ---------------------------------------------------------------------------
// US-EXP-04 - Perfil publico del cocinero
// ---------------------------------------------------------------------------

/**
 * US-EXP-04 - Perfil publico de un cocinero y sus platos activos.
 *
 * El listado de platos incluye los tres estados de disponibilidad, no solo los
 * ofrecidos: el criterio habla de "publicaciones activas" (`activo = true`) y
 * US-EXP-05 exige poder abrir un plato "No disponible" desde algun lado.
 *
 * 404 -y no 403- si el id no es de un cocinero, o si la cuenta esta suspendida
 * o dada de baja. Mismo criterio que el resto del sistema: un 403 confirmaria
 * que el id existe.
 */
export async function obtenerCocineroPublico(entrada: {
  clienteId: string;
  cocineroId: string;
  coordenadas: Coordenadas | null;
}): Promise<CocineroPublico> {
  const { clienteId, cocineroId, coordenadas } = entrada;
  const valoracion = subconsultaValoracionPorCocinero();
  const distancia = coordenadas ? distanciaEnKm(coordenadas) : null;

  const [ficha] = await db
    .select({
      ...columnasCocinero,
      descripcionPublica: cocinero.descripcionPublica,
      lat: latitudDelCocinero,
      lng: longitudDelCocinero,
      distanciaKm: distancia ?? sql<number | null>`null`,
      valoracionPromedio: valoracion.promedio,
      cantidadResenas: valoracion.cantidad,
      esFavorito: sql<boolean>`exists (
        select 1 from ${favoritoCocinero}
        where ${favoritoCocinero.clienteId} = ${clienteId}
          and ${favoritoCocinero.cocineroId} = ${usuario.id}
      )`,
    })
    .from(usuario)
    .innerJoin(cocinero, eq(cocinero.usuarioId, usuario.id))
    .leftJoin(valoracion.tabla, eq(valoracion.tabla.cocineroId, usuario.id))
    .where(todas([eq(usuario.id, cocineroId), ...cocineroVisible()]))
    .limit(1);

  if (!ficha) throw noEncontrado('el cocinero');

  const platos = await db
    .select(columnasPublicacion)
    .from(publicacion)
    .innerJoin(categoria, eq(categoria.id, publicacion.categoriaId))
    .where(
      todas([
        eq(publicacion.cocineroId, cocineroId),
        eq(publicacion.activo, true),
      ]),
    )
    .orderBy(desc(publicacion.fechaCreacion), asc(publicacion.id));

  return {
    ...aCocineroResumen(ficha),
    descripcionPublica: ficha.descripcionPublica,
    lat: ficha.lat,
    lng: ficha.lng,
    distanciaKm: aDistanciaKm(ficha.distanciaKm),
    valoracionPromedio: aValoracion(ficha.valoracionPromedio),
    // `cantidadResenas` viene del LEFT JOIN: un cocinero sin resenas no tiene
    // fila en la subconsulta y llega como null, que en el contrato es 0.
    cantidadResenas: ficha.cantidadResenas ?? 0,
    esFavorito: ficha.esFavorito,
    publicaciones: platos.map(aPublicacionResumen),
  };
}

// ---------------------------------------------------------------------------
// US-EXP-05 - Detalle de la publicacion
// ---------------------------------------------------------------------------

/**
 * US-EXP-05 - Detalle publico de un plato.
 *
 * NO filtra por estado de disponibilidad, a diferencia del feed: el tercer
 * criterio exige que un plato "No disponible" se pueda abrir y muestre el boton
 * "Agregar al carrito" deshabilitado con la indicacion "Sin unidades
 * disponibles". Filtrarlo aca convertiria ese caso en un 404.
 *
 * Si filtra `publicacion.activo` y el estado de la cuenta del cocinero: un plato
 * dado de baja (US-PUB-03) o de un cocinero suspendido deja de existir para el
 * cliente.
 */
export async function obtenerPublicacionPublica(entrada: {
  clienteId: string;
  publicacionId: string;
}): Promise<PublicacionPublica> {
  const { clienteId, publicacionId } = entrada;
  const valoracion = subconsultaValoracionPorPublicacion();

  const [fila] = await db
    .select({
      ...columnasPublicacion,
      ...columnasCocinero,
      descripcion: publicacion.descripcion,
      tiempoEstimadoPreparacion: publicacion.tiempoEstimadoPreparacion,
      valoracionPromedio: valoracion.promedio,
      cantidadResenas: valoracion.cantidad,
      esFavorito: sql<boolean>`exists (
        select 1 from ${favoritoPublicacion}
        where ${favoritoPublicacion.clienteId} = ${clienteId}
          and ${favoritoPublicacion.publicacionId} = ${publicacion.id}
      )`,
    })
    .from(publicacion)
    .innerJoin(categoria, eq(categoria.id, publicacion.categoriaId))
    .innerJoin(usuario, eq(usuario.id, publicacion.cocineroId))
    .leftJoin(
      valoracion.tabla,
      eq(valoracion.tabla.publicacionId, publicacion.id),
    )
    .where(todas([eq(publicacion.id, publicacionId), ...publicacionVisible()]))
    .limit(1);

  if (!fila) throw noEncontrado('la publicación');

  return {
    ...aPublicacionResumen(fila),
    // La columna admite null a nivel de base, pero US-PUB-01 la exige
    // obligatoria en el alta. Mismo fallback que `aPublicacionDetalle` en el
    // modulo de Publicaciones.
    descripcion: fila.descripcion ?? '',
    tiempoEstimadoPreparacion: fila.tiempoEstimadoPreparacion,
    cocinero: aCocineroResumen(fila),
    valoracionPromedio: aValoracion(fila.valoracionPromedio),
    cantidadResenas: fila.cantidadResenas ?? 0,
    esFavorito: fila.esFavorito,
  };
}
