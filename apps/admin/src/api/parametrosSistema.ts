import type {
  ParametrosBusqueda,
  ParametrosInstitucionales,
  ParametrosPedidos,
  ParametrosResenas,
  ParametrosSistema,
} from '@foodhub/shared';
import { api } from '../lib/api.js';

/**
 * Superficie de `/configuracion/parametros` para el panel — US-CFG-03,
 * pantalla PAN-ADM-04.
 */

export const CLAVE_PARAMETROS_SISTEMA = ['parametros-sistema'] as const;

export function obtenerParametrosSistema(): Promise<ParametrosSistema> {
  return api.obtener<ParametrosSistema>('/configuracion/parametros');
}

export function actualizarParametrosBusqueda(
  datos: ParametrosBusqueda,
): Promise<ParametrosBusqueda> {
  return api.modificar<ParametrosBusqueda>(
    '/configuracion/parametros/busqueda',
    datos,
  );
}

export function restaurarParametrosBusqueda(): Promise<ParametrosBusqueda> {
  return api.enviar<ParametrosBusqueda>(
    '/configuracion/parametros/busqueda/restaurar',
  );
}

export function actualizarParametrosPedidos(
  datos: ParametrosPedidos,
): Promise<ParametrosPedidos> {
  return api.modificar<ParametrosPedidos>(
    '/configuracion/parametros/pedidos',
    datos,
  );
}

export function restaurarParametrosPedidos(): Promise<ParametrosPedidos> {
  return api.enviar<ParametrosPedidos>(
    '/configuracion/parametros/pedidos/restaurar',
  );
}

export function actualizarParametrosResenas(
  datos: ParametrosResenas,
): Promise<ParametrosResenas> {
  return api.modificar<ParametrosResenas>(
    '/configuracion/parametros/resenas',
    datos,
  );
}

export function restaurarParametrosResenas(): Promise<ParametrosResenas> {
  return api.enviar<ParametrosResenas>(
    '/configuracion/parametros/resenas/restaurar',
  );
}

export function actualizarParametrosInstitucionales(
  datos: ParametrosInstitucionales,
): Promise<ParametrosInstitucionales> {
  return api.modificar<ParametrosInstitucionales>(
    '/configuracion/parametros/institucional',
    datos,
  );
}

export function restaurarParametrosInstitucionales(): Promise<ParametrosInstitucionales> {
  return api.enviar<ParametrosInstitucionales>(
    '/configuracion/parametros/institucional/restaurar',
  );
}
