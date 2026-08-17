import { and, count, desc, eq, inArray, type SQL } from 'drizzle-orm';
import { motivoCancelacion, pedido, tipoUsuarioCancelacion } from '@foodhub/db';
import {
  MENSAJES_CONFIGURACION,
  type CrearMotivoCancelacionInput,
  type EditarMotivoCancelacionInput,
  type FiltrosMotivoCancelacion,
  type MotivoCancelacionListado,
  type PaginaMotivosCancelacion,
  type TipoUsuarioCancelacion,
} from '@foodhub/shared';
import { db } from '../../lib/db.js';
import { tieneCodigoSql } from '../../lib/errores-postgres.js';
import { AppError, noEncontrado } from '../../middleware/error.middleware.js';
import { registrarOperacion } from '../auditoria/auditoria.service.js';

/**
 * Modulo de Configuracion y parametros — motivos de cancelacion de pedido
 * (US-CFG-02, RF056, PAN-ADM-04).
 *
 * `tipo_usuario_cancelacion` no es un ABM: son 3 filas fijas sembradas por
 * migracion (COCINERO, CLIENTE, AMBOS). El contrato de la API expone ese
 * codigo, nunca el id de la fila — este servicio hace la traduccion en los
 * dos sentidos.
 */

/** Id de la fila de `tipo_usuario_cancelacion` para un codigo del contrato. */
async function resolverIdDeTipo(
  codigo: TipoUsuarioCancelacion,
): Promise<string> {
  const [fila] = await db
    .select({ id: tipoUsuarioCancelacion.id })
    .from(tipoUsuarioCancelacion)
    .where(eq(tipoUsuarioCancelacion.nombreTipoUsuarioCancelacion, codigo))
    .limit(1);

  // No puede pasar contra una base migrada: la migracion 0003 siembra las 3
  // filas. Si falta, es un ambiente sin migrar, no una entrada invalida.
  if (!fila) {
    throw new Error(
      `Falta sembrar tipo_usuario_cancelacion para "${codigo}". Corré pnpm db:migrate.`,
    );
  }
  return fila.id;
}

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------

function armarFiltroMotivos(
  filtros: FiltrosMotivoCancelacion,
  idTipoAplicableA: string | undefined,
): SQL | undefined {
  const condiciones: SQL[] = [];

  if (idTipoAplicableA) {
    condiciones.push(
      eq(motivoCancelacion.tipoUsuarioCancelacionId, idTipoAplicableA),
    );
  }
  if (filtros.estado) {
    condiciones.push(
      eq(motivoCancelacion.activo, filtros.estado === 'HABILITADO'),
    );
  }

  return condiciones.length > 0 ? and(...condiciones) : undefined;
}

/** US-CFG-02 - Listado paginado, con la aplicabilidad y los pedidos asociados de cada motivo. */
export async function listarMotivosCancelacion(
  filtros: FiltrosMotivoCancelacion,
): Promise<PaginaMotivosCancelacion> {
  const idTipoAplicableA = filtros.aplicableA
    ? await resolverIdDeTipo(filtros.aplicableA)
    : undefined;
  const filtro = armarFiltroMotivos(filtros, idTipoAplicableA);

  const [filas, [totalizador]] = await Promise.all([
    db
      .select({
        id: motivoCancelacion.id,
        nombre: motivoCancelacion.nombre,
        activo: motivoCancelacion.activo,
        aplicableA: tipoUsuarioCancelacion.nombreTipoUsuarioCancelacion,
      })
      .from(motivoCancelacion)
      .innerJoin(
        tipoUsuarioCancelacion,
        eq(
          tipoUsuarioCancelacion.id,
          motivoCancelacion.tipoUsuarioCancelacionId,
        ),
      )
      .where(filtro)
      .orderBy(desc(motivoCancelacion.nombre))
      .limit(filtros.porPagina)
      .offset((filtros.pagina - 1) * filtros.porPagina),
    db.select({ total: count() }).from(motivoCancelacion).where(filtro),
  ]);

  const ids = filas.map((fila) => fila.id);
  const conteos = ids.length
    ? await db
        .select({
          motivoCancelacionId: pedido.motivoCancelacionId,
          total: count(),
        })
        .from(pedido)
        .where(inArray(pedido.motivoCancelacionId, ids))
        .groupBy(pedido.motivoCancelacionId)
    : [];
  const mapaConteos = new Map(
    conteos.map((c) => [c.motivoCancelacionId, c.total]),
  );

  return {
    datos: filas.map((fila): MotivoCancelacionListado => ({
      ...fila,
      aplicableA: fila.aplicableA as TipoUsuarioCancelacion,
      pedidosAsociados: mapaConteos.get(fila.id) ?? 0,
    })),
    total: totalizador?.total ?? 0,
    pagina: filtros.pagina,
    porPagina: filtros.porPagina,
  };
}

