import type {
  CrearUsuarioPanelInput,
  EditarUsuarioPanelInput,
  EstadoCuenta,
  PaginaUsuarios,
  PerfilUsuario,
  SuspenderUsuarioInput,
  TipoUsuario,
} from '@foodhub/shared';
import { api } from '../lib/api.js';

/**
 * Superficie de `/usuarios` para el panel de administración — US-GURP-05 a
 * US-GURP-09, pantalla PAN-ADM-01.
 *
 * Este módulo solo traduce filtros a query string y datos a body: no decide
 * nada. Las reglas (quién puede cambiar de rol, que quede un administrador
 * activo) las aplica el servidor, que es lo único que no se puede saltear.
 */

/** Filtros de PAN-ADM-01, tal como los expone la barra de la pantalla. */
export interface FiltrosListado {
  busqueda: string;
  tipo: TipoUsuario | null;
  estadoCuenta: EstadoCuenta | null;
  pagina: number;
  porPagina: number;
}

export const FILTROS_INICIALES: FiltrosListado = {
  busqueda: '',
  tipo: null,
  estadoCuenta: null,
  pagina: 1,
  porPagina: 20,
};

/** ¿Hay algún filtro puesto? Determina qué estado vacío corresponde mostrar. */
export function hayFiltrosAplicados(filtros: FiltrosListado): boolean {
  return (
    filtros.busqueda.trim() !== '' ||
    filtros.tipo !== null ||
    filtros.estadoCuenta !== null
  );
}

export function claveListadoUsuarios(filtros: FiltrosListado) {
  return ['usuarios', filtros] as const;
}

export function listarUsuarios(
  filtros: FiltrosListado,
): Promise<PaginaUsuarios> {
  return api.obtener<PaginaUsuarios>('/usuarios', {
    busqueda: filtros.busqueda.trim() || undefined,
    tipo: filtros.tipo,
    estadoCuenta: filtros.estadoCuenta,
    pagina: filtros.pagina,
    porPagina: filtros.porPagina,
  });
}

/** US-GURP-06 · Alta por invitación: la API llama a `inviteUserByEmail`. */
export function crearUsuario(
  datos: CrearUsuarioPanelInput,
): Promise<PerfilUsuario> {
  return api.enviar<PerfilUsuario>('/usuarios', datos);
}

/** US-GURP-07 · Edición de datos administrativos y rol. */
export function editarUsuario(
  id: string,
  datos: EditarUsuarioPanelInput,
): Promise<PerfilUsuario> {
  return api.modificar<PerfilUsuario>(`/usuarios/${id}`, datos);
}

/** US-GURP-08 · Suspensión con motivo obligatorio. */
export function suspenderUsuario(
  id: string,
  datos: SuspenderUsuarioInput,
): Promise<PerfilUsuario> {
  return api.enviar<PerfilUsuario>(`/usuarios/${id}/suspension`, datos);
}

/** US-GURP-08 · Levantamiento de la suspensión. */
export function rehabilitarUsuario(id: string): Promise<PerfilUsuario> {
  return api.eliminar<PerfilUsuario>(`/usuarios/${id}/suspension`);
}

/**
 * US-GURP-09 · Baja lógica.
 *
 * Manda `confirmacion: true` en el cuerpo porque así lo exige
 * `eliminarUsuarioPanelSchema`: una baja irreversible no puede dispararse por
 * un reintento automático del cliente ni por una request accidental.
 */
export function eliminarUsuario(id: string): Promise<void> {
  return api.eliminar<void>(`/usuarios/${id}`, { confirmacion: true });
}
