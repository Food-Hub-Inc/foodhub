import { z } from 'zod';
import { ESTADO_PUBLICACION } from '../constants/enums.js';
import { categoriaResumenSchema } from './catalogo.schema.js';

/**
 * Contratos del modulo de Exploracion y busqueda (US-EXP-01 a US-EXP-07).
 *
 * Se definen los siete juntos, antes del router, por el mismo motivo que
 * `publicacion.schema.ts`: las historias comparten la tarjeta del feed, la
 * ficha del cocinero y el bloque de mensajes, asi que fijar el contrato una
 * sola vez evita que cada historia transcriba (y con el tiempo desincronice)
 * los mismos campos.
 *
 * DOS DECISIONES QUE ATRAVIESAN TODO EL MODULO
 *
 *   UBICACION   El cliente no declara ubicacion al registrarse
 *               (`registroClienteSchema` no la pide y el CHECK
 *               `usuario_cocinero_con_ubicacion` solo se la exige al cocinero),
 *               asi que `lat`/`lng` viajan como parametros de consulta en cada
 *               request y NO se persisten. Son opcionales: si el usuario nego el
 *               permiso, el feed sigue funcionando sin distancia ni orden por
 *               cercania.
 *   PRECIOS     Se tipan como `string` en los dos sentidos del contrato, igual
 *               que en `publicacion.schema.ts`: la columna es `numeric` y
 *               coercionar a `number` reintroduce el error de punto flotante
 *               que esa eleccion evita.
 */

// ---------------------------------------------------------------------------
// Ubicacion y zona visible
// ---------------------------------------------------------------------------

/**
 * Coordenadas del dispositivo. `z.coerce` porque llegan como texto en la query
 * string, a diferencia de `ubicacionSchema` (`auth.schema.ts`), que viaja en un
 * body JSON y ya es numerico. Los rangos son los mismos.
 */
const latitudSchema = z.coerce
  .number()
  .min(-90, 'La latitud debe estar entre -90 y 90.')
  .max(90, 'La latitud debe estar entre -90 y 90.');

const longitudSchema = z.coerce
  .number()
  .min(-180, 'La longitud debe estar entre -180 y 180.')
  .max(180, 'La longitud debe estar entre -180 y 180.');

/**
 * Ubicacion del cliente cuando acompana a una consulta que funciona con o sin
 * ella. La usa el perfil publico del cocinero (US-EXP-04), que muestra la
 * distancia solo si el cliente comparte su posicion.
 *
 * El refine rechaza media coordenada: un `lat` sin `lng` no ubica nada, y sin
 * esta comprobacion el servicio tendria que decidir en silencio si lo ignora o
 * si falla.
 */
export const coordenadasOpcionalesSchema = z
  .object({
    lat: latitudSchema.optional(),
    lng: longitudSchema.optional(),
  })
  .refine((c) => (c.lat === undefined) === (c.lng === undefined), {
    message: 'Faltan las coordenadas para calcular la cercanía.',
    path: ['lat'],
  });

/**
 * Rectangulo visible del mapa (US-EXP-02).
 *
 * El criterio de aceptacion habla de "la zona visible del mapa", no de un
 * radio: el mapa consulta lo que entra en pantalla y vuelve a consultar cuando
 * el usuario lo mueve. `react-native-maps` entrega la region como centro mas
 * delta; la app la traduce a estos cuatro limites antes de mandarla.
 */
export const zonaVisibleSchema = z
  .object({
    latMin: latitudSchema,
    latMax: latitudSchema,
    lngMin: longitudSchema,
    lngMax: longitudSchema,
  })
  .refine((zona) => zona.latMin <= zona.latMax, {
    message: 'La zona del mapa no es válida.',
    path: ['latMin'],
  });

// ---------------------------------------------------------------------------
// Filtros del feed (US-EXP-01 y US-EXP-03)
// ---------------------------------------------------------------------------

/**
 * Publicaciones por pagina del feed.
 *
 * Mismo valor que `PUBLICACIONES_POR_PAGINA`, que sale de RNF002. US-EXP-01 no
 * fija un tamano -pide scroll infinito, no paginacion numerada-, asi que se
 * reusa el numero que el proyecto ya definio en vez de elegir otro.
 */
