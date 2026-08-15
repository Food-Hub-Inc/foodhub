import type {
  OperacionAuditoria,
  PaginaAuditoria,
  PaginaEventoSeguridad,
  TipoEventoSeguridad,
} from '@foodhub/shared';
import { api, type ParametrosConsulta } from '../lib/api.js';
import { finDelDiaISO, inicioDelDiaISO } from '../lib/formato.js';

/**
 * Superficie de `/auditoria` — US-AUD-01 y US-AUD-02, pantalla PAN-AUD-01.
 *
 * Las dos solapas comparten los filtros de fecha, IP, identificador de usuario
 * y paginación; se diferencian en el filtro propio de cada tabla (operación de
 * negocio contra tipo de evento de seguridad) y en el correo intentado, que
 * solo existe en un login fallido, donde todavía no hay usuario asociado.
 */

/** Parte común de los filtros de las dos solapas. */
interface FiltrosComunes {
  /** `YYYY-MM-DD` tal como lo entrega un `<input type="date">`. */
  desde: string;
  hasta: string;
  ipOrigen: string;
  usuarioId: string;
  pagina: number;
  porPagina: number;
}

export interface FiltrosOperaciones extends FiltrosComunes {
  operacion: OperacionAuditoria | null;
}

export interface FiltrosSeguridad extends FiltrosComunes {
  tipoEvento: TipoEventoSeguridad | null;
  emailIntentado: string;
}

const COMUNES_INICIALES: FiltrosComunes = {
  desde: '',
  hasta: '',
  ipOrigen: '',
  usuarioId: '',
  pagina: 1,
  // US-AUD-02 admite 20 o 50, nada más. El valor por defecto del schema es 20.
  porPagina: 20,
};

export const FILTROS_OPERACIONES_INICIALES: FiltrosOperaciones = {
  ...COMUNES_INICIALES,
  operacion: null,
};

export const FILTROS_SEGURIDAD_INICIALES: FiltrosSeguridad = {
  ...COMUNES_INICIALES,
  tipoEvento: null,
  emailIntentado: '',
};

/**
 * `filtrosAuditoriaSchema` valida el identificador con `z.uuid()`: un valor
 * parcial hace que la API responda 400 y el administrador vería un error rojo
 * mientras todavía está escribiendo. Se manda solo cuando está completo.
 */
const FORMATO_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function esUuid(valor: string): boolean {
  return FORMATO_UUID.test(valor.trim());
}

/** El rango con las dos puntas cargadas y al revés no devuelve nada: se avisa antes de consultar. */
export function rangoEsInvalido(desde: string, hasta: string): boolean {
  return desde !== '' && hasta !== '' && desde > hasta;
}

function comunesAConsulta(filtros: FiltrosComunes): ParametrosConsulta {
  return {
    desde: filtros.desde ? inicioDelDiaISO(filtros.desde) : undefined,
    hasta: filtros.hasta ? finDelDiaISO(filtros.hasta) : undefined,
    ipOrigen: filtros.ipOrigen.trim() || undefined,
    usuarioId: esUuid(filtros.usuarioId) ? filtros.usuarioId.trim() : undefined,
    pagina: filtros.pagina,
    porPagina: filtros.porPagina,
  };
}

export function consultaOperaciones(
  filtros: FiltrosOperaciones,
): ParametrosConsulta {
  return { ...comunesAConsulta(filtros), operacion: filtros.operacion };
}

export function consultaSeguridad(
  filtros: FiltrosSeguridad,
): ParametrosConsulta {
  return {
    ...comunesAConsulta(filtros),
    tipoEvento: filtros.tipoEvento,
    emailIntentado: filtros.emailIntentado.trim() || undefined,
  };
}

/** ¿Hay algún filtro puesto? Decide si el estado vacío ofrece limpiarlos. */
export function hayFiltrosOperaciones(filtros: FiltrosOperaciones): boolean {
  return (
    filtros.desde !== '' ||
    filtros.hasta !== '' ||
    filtros.ipOrigen.trim() !== '' ||
    filtros.usuarioId.trim() !== '' ||
    filtros.operacion !== null
  );
}

export function hayFiltrosSeguridad(filtros: FiltrosSeguridad): boolean {
  return (
    filtros.desde !== '' ||
    filtros.hasta !== '' ||
    filtros.ipOrigen.trim() !== '' ||
    filtros.usuarioId.trim() !== '' ||
    filtros.tipoEvento !== null ||
    filtros.emailIntentado.trim() !== ''
  );
}

export function claveOperaciones(filtros: FiltrosOperaciones) {
  return ['auditoria', 'operaciones', filtros] as const;
}

export function claveSeguridad(filtros: FiltrosSeguridad) {
  return ['auditoria', 'seguridad', filtros] as const;
}

export function listarOperaciones(
  filtros: FiltrosOperaciones,
): Promise<PaginaAuditoria> {
  return api.obtener<PaginaAuditoria>(
    '/auditoria',
    consultaOperaciones(filtros),
  );
}

export function listarEventosSeguridad(
  filtros: FiltrosSeguridad,
): Promise<PaginaEventoSeguridad> {
  return api.obtener<PaginaEventoSeguridad>(
    '/auditoria/seguridad',
    consultaSeguridad(filtros),
  );
}

/**
 * Exportación a CSV con los MISMOS filtros que la tabla en pantalla.
 *
 * Se excluyen `pagina` y `porPagina`: el criterio de US-AUD-02 es exportar el
 * resultado del filtro, no la página que se está viendo. Un archivo que
 * contenga veinte de ochocientas filas es una fuente de confusión, no un
 * respaldo.
 */
export function exportarOperaciones(
  filtros: FiltrosOperaciones,
  nombreArchivo: string,
): Promise<void> {
  const {
    pagina: _pagina,
    porPagina: _porPagina,
    ...resto
  } = consultaOperaciones(filtros);
  return api.descargarCsv('/auditoria/exportar', nombreArchivo, resto);
}

export function exportarSeguridad(
  filtros: FiltrosSeguridad,
  nombreArchivo: string,
): Promise<void> {
  const {
    pagina: _pagina,
    porPagina: _porPagina,
    ...resto
  } = consultaSeguridad(filtros);
  return api.descargarCsv(
    '/auditoria/seguridad/exportar',
    nombreArchivo,
    resto,
  );
}
