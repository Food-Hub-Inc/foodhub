import type {
  CapituloAyudaListado,
  CrearCapituloAyudaInput,
  CrearFaqAdminInput,
  EditarCapituloAyudaInput,
  EditarFaqAdminInput,
  EstadoHabilitacionAyuda,
  FaqAdminListado,
  PaginaCapitulosAyuda,
  PaginaFaqsAdmin,
  RolDestinoAyuda,
} from '@foodhub/shared';
import { api } from '../lib/api.js';

/**
 * Superficie de `/ayuda` para el panel — US-AYU-05.
 *
 * Dos recursos con el mismo ciclo de vida (listar, crear, editar y baja
 * logica): el manual de usuario (capitulos) y las preguntas frecuentes.
 */

// ---------------------------------------------------------------------------
// Manual de usuario
// ---------------------------------------------------------------------------

export interface FiltrosManual {
  rolDestino: RolDestinoAyuda | null;
  estado: EstadoHabilitacionAyuda | null;
  pagina: number;
  porPagina: number;
}

export const FILTROS_MANUAL_INICIALES: FiltrosManual = {
  rolDestino: null,
  estado: null,
  pagina: 1,
  porPagina: 20,
};

export function hayFiltrosDeManual(filtros: FiltrosManual): boolean {
  return filtros.rolDestino !== null || filtros.estado !== null;
}

export function claveListadoCapitulos(filtros: FiltrosManual) {
  return ['ayuda-capitulos', filtros] as const;
}

export function listarCapitulos(
  filtros: FiltrosManual,
): Promise<PaginaCapitulosAyuda> {
  return api.obtener<PaginaCapitulosAyuda>('/ayuda/capitulos', {
    rolDestino: filtros.rolDestino,
    estado: filtros.estado,
    pagina: filtros.pagina,
    porPagina: filtros.porPagina,
  });
}

export function claveCapitulo(id: string) {
  return ['ayuda-capitulo', id] as const;
}

/** US-AYU-05 - Un capítulo puntual, para la página de edición. */
export function obtenerCapitulo(id: string): Promise<CapituloAyudaListado> {
  return api.obtener<CapituloAyudaListado>(`/ayuda/capitulos/${id}`);
}

export function crearCapitulo(
  datos: CrearCapituloAyudaInput,
): Promise<CapituloAyudaListado> {
  return api.enviar<CapituloAyudaListado>('/ayuda/capitulos', datos);
}

export function editarCapitulo(
  id: string,
  datos: EditarCapituloAyudaInput,
): Promise<{ mensaje: string }> {
  return api.modificar<{ mensaje: string }>(`/ayuda/capitulos/${id}`, datos);
}

export function habilitarCapitulo(id: string): Promise<{ mensaje: string }> {
  return api.enviar<{ mensaje: string }>(`/ayuda/capitulos/${id}/habilitacion`);
}

export function deshabilitarCapitulo(id: string): Promise<{ mensaje: string }> {
  return api.eliminar<{ mensaje: string }>(
    `/ayuda/capitulos/${id}/habilitacion`,
  );
}

// ---------------------------------------------------------------------------
// Preguntas frecuentes
// ---------------------------------------------------------------------------

export interface FiltrosFaqs {
  rolDestino: RolDestinoAyuda | null;
  categoria: string | null;
  estado: EstadoHabilitacionAyuda | null;
  pagina: number;
  porPagina: number;
}

export const FILTROS_FAQ_INICIALES: FiltrosFaqs = {
  rolDestino: null,
  categoria: null,
  estado: null,
  pagina: 1,
  porPagina: 20,
};

export function hayFiltrosDeFaqs(filtros: FiltrosFaqs): boolean {
  return (
    filtros.rolDestino !== null ||
    filtros.categoria !== null ||
    filtros.estado !== null
  );
}

export function claveListadoFaqs(filtros: FiltrosFaqs) {
  return ['ayuda-faqs', filtros] as const;
}

export function listarFaqs(filtros: FiltrosFaqs): Promise<PaginaFaqsAdmin> {
  return api.obtener<PaginaFaqsAdmin>('/ayuda/faqs', {
    rolDestino: filtros.rolDestino,
    categoria: filtros.categoria,
    estado: filtros.estado,
    pagina: filtros.pagina,
    porPagina: filtros.porPagina,
  });
}

export function crearFaq(datos: CrearFaqAdminInput): Promise<FaqAdminListado> {
  return api.enviar<FaqAdminListado>('/ayuda/faqs', datos);
}

export function editarFaq(
  id: string,
  datos: EditarFaqAdminInput,
): Promise<{ mensaje: string }> {
  return api.modificar<{ mensaje: string }>(`/ayuda/faqs/${id}`, datos);
}

export function habilitarFaq(id: string): Promise<{ mensaje: string }> {
  return api.enviar<{ mensaje: string }>(`/ayuda/faqs/${id}/habilitacion`);
}

export function deshabilitarFaq(id: string): Promise<{ mensaje: string }> {
  return api.eliminar<{ mensaje: string }>(`/ayuda/faqs/${id}/habilitacion`);
}
