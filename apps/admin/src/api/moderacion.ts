import type { PaginaReportes } from '@foodhub/shared';
import { api } from '../lib/api.js';

/**
 * Superficie de `/moderacion` — US-RES-06 y RF086, pantalla PAN-ADM-02.
 *
 * LO QUE SE LISTA SON REPORTES AGRUPADOS POR RESEÑA, no reseñas ni denuncias
 * sueltas. El requisito pide mostrar "la cantidad de reportes acumulados, los
 * motivos seleccionados y los detalles adicionales aportados": una fila por
 * reseña con todo lo que dijeron quienes la denunciaron.
 */

export function obtenerReportesPendientes(entrada: {
  pagina: number;
  porPagina: number;
}): Promise<PaginaReportes> {
  return api.obtener<PaginaReportes>('/moderacion/reportes', {
    pagina: entrada.pagina,
    porPagina: entrada.porPagina,
  });
}

/**
 * Aprueba o rechaza TODOS los reportes pendientes de una reseña.
 *
 * `aprobar` decide las dos ramas de RF086: aprobado oculta la reseña y la saca
 * de los promedios; rechazado la deja visible. La resolución es por reseña y no
 * por denuncia porque aprobar una y rechazar otra sobre la misma reseña no
 * significaría nada.
 */
export function resolverReporte(entrada: {
  resenaId: string;
  aprobar: boolean;
}): Promise<void> {
  return api.enviar<void>(
    `/moderacion/reportes/${entrada.resenaId}/resolucion`,
    { aprobar: entrada.aprobar },
  );
}
