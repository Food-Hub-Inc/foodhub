import { and, count, desc, eq, gte, ilike, lte, type SQL } from 'drizzle-orm';
import { eventoSeguridad, registroAuditoria, usuario } from '@foodhub/db';
import type {
  EventoSeguridad,
  FiltrosAuditoria,
  FiltrosEventoSeguridad,
  OperacionAuditoria,
  PaginaAuditoria,
  PaginaEventoSeguridad,
  RegistroAuditoria,
} from '@foodhub/shared';
import { db } from '../../lib/db.js';
import { logger } from '../../lib/logger.js';
import { generarCsv, type ColumnaCsv } from '../../lib/csv.js';

/**
 * Modulo de Auditoria y Trazabilidad (US-AUD-01, US-AUD-02 y RF097).
 *
 * Dos superficies con proposito distinto sobre dos tablas distintas:
 *
 *   registro_auditoria  operaciones de negocio (altas, bajas, modificaciones).
 *                       Lo escriben los demas servicios via registrarOperacion.
 *   evento_seguridad    login fallido y acceso denegado por rol.
 *
 * Ambas son append-only: el servicio nunca expone una actualizacion ni un
 * borrado. Un registro editable deja de ser evidencia.
 */

/**
 * Tope duro de la exportacion a CSV.
 *
 * La exportacion aplica los mismos filtros que la consulta paginada pero sin
 * paginar. Sin un limite, un administrador que exporta sin filtros con la
 * tabla ya crecida materializa millones de filas en memoria y tumba el proceso
 * de Railway, que corre con muy poca RAM.
 */
const MAXIMO_FILAS_EXPORTACION = 10_000;

// ---------------------------------------------------------------------------
// Escritura
// ---------------------------------------------------------------------------

export interface EntradaAuditoria {
  /** Quien ejecuto la operacion. Null cuando la origina el propio sistema. */
  usuarioId: string | null;
  operacion: OperacionAuditoria;
  /** Nombre de la entidad afectada: 'usuario', 'publicacion', 'pedido'... */
  tipoObjeto: string;
  objetoAfectadoId: string | null;
  ipOrigen: string | null;
  /**
   * Detalle estructurado que se muestra en el modal de PAN-AUD-01. NUNCA debe
   * contener credenciales: un cambio de contrasena se audita registrando que
   * ocurrio, no que valor tomo.
   */
  datosAdicionales?: Record<string, unknown>;
}

/**
 * Deja constancia de una operacion de negocio (RF097).
 *
 * Es deliberadamente "fire and forget", igual que `registrarAccesoDenegado` en
 * el middleware de RBAC: si la escritura falla se loguea el problema, pero no
 * se altera la respuesta al usuario. Un fallo del registro de auditoria no
 * puede convertir un 200 en un 500 ni revertir una operacion ya aplicada.
 *
 * Se invoca con `void registrarOperacion(...)` para que la respuesta no espere
 * a la escritura.
 */
export async function registrarOperacion(
  entrada: EntradaAuditoria,
): Promise<void> {
  try {
    await db.insert(registroAuditoria).values({
      usuarioId: entrada.usuarioId,
      operacion: entrada.operacion,
      tipoObjeto: entrada.tipoObjeto,
      objetoAfectadoId: entrada.objetoAfectadoId,
      ipOrigen: entrada.ipOrigen,
      datosAdicionales: entrada.datosAdicionales ?? null,
    });
  } catch (error) {
    logger.error(
      { err: error, operacion: entrada.operacion, tipo: entrada.tipoObjeto },
      'no se pudo registrar la operación en auditoría',
    );
  }
}

/**
 * US-AUD-01, segundo criterio - Intento de login fallido.
 *
 * El login va del cliente directo a GoTrue y nunca pasa por la API, asi que el
 * backend no puede observar el fallo por si mismo: es la app la que lo reporta.
 * La IP y la fecha las pone el servidor; si las informara el cliente, el
 * registro dejaria de ser evidencia.
 *
 * Fire and forget por el mismo motivo que registrarOperacion: es un reporte, no
 * una operacion de la que dependa quien lo envia.
 */
export async function registrarLoginFallido(entrada: {
  email: string;
  ipOrigen: string | null;
}): Promise<void> {
  try {
    await db.insert(eventoSeguridad).values({
      tipoEvento: 'LOGIN_FALLIDO',
      emailIntentado: entrada.email,
      ipOrigen: entrada.ipOrigen,
    });
  } catch (error) {
    logger.error({ err: error }, 'no se pudo registrar el login fallido');
  }
}

// ---------------------------------------------------------------------------
// Filtros
// ---------------------------------------------------------------------------

/**
 * Escapa los comodines de LIKE.
 *
 * El filtro de IP admite prefijos parciales ("190.192.") y el de correo admite
 * fragmentos, pero un `%` escrito por el usuario haria coincidir todo y le
 * mostraria un resultado que no pidio.
 */