export const PUBLICACIONES_FEED_POR_PAGINA = 10;

/** Separa un query param CSV ("a,b,c") en sus partes, sin validarlas todavia. */
const listaCsvSchema = z.string().transform((valor) =>
  valor
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean),
);

/**
 * Una casilla que viaja por query string llega como "true"/"false", no como
 * booleano. `z.coerce.boolean()` no sirve: convierte cualquier string no vacio
 * en `true`, asi que "false" daria `true`.
 */
const casillaEnQuerySchema = z
  .enum(['true', 'false'])
  .transform((valor) => valor === 'true');

/**
 * US-EXP-01 y US-EXP-03 - Feed y sus filtros combinables.
 *
 * NO hay campo de orden: el primer criterio de US-EXP-01 fija uno solo
 * ("ordenadas por cercania de forma ascendente") y no existe un desplegable de
 * "Ordenar por" en la pantalla, a diferencia de PAN-PUB-01. Si no llegan
 * `lat`/`lng` no hay cercania que calcular y el servicio ordena por fecha; esa
 * degradacion es del servicio, no una opcion del cliente.
 *
 * `busqueda` matchea nombre del plato O nombre de la categoria (primer criterio
 * de US-EXP-03, "coincidencias parciales en nombre del plato o categoria"); esa
 * parte la aplica el servicio con `ilike`, no este schema.
 */
export const filtrosFeedSchema = z
  .object({
    busqueda: z.string().trim().max(120).optional(),
    categoriaIds: listaCsvSchema.pipe(z.array(z.uuid())).optional(),
    precioMinimo: z.coerce.number().nonnegative().optional(),
    precioMaximo: z.coerce.number().nonnegative().optional(),
    distanciaMaximaKm: z.coerce.number().positive().optional(),
    valoracionMinima: z.coerce.number().min(1).max(5).optional(),
    soloFavoritos: casillaEnQuerySchema.optional(),
    lat: latitudSchema.optional(),
    lng: longitudSchema.optional(),
    pagina: z.coerce.number().int().min(1).default(1),
  })
  /**
   * Media coordenada no ubica nada. Sin este refine, un `lat` sin `lng`
   * pasaria la validacion y el servicio tendria que decidir en silencio si lo
   * ignora o si falla.
   */
  .refine(
    (filtros) => (filtros.lat === undefined) === (filtros.lng === undefined),
    {
      message: 'Faltan las coordenadas para calcular la cercanía.',
      path: ['lat'],
    },
  );

// ---------------------------------------------------------------------------
// Piezas compartidas de las respuestas
// ---------------------------------------------------------------------------

/**
 * Identidad publica de un cocinero, tal como la muestran la tarjeta del feed,
 * el detalle del plato y la cabecera del carrito.
 *
 * `apellido` viaja aparte y no concatenado: la tarjeta del feed muestra el
 * nombre completo pero el avatar con iniciales necesita las dos partes por
 * separado, y partir un string por el espacio falla con nombres compuestos.
 */
const cocineroResumenSchema = z.object({
  id: z.uuid(),
  nombre: z.string(),
  apellido: z.string(),
  fotoPerfilUrl: z.url().nullable(),
});

/**
 * Promedio de las resenas VISIBLE. `null` -y no 0- cuando todavia no hay
 * ninguna: US-EXP-04 exige mostrar "Sin calificaciones aun" en ese caso, y un
 * 0 se leeria como la peor calificacion posible.
 */
const valoracionSchema = z.number().nullable();

/**
 * Datos minimos de un plato que la interfaz necesita para dibujar una tarjeta:
 * los comparten el feed, el listado del perfil del cocinero y la pestana de
 * publicaciones favoritas.
 *
 * `categoria` va completa -y no solo su nombre- porque su
 * `imagenPredeterminadaUrl` es el fallback cuando el plato no tiene foto propia,
 * igual que en el modulo de Publicaciones.
 */
const publicacionResumenSchema = z.object({
  id: z.uuid(),
  nombre: z.string(),
  precio: z.string(),
  imagenUrl: z.url().nullable(),
  estadoPublicacion: z.enum(ESTADO_PUBLICACION),
  categoria: categoriaResumenSchema,
});

