import { and, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { categoria, publicacion, usuario } from '@foodhub/db';
import type { EstadoPublicacion } from '@foodhub/shared';

/**
 * Vocabulario SQL del modulo de Exploracion y busqueda.
 *
 * Los cinco endpoints del modulo repiten las mismas tres cosas: quien es un
 * cocinero visible, como se mide la distancia al cliente y que columnas forman
 * la tarjeta de un plato. Definirlas una vez aca deja los servicios contando
 * casos de uso en lugar de armando SQL, y evita que la regla de visibilidad -la
 * mas facil de olvidar y la que mas duele si falta- quede escrita cinco veces
 * con cinco variantes.
 */

/** Punto geografico en lat/lng, como lo entrega el GPS del dispositivo. */
export interface Coordenadas {
  lat: number;
  lng: number;
}

/**
 * Estados de disponibilidad que el feed muestra.
 *
 * El primer criterio de US-EXP-01 es explicito: "incluyendo solo aquellas con
 * estado 'Disponible' o 'Ultimas unidades'". NO aplica al detalle ni al perfil
 * del cocinero: el tercer criterio de US-EXP-05 exige poder abrir un plato "No
 * disponible" y encontrar el boton de agregar deshabilitado.
 */
export const ESTADOS_OFRECIDOS: EstadoPublicacion[] = [
  'DISPONIBLE',
  'ULTIMAS_UNIDADES',
];

// ---------------------------------------------------------------------------
// PostGIS
// ---------------------------------------------------------------------------

/**
 * El punto del cliente como `geography`.
 *
 * OJO CON EL ORDEN: `ST_MakePoint` toma (x, y) = (lng, lat), al revés de como
 * se nombra un par de coordenadas en el habla comun. Invertirlos ubica al
 * cliente en otro continente sin que ninguna validacion lo detecte (ver el
 * mismo aviso en `ubicacionSchema`, packages/shared).
 *
 * El cast a `geography` -y no `geometry`- es lo que hace que `ST_Distance`
 * devuelva METROS sobre el elipsoide en vez de grados. Con `geometry` la
 * "distancia" entre dos puntos en SRID 4326 son grados de arco, un numero que
 * no se puede mostrar ni comparar contra kilometros.
 */
function puntoDelCliente(coordenadas: Coordenadas): SQL {
  return sql`ST_SetSRID(ST_MakePoint(${coordenadas.lng}, ${coordenadas.lat}), 4326)::geography`;
}

/**
 * Distancia en kilometros entre el cocinero de la fila y el cliente.
 *
 * Sin `.mapWith(Number)`: la columna `usuario.ubicacion` es nullable y
 * `Number(null)` es 0, que afirmaria que el cocinero esta a la vuelta de la
 * esquina. En la practica todo cocinero tiene ubicacion -lo garantiza el CHECK
 * `usuario_cocinero_con_ubicacion`-, pero el tipo se mantiene honesto y la
 * conversion la hacen los mapeadores de abajo.
 */
export function distanciaEnKm(coordenadas: Coordenadas): SQL<number | null> {
  return sql<
    number | null
  >`ST_Distance(${usuario.ubicacion}::geography, ${puntoDelCliente(coordenadas)}) / 1000`;
}

/**
 * Cocineros dentro de un radio, resuelto con `ST_DWithin` y no comparando la
 * distancia calculada contra un numero.
 *
 * `ST_DWithin` es el unico de los dos que puede usar el indice GiST
 * `usuario_ubicacion_gix`: un `WHERE ST_Distance(...) < X` obliga a calcular la
 * distancia de TODOS los cocineros antes de descartar ninguno.
 */
export function dentroDelRadio(
  coordenadas: Coordenadas,
  distanciaMaximaKm: number,
): SQL {
  return sql`ST_DWithin(${usuario.ubicacion}::geography, ${puntoDelCliente(coordenadas)}, ${distanciaMaximaKm * 1000})`;
}

/**
 * Cocineros cuyo punto cae dentro del rectangulo visible del mapa (US-EXP-02).
 *
 * `&&` es el operador de solapamiento de cajas envolventes de PostGIS, y es el
 * que aprovecha el indice GiST. `ST_MakeEnvelope` toma los limites en orden
 * (xmin, ymin, xmax, ymax) = (lngMin, latMin, lngMax, latMax).
 */
export function dentroDeLaZona(zona: {
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
}): SQL {
  return sql`${usuario.ubicacion} && ST_MakeEnvelope(${zona.lngMin}, ${zona.latMin}, ${zona.lngMax}, ${zona.latMax}, 4326)`;
}

/** Latitud y longitud del punto del cocinero, para dibujar su marcador. */
export const latitudDelCocinero = sql<number>`ST_Y(${usuario.ubicacion}::geometry)`;
export const longitudDelCocinero = sql<number>`ST_X(${usuario.ubicacion}::geometry)`;

// ---------------------------------------------------------------------------
// Visibilidad
// ---------------------------------------------------------------------------

/**
 * Quien es un cocinero al que un cliente puede llegar.
 *
 * Las tres condiciones van juntas SIEMPRE, en los cinco endpoints del modulo:
 *
 *   tipo = 'COCINERO'          `publicacion.cocinero_id` referencia `cocinero`,
 *                              asi que el join ya lo garantiza; se deja igual
 *                              para que la consulta sea legible sin recorrer el
 *                              schema, y para cubrir los endpoints que parten de
 *                              `usuario` (el mapa) en lugar de `publicacion`.
 *   estado_cuenta = 'ACTIVA'   una cuenta suspendida (US-GURP-08) o dada de baja
 *                              (US-GURP-09) desaparece del feed, del mapa y de
 *                              los favoritos. Es tambien lo que implementa
 *                              "un cocinero favorito dado de baja se elimina de
 *                              la lista" del ultimo criterio de US-EXP-06, sin
 *                              borrar la fila del favorito.
 *   ubicacion is not null      sin punto no hay distancia ni marcador. El CHECK
 *                              del schema lo garantiza para todo cocinero, pero
 *                              la condicion tambien le informa al planificador
 *                              que puede usar el indice GiST parcial.
 */
export function cocineroVisible(): SQL[] {
  return [
    eq(usuario.tipo, 'COCINERO'),
    eq(usuario.estadoCuenta, 'ACTIVA'),
    sql`${usuario.ubicacion} is not null`,
  ];
}

/**
 * Busqueda por texto del feed.
 *
 * Matchea el nombre del plato O el nombre de la categoria, como pide el primer
 * criterio de US-EXP-03 ("coincidencias parciales en nombre del plato o
 * categoria"). `ilike` la hace insensible a mayusculas y minusculas.
 *
 * `%` y `_` del texto ingresado se escapan: sin eso, buscar "100%" haria de ese
 * signo un comodin y devolveria cualquier plato que empiece con "100". Mismo
 * criterio que `armarFiltroPublicaciones` en el modulo de Publicaciones.
 */
export function coincideConTexto(busqueda: string): SQL {
  const patron = `%${busqueda.replaceAll('%', '\\%').replaceAll('_', '\\_')}%`;

  // `or(...)` tipa su retorno como `SQL | undefined` porque su firma no
  // garantiza al compilador que reciba al menos una condicion. Aca recibe dos.
  return or(
    ilike(publicacion.nombre, patron),
    ilike(categoria.nombre, patron),
  )!;
}

/** Las condiciones incondicionales de cualquier lectura publica de un plato. */
export function publicacionVisible(): SQL[] {
  return [eq(publicacion.activo, true), ...cocineroVisible()];
}

/** Une condiciones en un `AND`, con el tipo estrechado a `SQL`. */
export function todas(condiciones: SQL[]): SQL {
  return and(...condiciones)!;
}

// ---------------------------------------------------------------------------
// Columnas reutilizadas
// ---------------------------------------------------------------------------

/** Identidad publica del cocinero, tal como la espera `cocineroResumenSchema`. */
export const columnasCocinero = {
  cocineroId: usuario.id,
  cocineroNombre: usuario.nombre,
  cocineroApellido: usuario.apellido,
  cocineroFotoPerfilUrl: usuario.fotoPerfilUrl,
};

/** Columnas de la tarjeta de un plato, tal como las espera el contrato. */
export const columnasPublicacion = {
  id: publicacion.id,
  nombre: publicacion.nombre,
  precio: publicacion.precio,
  imagenUrl: publicacion.imagenUrl,
  estadoPublicacion: publicacion.estadoPublicacion,
  categoriaId: categoria.id,
  categoriaNombre: categoria.nombre,
  categoriaImagenPredeterminadaUrl: categoria.imagenPredeterminadaUrl,
};

// ---------------------------------------------------------------------------
// Filas -> contrato publico
// ---------------------------------------------------------------------------

export interface FilaCocinero {
  cocineroId: string;
  cocineroNombre: string;
  cocineroApellido: string;
  cocineroFotoPerfilUrl: string | null;
}

export interface FilaPublicacion {
  id: string;
  nombre: string;
  precio: string;
  imagenUrl: string | null;
  estadoPublicacion: EstadoPublicacion;
  categoriaId: string;
  categoriaNombre: string;
  categoriaImagenPredeterminadaUrl: string | null;
}

/**
 * Mapeadores PUROS -sin acceso a `db`-: se prueban sin mockear la base, mismo
 * criterio que `aPublicacionListado` en el modulo de Publicaciones.
 */
export function aCocineroResumen(fila: FilaCocinero) {
  return {
    id: fila.cocineroId,
    nombre: fila.cocineroNombre,
    apellido: fila.cocineroApellido,
    fotoPerfilUrl: fila.cocineroFotoPerfilUrl,
  };
}

export function aPublicacionResumen(fila: FilaPublicacion) {
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
  };
}

/**
 * Redondea la distancia a un decimal.
 *
 * El criterio de US-EXP-01 pide "distancia aproximada": devolver
 * 2.7382910473 km seria falsa precision -el GPS del telefono no la tiene- y
 * obligaria a cada pantalla a redondear por su cuenta.
 */
export function aDistanciaKm(distancia: number | null): number | null {
  return distancia === null ? null : Math.round(distancia * 10) / 10;
}