// ---------------------------------------------------------------------------
// Escritura
// ---------------------------------------------------------------------------

/** US-CFG-02 - Alta de motivo. */
export async function crearMotivoCancelacion(entrada: {
  datos: CrearMotivoCancelacionInput;
  administradorId: string;
  ipOrigen: string | null;
}): Promise<MotivoCancelacionListado> {
  const idTipo = await resolverIdDeTipo(entrada.datos.aplicableA);

  let id: string;
  try {
    const [insertado] = await db
      .insert(motivoCancelacion)
      .values({
        nombre: entrada.datos.nombre,
        tipoUsuarioCancelacionId: idTipo,
      })
      .returning({ id: motivoCancelacion.id });
    if (!insertado) throw new Error('el alta de motivo no devolvió fila.');
    id = insertado.id;
  } catch (error) {
    if (tieneCodigoSql(error, '23505')) {
      throw new AppError(
        409,
        MENSAJES_CONFIGURACION.nombreMotivoDuplicado,
        'NOMBRE_DUPLICADO',
      );
    }
    throw error;
  }

  void registrarOperacion({
    usuarioId: entrada.administradorId,
    operacion: 'ALTA',
    tipoObjeto: 'motivo_cancelacion',
    objetoAfectadoId: id,
    ipOrigen: entrada.ipOrigen,
    datosAdicionales: {
      nombre: entrada.datos.nombre,
      aplicableA: entrada.datos.aplicableA,
    },
  });

  return {
    id,
    nombre: entrada.datos.nombre,
    aplicableA: entrada.datos.aplicableA,
    activo: true,
    pedidosAsociados: 0,
  };
}

/** US-CFG-02 - Edicion parcial de nombre y/o aplicabilidad. */
export async function editarMotivoCancelacion(entrada: {
  motivoId: string;
  datos: EditarMotivoCancelacionInput;
  administradorId: string;
  ipOrigen: string | null;
}): Promise<void> {
  const { motivoId, datos } = entrada;

  const cambios: { nombre?: string; tipoUsuarioCancelacionId?: string } = {};
  if (datos.nombre !== undefined) cambios.nombre = datos.nombre;
  if (datos.aplicableA !== undefined) {
    cambios.tipoUsuarioCancelacionId = await resolverIdDeTipo(datos.aplicableA);
  }

  try {
    const [fila] = await db
      .update(motivoCancelacion)
      .set(cambios)
      .where(eq(motivoCancelacion.id, motivoId))
      .returning({ id: motivoCancelacion.id });
    if (!fila) throw noEncontrado('el motivo de cancelación');
  } catch (error) {
    if (tieneCodigoSql(error, '23505')) {
      throw new AppError(
        409,
        MENSAJES_CONFIGURACION.nombreMotivoDuplicado,
        'NOMBRE_DUPLICADO',
      );
    }
    throw error;
  }

  void registrarOperacion({
    usuarioId: entrada.administradorId,
    operacion: 'MODIFICACION',
    tipoObjeto: 'motivo_cancelacion',
    objetoAfectadoId: motivoId,
    ipOrigen: entrada.ipOrigen,
    datosAdicionales: { campos: Object.keys(datos), ...datos },
  });
}

/** US-CFG-02 - Habilitar o deshabilitar. Deshabilitar exige confirmación en la UI; habilitar no. */
export async function establecerHabilitacionMotivo(entrada: {
  motivoId: string;
  activo: boolean;
  administradorId: string;
  ipOrigen: string | null;
}): Promise<void> {
  const [fila] = await db
    .update(motivoCancelacion)
    .set({ activo: entrada.activo })
    .where(eq(motivoCancelacion.id, entrada.motivoId))
    .returning({ id: motivoCancelacion.id });
  if (!fila) throw noEncontrado('el motivo de cancelación');

  void registrarOperacion({
    usuarioId: entrada.administradorId,
    operacion: 'MODIFICACION',
    tipoObjeto: 'motivo_cancelacion',
    objetoAfectadoId: entrada.motivoId,
    ipOrigen: entrada.ipOrigen,
    datosAdicionales: { activo: entrada.activo },
  });
}