// ---------------------------------------------------------------------------
// US-EXP-01 - Feed
// ---------------------------------------------------------------------------

/**
 * Tarjeta del feed. El segundo criterio de US-EXP-01 enumera exactamente lo que
 * muestra: "imagen del plato, nombre, precio, nombre del cocinero, distancia
 * aproximada y estado de disponibilidad".
 *
 * `distanciaKm` es `null` cuando el cliente no comparte su ubicacion. La
 * tarjeta oculta la linea de distancia en ese caso; no la reemplaza por un 0,
 * que afirmaria que el plato esta a la vuelta de la esquina.
 */
export const publicacionFeedSchema = publicacionResumenSchema.extend({
  cocinero: cocineroResumenSchema,
  distanciaKm: z.number().nullable(),
});

/**
 * Pagina del feed. Incluye `hayMas` en vez de dejar que el cliente lo deduzca
 * de `total`: el scroll infinito solo necesita saber si pedir la pagina
 * siguiente, y calcularlo del lado del servidor evita que la app repita la
 * cuenta con un `total` que pudo cambiar entre paginas.
 */
export const paginaFeedSchema = z.object({
  datos: z.array(publicacionFeedSchema),
  pagina: z.number().int().min(1),
  porPagina: z.number().int().min(1),
  hayMas: z.boolean(),
});

// ---------------------------------------------------------------------------
// US-EXP-02 - Mapa
// ---------------------------------------------------------------------------

/**
 * Marcador del mapa y contenido de su tarjeta emergente. El segundo criterio de
 * US-EXP-02 la define: "foto de perfil del cocinero, nombre, valoracion
 * promedio y cantidad de platos disponibles en ese momento".
 *
 * El agrupamiento por zoom (clustering) NO se resuelve aca: el backend devuelve
 * un marcador por cocinero y la app los agrupa, porque el criterio depende del
 * nivel de zoom, que es estado de la vista.
 */
export const cocineroMapaSchema = cocineroResumenSchema.extend({
  lat: z.number(),
  lng: z.number(),
  valoracionPromedio: valoracionSchema,
  platosDisponibles: z.number().int().min(0),
});

// ---------------------------------------------------------------------------
// US-EXP-04 - Perfil publico del cocinero
// ---------------------------------------------------------------------------

/**
 * Perfil publico. El primer criterio de US-EXP-04 lo enumera: "foto de perfil,
 * nombre completo, descripcion, ubicacion, valoracion promedio con cantidad de
 * resenas y listado de publicaciones activas".
 *
 * "Ubicacion" se expresa como el punto del cocinero mas la distancia al
 * cliente: el modelo no guarda direccion ni localidad -la tabla `ciudad` se
 * elimino en la migracion 0001 por estar fuera de alcance-, asi que lo unico
 * que se puede mostrar con honestidad es el punto en un mapa y a que distancia
 * queda.
 */
export const cocineroPublicoSchema = cocineroResumenSchema.extend({
  descripcionPublica: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  distanciaKm: z.number().nullable(),
  valoracionPromedio: valoracionSchema,
  cantidadResenas: z.number().int().min(0),
  esFavorito: z.boolean(),
  publicaciones: z.array(publicacionResumenSchema),
});

// ---------------------------------------------------------------------------
// US-EXP-05 - Detalle de la publicacion
// ---------------------------------------------------------------------------

/**
 * Detalle publico de un plato. El primer criterio de US-EXP-05 lo enumera:
 * "imagen del plato, nombre, descripcion completa, precio, categoria, tiempo
 * estimado de preparacion, estado de disponibilidad con color diferenciado,
 * nombre del cocinero con enlace a su perfil y valoracion promedio del plato".
 *
 * A diferencia del feed, este endpoint NO filtra por estado: el tercer criterio
 * exige poder abrir un plato "No disponible" y encontrar el boton de agregar
 * deshabilitado con la indicacion correspondiente.
 */
export const publicacionPublicaSchema = publicacionResumenSchema.extend({
  descripcion: z.string(),
  tiempoEstimadoPreparacion: z.number().int().nullable(),
  cocinero: cocineroResumenSchema,
  valoracionPromedio: valoracionSchema,
  cantidadResenas: z.number().int().min(0),
  esFavorito: z.boolean(),
});

