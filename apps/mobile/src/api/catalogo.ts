import type {
  CategoriaResumen,
  MotivoCancelacionRapido,
  TipoConsultaCatalogo,
} from '@foodhub/shared';
import { api } from '../lib/api';

/**
 * Tabla de referencia de categorías — módulo de Publicaciones (US-PUB-01,
 * desplegable de categoría; US-PUB-05, filtro y resolución de la imagen
 * predeterminada del plato).
 */

/** Categorías activas, sin paginación: es una tabla chica que gestiona el administrador. */
export function listarCategorias(): Promise<CategoriaResumen[]> {
  return api.obtener<CategoriaResumen[]>('/catalogo/categorias');
}

/**
 * Motivos rápidos de cancelación que aplican al rol de quien pide (US-CFG-02,
 * RF056).
 *
 * La API filtra por el rol de la sesión -"Cancelación por cocinero" o "Ambos"
 * para el cocinero, "Cancelación por cliente" o "Ambos" para el cliente-, así
 * que la app no manda ningún parámetro: el cocinero nunca ve el motivo "Ya no lo
 * necesito" ni el cliente "No tengo ingredientes".
 *
 * Los consumen el rechazo del cocinero (US-PED-04, PAN-PED-04.5) y la
 * cancelación del cliente (US-PED-09, PAN-PED-03.0.1).
 */
export function listarMotivosDeCancelacion(): Promise<
  MotivoCancelacionRapido[]
> {
  return api.obtener<MotivoCancelacionRapido[]>(
    '/catalogo/motivos-cancelacion',
  );
}

/**
 * US-AYU-03 - Tipos de consulta activos para el desplegable de "Contactar al
 * soporte" (PAN-AYU-03).
 *
 * La pantalla los cruza con `ETIQUETAS_TIPO_CONSULTA` para armar el orden y
 * mostrar solo los CUATRO valores literales del criterio, pero la lista que
 * devuelve la API puede traer mas si en algun momento el administrador
 * agrega un quinto. Asi el sistema sigue funcionando sin redeploy.
 */
export function listarTiposDeConsulta(): Promise<TipoConsultaCatalogo[]> {
  return api.obtener<TipoConsultaCatalogo[]>('/catalogo/tipos-consulta');
}