function escaparLike(valor: string): string {
  return valor
    .replaceAll('\\', '\\\\')
    .replaceAll('%', '\\%')
    .replaceAll('_', '\\_');
}

function condicionesComunes(filtros: {
  desde?: string | undefined;
  hasta?: string | undefined;
  ipOrigen?: string | undefined;
  usuarioId?: string | undefined;
}): {
  desde?: Date;
  hasta?: Date;
  ipOrigen?: string;
  usuarioId?: string;
} {
  return {
    ...(filtros.desde ? { desde: new Date(filtros.desde) } : {}),
    ...(filtros.hasta ? { hasta: new Date(filtros.hasta) } : {}),
    ...(filtros.ipOrigen ? { ipOrigen: filtros.ipOrigen } : {}),
    ...(filtros.usuarioId ? { usuarioId: filtros.usuarioId } : {}),
  };
}

function armarFiltroAuditoria(filtros: FiltrosAuditoria): SQL | undefined {
  const comunes = condicionesComunes(filtros);
  const condiciones: SQL[] = [];

  if (comunes.desde) {
    condiciones.push(gte(registroAuditoria.fechaHora, comunes.desde));
  }
  if (comunes.hasta) {
    condiciones.push(lte(registroAuditoria.fechaHora, comunes.hasta));
  }
  if (filtros.operacion) {
    condiciones.push(eq(registroAuditoria.operacion, filtros.operacion));
  }
  if (comunes.ipOrigen) {
    condiciones.push(
      ilike(registroAuditoria.ipOrigen, `${escaparLike(comunes.ipOrigen)}%`),
    );
  }
  if (comunes.usuarioId) {
    condiciones.push(eq(registroAuditoria.usuarioId, comunes.usuarioId));
  }

  return condiciones.length > 0 ? and(...condiciones) : undefined;
}

function armarFiltroEventos(filtros: FiltrosEventoSeguridad): SQL | undefined {
  const comunes = condicionesComunes(filtros);
  const condiciones: SQL[] = [];

  if (comunes.desde) {
    condiciones.push(gte(eventoSeguridad.fechaHora, comunes.desde));
  }
  if (comunes.hasta) {
    condiciones.push(lte(eventoSeguridad.fechaHora, comunes.hasta));
  }
  if (filtros.tipoEvento) {
    condiciones.push(eq(eventoSeguridad.tipoEvento, filtros.tipoEvento));
  }
  if (filtros.emailIntentado) {
    condiciones.push(
      ilike(
        eventoSeguridad.emailIntentado,
        `%${escaparLike(filtros.emailIntentado)}%`,
      ),
    );
  }
  if (comunes.ipOrigen) {
    condiciones.push(
      ilike(eventoSeguridad.ipOrigen, `${escaparLike(comunes.ipOrigen)}%`),
    );
  }
  if (comunes.usuarioId) {
    condiciones.push(eq(eventoSeguridad.usuarioId, comunes.usuarioId));
  }

  return condiciones.length > 0 ? and(...condiciones) : undefined;
}

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

/**
 * `usuario_email` viaja resuelto desde el servidor, con un LEFT JOIN y no con
 * una consulta por fila: US-AUD-02 exige mostrar el correo en la tabla, y
 * resolverlo en el cliente seria una request por cada registro listado.
 *
 * El JOIN es LEFT porque la FK usa `on delete set null`: el registro de lo que
 * hizo una cuenta sobrevive a la eliminacion fisica de esa cuenta.
 */
function consultaAuditoria(filtro: SQL | undefined) {
  return db
    .select({
      id: registroAuditoria.id,
      fechaHora: registroAuditoria.fechaHora,
      usuarioId: registroAuditoria.usuarioId,
      usuarioEmail: usuario.email,
      operacion: registroAuditoria.operacion,
      tipoObjeto: registroAuditoria.tipoObjeto,
      objetoAfectadoId: registroAuditoria.objetoAfectadoId,
      ipOrigen: registroAuditoria.ipOrigen,
      datosAdicionales: registroAuditoria.datosAdicionales,
    })
    .from(registroAuditoria)
    .leftJoin(usuario, eq(usuario.id, registroAuditoria.usuarioId))
    .where(filtro)
    .orderBy(desc(registroAuditoria.fechaHora));
}

function consultaEventos(filtro: SQL | undefined) {
  return db
    .select({
      id: eventoSeguridad.id,
      fechaHora: eventoSeguridad.fechaHora,
      tipoEvento: eventoSeguridad.tipoEvento,
      emailIntentado: eventoSeguridad.emailIntentado,
      usuarioId: eventoSeguridad.usuarioId,
      recursoSolicitado: eventoSeguridad.recursoSolicitado,
      ipOrigen: eventoSeguridad.ipOrigen,
      motivo: eventoSeguridad.motivo,
    })
    .from(eventoSeguridad)
    .where(filtro)
    .orderBy(desc(eventoSeguridad.fechaHora));
}