// ---------------------------------------------------------------------------
// US-EXP-06 - Favoritos
// ---------------------------------------------------------------------------

/**
 * Elemento de las dos pestanas de "Mis favoritos". El tercer criterio de
 * US-EXP-06 fija las columnas: "Cada elemento muestra imagen, nombre y su
 * valoracion promedio".
 */
export const cocineroFavoritoSchema = cocineroResumenSchema.extend({
  valoracionPromedio: valoracionSchema,
});

export const publicacionFavoritaSchema = publicacionResumenSchema.extend({
  valoracionPromedio: valoracionSchema,
});

/**
 * Las dos pestanas en una sola respuesta.
 *
 * Un endpoint y no dos: la pantalla dibuja las dos pestanas desde el primer
 * render y partirlo obligaria a una segunda vuelta a la red al cambiar de
 * pestana, para dos listas que no crecen como un feed.
 */
export const favoritosSchema = z.object({
  cocineros: z.array(cocineroFavoritoSchema),
  publicaciones: z.array(publicacionFavoritaSchema),
});

/**
 * Respuesta del alta y la baja de un favorito. Devuelve el estado resultante en
 * vez de un 204 vacio: la interfaz actualiza el icono de forma optimista y
 * necesita algo contra lo que confirmar o revertir.
 */
export const favoritoRespuestaSchema = z.object({
  esFavorito: z.boolean(),
});

// ---------------------------------------------------------------------------
// US-EXP-07 - Carrito
// ---------------------------------------------------------------------------

/**
 * Tope de unidades por plato en el carrito.
 *
 * Es el mismo que `itemPedidoInputSchema` impone por plato en el pedido: si el
 * carrito admitiera mas, el cliente podria armarlo y recien enterarse al
 * confirmar, cuando el pedido lo rechace.
 *
 * Se exporta como constante -y el mensaje con ella- porque el tope se verifica
 * en dos lugares: este schema, cuando el cliente escribe una cantidad, y el
 * servicio del carrito, cuando el boton "+" o un segundo "Agregar al carrito"
 * intentan pasarse del limite sin que ninguna cantidad viaje en el body.
 */
export const CANTIDAD_MAXIMA_POR_PLATO = 20;

export const MENSAJE_CANTIDAD_MAXIMA = `La cantidad máxima por plato es ${String(CANTIDAD_MAXIMA_POR_PLATO)}.`;

/** Cantidad de un item del carrito. */
export const cantidadItemSchema = z
  .number()
  .int('La cantidad debe ser un número entero.')
  .min(1, 'La cantidad mínima es 1.')
  .max(CANTIDAD_MAXIMA_POR_PLATO, MENSAJE_CANTIDAD_MAXIMA);

/**
 * Item del carrito. Los campos de nombre, precio e imagen salen del SNAPSHOT de
 * `item_carrito`, no de la publicacion vigente: si el cocinero edita el plato
 * mientras esta en el carrito, el cliente sigue viendo lo que agrego.
 *
 * `tiempoEstimadoPreparacion` si sale de la publicacion vigente -no hay
 * snapshot de ese campo- y alimenta la referencia "Listo en 25-30 min" del
 * primer criterio de US-EXP-07.
 */
export const itemCarritoSchema = z.object({
  id: z.uuid(),
  publicacionId: z.uuid(),
  nombre: z.string(),
  precioUnitario: z.string(),
  cantidad: z.number().int().min(1),
  imagenUrl: z.url().nullable(),
  tiempoEstimadoPreparacion: z.number().int().nullable(),
});

/**
 * El carrito completo.
 *
 * `null` cuando el cliente no tiene ninguno: el estado vacio de PAN-PED-01.1 es
 * una pantalla propia, no un carrito con cero items, y distinguirlos en el
 * contrato evita que la interfaz tenga que adivinar.
 */
