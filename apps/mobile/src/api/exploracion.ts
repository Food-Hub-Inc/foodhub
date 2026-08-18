import type {
  CocineroMapa,
  CocineroPublico,
  FavoritoRespuesta,
  Favoritos,
  FiltrosFeed,
  PaginaFeed,
  PublicacionPublica,
  ZonaVisible,
} from '@foodhub/shared';
import { api } from '../lib/api';

/**
 * Exploración y búsqueda — US-EXP-01 a US-EXP-06 · PAN-EXP-01 a PAN-EXP-05.
 *
 * Ninguna ruta recibe el id del cliente: la API lo saca de la sesión (ver
 * `exploracionRouter`), igual que `api/publicaciones.ts` con las rutas del
 * cocinero.
 *
 * Las coordenadas van como query params y son OPCIONALES. Si el cliente negó el
 * permiso de ubicación, simplemente no viajan y la API responde sin distancia y
 * ordenada por fecha; no hay una variante del endpoint por cada caso.
 */

/** Coordenadas del dispositivo, ya resueltas por `useUbicacionActual`. */
export interface Coordenadas {
  lat: number;
  lng: number;
}

/**
 * Traduce los filtros del feed a query string.
 *
 * `categoriaIds` viaja como CSV porque así lo espera `filtrosFeedSchema`
 * (`?categoriaIds=uuid1,uuid2`), y `soloFavoritos` como "true"/"false" literal:
 * el schema lo valida con un `z.enum` y no con `coerce`, porque `Boolean("false")`
 * es `true`.
 */
function aQueryString(filtros: FiltrosFeed): string {
  const parametros = new URLSearchParams();

  if (filtros.busqueda) parametros.set('busqueda', filtros.busqueda);
  if (filtros.categoriaIds && filtros.categoriaIds.length > 0) {
    parametros.set('categoriaIds', filtros.categoriaIds.join(','));
  }
  if (filtros.precioMinimo !== undefined) {
    parametros.set('precioMinimo', String(filtros.precioMinimo));
  }
  if (filtros.precioMaximo !== undefined) {
    parametros.set('precioMaximo', String(filtros.precioMaximo));
  }
  if (filtros.distanciaMaximaKm !== undefined) {
    parametros.set('distanciaMaximaKm', String(filtros.distanciaMaximaKm));
  }
  if (filtros.valoracionMinima !== undefined) {
    parametros.set('valoracionMinima', String(filtros.valoracionMinima));
  }
  if (filtros.soloFavoritos) parametros.set('soloFavoritos', 'true');
  if (filtros.lat !== undefined && filtros.lng !== undefined) {
    parametros.set('lat', String(filtros.lat));
    parametros.set('lng', String(filtros.lng));
  }
  parametros.set('pagina', String(filtros.pagina));

  return parametros.toString();
}

/** US-EXP-01 y US-EXP-03. Página del feed. */
export function listarFeed(filtros: FiltrosFeed): Promise<PaginaFeed> {
  return api.obtener<PaginaFeed>(`/exploracion/feed?${aQueryString(filtros)}`);
}

/** US-EXP-02. Cocineros con marcador en la zona visible del mapa. */
export function listarCocinerosDelMapa(
  zona: ZonaVisible,
): Promise<CocineroMapa[]> {
  const parametros = new URLSearchParams({
    latMin: String(zona.latMin),
    latMax: String(zona.latMax),
    lngMin: String(zona.lngMin),
    lngMax: String(zona.lngMax),
  });

  return api.obtener<CocineroMapa[]>(
    `/exploracion/cocineros/mapa?${parametros.toString()}`,
  );
}

/** US-EXP-04. Perfil público de un cocinero y sus platos activos. */
export function obtenerCocineroPublico(
  id: string,
  coordenadas: Coordenadas | null,
): Promise<CocineroPublico> {
  const parametros = new URLSearchParams(
    coordenadas
      ? { lat: String(coordenadas.lat), lng: String(coordenadas.lng) }
      : {},
  );
  const consulta = parametros.toString();

  return api.obtener<CocineroPublico>(
    `/exploracion/cocineros/${id}${consulta ? `?${consulta}` : ''}`,
  );
}

/** US-EXP-05. Detalle público de un plato. */
export function obtenerPublicacionPublica(
  id: string,
): Promise<PublicacionPublica> {
  return api.obtener<PublicacionPublica>(`/exploracion/publicaciones/${id}`);
}

/** US-EXP-06. Las dos pestañas de "Mis favoritos". */
export function obtenerFavoritos(): Promise<Favoritos> {
  return api.obtener<Favoritos>('/exploracion/favoritos');
}

/**
 * US-EXP-06. Alta y baja de favoritos.
 *
 * El alta es un PUT y no un POST: la operación es idempotente -el índice único
 * de la base lo garantiza-, así que un doble toque del corazón deja el mismo
 * estado en lugar de devolver un error que al usuario no le diría nada.
 */
export function marcarCocineroFavorito(id: string): Promise<FavoritoRespuesta> {
  return api.reemplazar<FavoritoRespuesta>(
    `/exploracion/favoritos/cocineros/${id}`,
  );
}

export function desmarcarCocineroFavorito(
  id: string,
): Promise<FavoritoRespuesta> {
  return api.eliminar<FavoritoRespuesta>(
    `/exploracion/favoritos/cocineros/${id}`,
  );
}

export function marcarPublicacionFavorita(
  id: string,
): Promise<FavoritoRespuesta> {
  return api.reemplazar<FavoritoRespuesta>(
    `/exploracion/favoritos/publicaciones/${id}`,
  );
}

export function desmarcarPublicacionFavorita(
  id: string,
): Promise<FavoritoRespuesta> {
  return api.eliminar<FavoritoRespuesta>(
    `/exploracion/favoritos/publicaciones/${id}`,
  );
}
