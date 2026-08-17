import type {
  CrearMotivoCancelacionInput,
  EditarMotivoCancelacionInput,
  EstadoHabilitacionMotivo,
  PaginaMotivosCancelacion,
  TipoUsuarioCancelacion,
} from '@foodhub/shared';
import { api } from '../lib/api.js';

/**
 * Superficie de `/configuracion/motivos-cancelacion` para el panel —
 * US-CFG-02, pantalla PAN-ADM-04.
 */

export interface FiltrosListado {
  aplicableA: TipoUsuarioCancelacion | null;
  estado: EstadoHabilitacionMotivo | null;
  pagina: number;
  porPagina: number;
}

export const FILTROS_INICIALES: FiltrosListado = {
  aplicableA: null,
  estado: null,
  pagina: 1,
  porPagina: 20,
};

export function hayFiltrosAplicados(filtros: FiltrosListado): boolean {
  return filtros.aplicableA !== null || filtros.estado !== null;
}

export function claveListadoMotivos(filtros: FiltrosListado) {
  return ['motivos-cancelacion', filtros] as const;
}

export function listarMotivosCancelacion(
  filtros: FiltrosListado,
): Promise<PaginaMotivosCancelacion> {
  return api.obtener<PaginaMotivosCancelacion>(
    '/configuracion/motivos-cancelacion',
    {
      aplicableA: filtros.aplicableA,
      estado: filtros.estado,
      pagina: filtros.pagina,
      porPagina: filtros.porPagina,
    },
  );
}

export function crearMotivoCancelacion(
  datos: CrearMotivoCancelacionInput,
): Promise<{ id: string }> {
  return api.enviar<{ id: string }>(
    '/configuracion/motivos-cancelacion',
    datos,
  );
}

export function editarMotivoCancelacion(
  id: string,
  datos: EditarMotivoCancelacionInput,
): Promise<{ mensaje: string }> {
  return api.modificar<{ mensaje: string }>(
    `/configuracion/motivos-cancelacion/${id}`,
    datos,
  );
}

export function habilitarMotivoCancelacion(
  id: string,
): Promise<{ mensaje: string }> {
  return api.enviar<{ mensaje: string }>(
    `/configuracion/motivos-cancelacion/${id}/habilitacion`,
  );
}

export function deshabilitarMotivoCancelacion(
  id: string,
): Promise<{ mensaje: string }> {
  return api.eliminar<{ mensaje: string }>(
    `/configuracion/motivos-cancelacion/${id}/habilitacion`,
  );
}