export const carritoSchema = z.object({
  id: z.uuid(),
  cocinero: cocineroResumenSchema.extend({
    valoracionPromedio: valoracionSchema,
  }),
  items: z.array(itemCarritoSchema),

  /** Suma de `precioUnitario * cantidad`, calculada en la base como `numeric`. */
  total: z.string(),

  /**
   * Rango del tiempo estimado, en minutos, o `null` si ningun plato del carrito
   * lo declara (`tiempo_estimado_preparacion` es opcional en US-PUB-01). Con un
   * solo valor distinto, minimo y maximo coinciden y la interfaz muestra un
   * numero en lugar de un rango.
   */
  tiempoEstimadoMinimo: z.number().int().nullable(),
  tiempoEstimadoMaximo: z.number().int().nullable(),
});

/**
 * Respuesta de cualquier lectura o escritura del carrito.
 *
 * `itemsQuitados` va ACA y no dentro de `carritoSchema` porque la depuracion
 * puede dejar el carrito vacio, y en ese caso el carrito deja de existir
 * (`carrito` es `null`) pero el aviso todavia tiene que llegar a la pantalla:
 * el ultimo criterio de US-EXP-07 pide mostrar la advertencia Y el estado
 * vacio, no una en lugar de la otra.
 *
 * Son los NOMBRES de los platos que se quitaron solos en esta operacion por
 * haber pasado a "No disponible" o por haber sido dados de baja. Vacio en el
 * caso normal.
 */
export const carritoRespuestaSchema = z.object({
  carrito: carritoSchema.nullable(),
  itemsQuitados: z.array(z.string()),
});

/**
 * Alta de un plato en el carrito (cuarto criterio de US-EXP-05).
 *
 * `reemplazarCarrito` implementa el dialogo "Tu carrito tiene platos de otro
 * cocinero. Queres vaciarlo y comenzar uno nuevo?": la app manda el POST sin la
 * bandera, el servicio responde 409 `CARRITO_DE_OTRO_COCINERO` si corresponde,
 * y solo si el cliente confirma se repite el POST con la bandera en `true`. Asi
 * el servidor nunca destruye un carrito sin que el cliente lo haya aceptado, ni
 * siquiera si la app tuviera un bug.
 */
export const agregarAlCarritoSchema = z.object({
  publicacionId: z.uuid('El identificador de publicación no es válido.'),
  reemplazarCarrito: z.boolean().default(false),
});

/**
 * Respuesta del alta. `cantidadActual` alimenta el literal "Cantidad
 * actualizada en tu carrito. Cantidad actual [nro]." del quinto criterio de
 * US-EXP-05, y `eraNuevoItem` decide si ese mensaje corresponde o si el plato
 * se agrego por primera vez.
 */
export const agregarAlCarritoRespuestaSchema = carritoRespuestaSchema.extend({
  carrito: carritoSchema,
  cantidadActual: z.number().int().min(1),
  eraNuevoItem: z.boolean(),
});

export const cambiarCantidadItemSchema = z.object({
  cantidad: cantidadItemSchema,
});

export type CoordenadasOpcionales = z.infer<typeof coordenadasOpcionalesSchema>;
export type ZonaVisible = z.infer<typeof zonaVisibleSchema>;
export type FiltrosFeed = z.infer<typeof filtrosFeedSchema>;
export type PublicacionFeed = z.infer<typeof publicacionFeedSchema>;
export type PaginaFeed = z.infer<typeof paginaFeedSchema>;
export type CocineroMapa = z.infer<typeof cocineroMapaSchema>;
export type CocineroPublico = z.infer<typeof cocineroPublicoSchema>;
export type PublicacionPublica = z.infer<typeof publicacionPublicaSchema>;
export type CocineroFavorito = z.infer<typeof cocineroFavoritoSchema>;
export type PublicacionFavorita = z.infer<typeof publicacionFavoritaSchema>;
export type Favoritos = z.infer<typeof favoritosSchema>;
export type FavoritoRespuesta = z.infer<typeof favoritoRespuestaSchema>;
export type ItemCarrito = z.infer<typeof itemCarritoSchema>;
export type Carrito = z.infer<typeof carritoSchema>;
export type CarritoRespuesta = z.infer<typeof carritoRespuestaSchema>;
export type AgregarAlCarritoInput = z.infer<typeof agregarAlCarritoSchema>;
export type AgregarAlCarritoRespuesta = z.infer<
  typeof agregarAlCarritoRespuestaSchema
>;
export type CambiarCantidadItemInput = z.infer<
  typeof cambiarCantidadItemSchema
>;
