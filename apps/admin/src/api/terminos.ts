import type {
  BorradorTerminos,
  EstadoTerminos,
  HistorialTerminos,
  TipoVersionTerminos,
  VersionCompleta,
  VersionVigenteTerminos,
} from '@foodhub/shared';
import { api } from '../lib/api.js';

/**
 * Superficie de `/configuracion/terminos/:tipo` para el panel — US-CFG-04,
 * pantalla PAN-ADM-04.
 */

export function claveEstadoTerminos(tipo: TipoVersionTerminos) {
  return ['terminos', tipo] as const;
}

export function obtenerEstadoTerminos(
  tipo: TipoVersionTerminos,
): Promise<EstadoTerminos> {
  return api.obtener<EstadoTerminos>(`/configuracion/terminos/${tipo}`);
}

export function listarHistorialTerminos(
  tipo: TipoVersionTerminos,
): Promise<HistorialTerminos> {
  return api.obtener<HistorialTerminos>(
    `/configuracion/terminos/${tipo}/historial`,
  );
}

export function obtenerVersionCompleta(
  tipo: TipoVersionTerminos,
  id: string,
): Promise<VersionCompleta> {
  return api.obtener<VersionCompleta>(
    `/configuracion/terminos/${tipo}/version/${id}`,
  );
}

export function guardarBorradorTerminos(
  tipo: TipoVersionTerminos,
  contenidoHtml: string,
): Promise<BorradorTerminos> {
  return api.enviar<BorradorTerminos>(
    `/configuracion/terminos/${tipo}/borrador`,
    { contenidoHtml },
  );
}

export function publicarVersionTerminos(
  tipo: TipoVersionTerminos,
  contenidoHtml: string,
): Promise<VersionVigenteTerminos> {
  return api.enviar<VersionVigenteTerminos>(
    `/configuracion/terminos/${tipo}/publicar`,
    { contenidoHtml },
  );
}
