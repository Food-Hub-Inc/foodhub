import type {
  SolicitarUrlDeCargaCategoriaInput,
  UrlDeCarga,
} from '@foodhub/shared';
import { api } from '../lib/api.js';

/**
 * Superficie de `/almacenamiento` que necesita el panel — hoy, únicamente la
 * imagen de categoría (US-CFG-01). El resto del módulo (foto de perfil) es
 * exclusivo de la app móvil.
 */

/** Alta: la categoría todavía no tiene id. */
export function solicitarUrlDeCargaDeImagenCategoria(
  datos: SolicitarUrlDeCargaCategoriaInput,
): Promise<UrlDeCarga> {
  return api.enviar<UrlDeCarga>('/almacenamiento/imagen-categoria', datos);
}

/** Edición: reemplaza la imagen de una categoría existente. */
export function solicitarUrlDeCargaDeImagenCategoriaExistente(
  categoriaId: string,
  datos: SolicitarUrlDeCargaCategoriaInput,
): Promise<UrlDeCarga> {
  return api.enviar<UrlDeCarga>(
    `/almacenamiento/imagen-categoria/${categoriaId}`,
    datos,
  );
}

/** US-CFG-03 - Logo de la plataforma (Información institucional). */
export function solicitarUrlDeCargaDeLogoPlataforma(
  datos: SolicitarUrlDeCargaCategoriaInput,
): Promise<UrlDeCarga> {
  return api.enviar<UrlDeCarga>('/almacenamiento/logo-plataforma', datos);
}
