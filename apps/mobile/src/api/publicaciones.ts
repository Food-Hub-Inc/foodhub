import type {
  CambiarDisponibilidadPublicacionRespuesta,
  CrearPublicacionInput,
  EditarPublicacionInput,
  EstadoPublicacion,
  FiltrosPublicacion,
  PaginaPublicaciones,
  PublicacionDetalle,
} from '@foodhub/shared';
import { api } from '../lib/api';

/**
 * Publicaciones propias del cocinero — módulo de Publicaciones
 * (US-PUB-01 a US-PUB-05) · PAN-PUB-01.
 *
 * Ninguna ruta recibe el id del cocinero: la API lo saca de la sesión (ver
 * `publicacionesRouter`), igual que `api/perfil.ts` con `/usuarios/yo`.
 */

/**
 * Traduce los filtros a query string. `categoriaIds` y `estados` viajan como
 * CSV porque así los espera `filtrosPublicacionSchema` del lado de la API
 * (`?categoriaIds=uuid1,uuid2`).
 */
function aQueryString(filtros: FiltrosPublicacion): string {
  const parametros = new URLSearchParams();

  if (filtros.busqueda) parametros.set('busqueda', filtros.busqueda);
  if (filtros.categoriaIds && filtros.categoriaIds.length > 0) {
    parametros.set('categoriaIds', filtros.categoriaIds.join(','));
  }
  if (filtros.estados && filtros.estados.length > 0) {
    parametros.set('estados', filtros.estados.join(','));
  }
  if (filtros.precioMinimo !== undefined) {
    parametros.set('precioMinimo', String(filtros.precioMinimo));
  }
  if (filtros.precioMaximo !== undefined) {
    parametros.set('precioMaximo', String(filtros.precioMaximo));
  }
  parametros.set('orden', filtros.orden);
  parametros.set('pagina', String(filtros.pagina));

  return parametros.toString();
}

/** US-PUB-05. Listado paginado y filtrado de "Mis publicaciones". */
export function listarMisPublicaciones(
  filtros: FiltrosPublicacion,
): Promise<PaginaPublicaciones> {
  return api.obtener<PaginaPublicaciones>(
    `/publicaciones?${aQueryString(filtros)}`,
  );
}

/** US-PUB-05. Detalle de una publicación propia. */
export function obtenerMiPublicacion(id: string): Promise<PublicacionDetalle> {
  return api.obtener<PublicacionDetalle>(`/publicaciones/${id}`);
}

/** US-PUB-01. Alta de una publicación. */
export function crearPublicacion(
  datos: CrearPublicacionInput,
): Promise<PublicacionDetalle> {
  return api.enviar<PublicacionDetalle>('/publicaciones', datos);
}

/**
 * US-PUB-04. Cambio de disponibilidad. Ruta propia (no el PATCH general de
 * edición): el criterio de aceptación exige que se aplique sin modal de
 * confirmación.
 */
export function cambiarDisponibilidad(
  id: string,
  estadoPublicacion: EstadoPublicacion,
): Promise<CambiarDisponibilidadPublicacionRespuesta> {
  return api.modificar<CambiarDisponibilidadPublicacionRespuesta>(
    `/publicaciones/${id}/disponibilidad`,
    { estadoPublicacion },
  );
}

/** US-PUB-02. Edición parcial de una publicación propia. */
export function editarPublicacion(
  id: string,
  datos: EditarPublicacionInput,
): Promise<PublicacionDetalle> {
  return api.modificar<PublicacionDetalle>(`/publicaciones/${id}`, datos);
}