async function contar(
  tabla: typeof registroAuditoria | typeof eventoSeguridad,
  filtro: SQL | undefined,
): Promise<number> {
  const [fila] = await db.select({ total: count() }).from(tabla).where(filtro);
  return fila?.total ?? 0;
}

/** US-AUD-02 - Consulta paginada del historial de operaciones. */
export async function listarRegistros(
  filtros: FiltrosAuditoria,
): Promise<PaginaAuditoria> {
  const filtro = armarFiltroAuditoria(filtros);
  const [filas, total] = await Promise.all([
    consultaAuditoria(filtro)
      .limit(filtros.porPagina)
      .offset((filtros.pagina - 1) * filtros.porPagina),
    contar(registroAuditoria, filtro),
  ]);

  return {
    datos: filas.map((fila): RegistroAuditoria => ({
      ...fila,
      fechaHora: fila.fechaHora.toISOString(),
    })),
    total,
    pagina: filtros.pagina,
    porPagina: filtros.porPagina,
  };
}

/** US-AUD-01 - Consulta paginada de los eventos de seguridad. */
export async function listarEventos(
  filtros: FiltrosEventoSeguridad,
): Promise<PaginaEventoSeguridad> {
  const filtro = armarFiltroEventos(filtros);
  const [filas, total] = await Promise.all([
    consultaEventos(filtro)
      .limit(filtros.porPagina)
      .offset((filtros.pagina - 1) * filtros.porPagina),
    contar(eventoSeguridad, filtro),
  ]);

  return {
    datos: filas.map((fila): EventoSeguridad => ({
      ...fila,
      fechaHora: fila.fechaHora.toISOString(),
    })),
    total,
    pagina: filtros.pagina,
    porPagina: filtros.porPagina,
  };
}

// ---------------------------------------------------------------------------
// Exportacion a CSV
// ---------------------------------------------------------------------------

/**
 * Los encabezados replican los nombres del contrato de la API y no una
 * traduccion libre: el CSV y la tabla de PAN-AUD-01 tienen que ser el mismo
 * dato con la misma etiqueta, o la evidencia deja de ser comparable.
 */
const COLUMNAS_AUDITORIA: ColumnaCsv<RegistroAuditoria>[] = [
  { encabezado: 'fechaHora', valor: (f) => f.fechaHora },
  { encabezado: 'usuarioId', valor: (f) => f.usuarioId },
  { encabezado: 'usuarioEmail', valor: (f) => f.usuarioEmail },
  { encabezado: 'operacion', valor: (f) => f.operacion },
  { encabezado: 'tipoObjeto', valor: (f) => f.tipoObjeto },
  { encabezado: 'objetoAfectadoId', valor: (f) => f.objetoAfectadoId },
  { encabezado: 'ipOrigen', valor: (f) => f.ipOrigen },
  { encabezado: 'datosAdicionales', valor: (f) => f.datosAdicionales },
];

const COLUMNAS_EVENTOS: ColumnaCsv<EventoSeguridad>[] = [
  { encabezado: 'fechaHora', valor: (f) => f.fechaHora },
  { encabezado: 'tipoEvento', valor: (f) => f.tipoEvento },
  { encabezado: 'emailIntentado', valor: (f) => f.emailIntentado },
  { encabezado: 'usuarioId', valor: (f) => f.usuarioId },
  { encabezado: 'recursoSolicitado', valor: (f) => f.recursoSolicitado },
  { encabezado: 'ipOrigen', valor: (f) => f.ipOrigen },
  { encabezado: 'motivo', valor: (f) => f.motivo },
];

/** US-AUD-02 - Exportacion del historial con los filtros vigentes. */
export async function exportarRegistrosCsv(
  filtros: FiltrosAuditoria,
): Promise<string> {
  const filas = await consultaAuditoria(armarFiltroAuditoria(filtros)).limit(
    MAXIMO_FILAS_EXPORTACION,
  );

  return generarCsv(
    COLUMNAS_AUDITORIA,
    filas.map((fila): RegistroAuditoria => ({
      ...fila,
      fechaHora: fila.fechaHora.toISOString(),
    })),
  );
}

/** US-AUD-01 - Exportacion de los eventos de seguridad con los filtros vigentes. */
export async function exportarEventosCsv(
  filtros: FiltrosEventoSeguridad,
): Promise<string> {
  const filas = await consultaEventos(armarFiltroEventos(filtros)).limit(
    MAXIMO_FILAS_EXPORTACION,
  );

  return generarCsv(
    COLUMNAS_EVENTOS,
    filas.map((fila): EventoSeguridad => ({
      ...fila,
      fechaHora: fila.fechaHora.toISOString(),
    })),
  );
}
