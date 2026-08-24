import { eq, sql } from 'drizzle-orm';
import { configuracionSistema } from '@foodhub/db';
import {
  CLAVE_PARAMETRO,
  PARAMETROS_BUSQUEDA_DEFAULT,
  PARAMETROS_INSTITUCIONALES_DEFAULT,
  PARAMETROS_PEDIDOS_DEFAULT,
  PARAMETROS_RESENAS_DEFAULT,
  horarioAtencionSemanaSchema,
  type ParametrosBusqueda,
  type ParametrosInstitucionales,
  type ParametrosPedidos,
  type ParametrosResenas,
  type ParametrosSistema,
  type SeccionParametrosSistema,
} from '@foodhub/shared';
import { db } from '../../lib/db.js';
import { registrarOperacion } from '../auditoria/auditoria.service.js';

/**
 * Modulo de Configuracion y parametros — parametros generales del sistema
 * (US-CFG-03, RF057, PAN-ADM-04).
 *
 * `configuracion_sistema` guarda cada parametro como una fila clave/valor con
 * `valor` en texto: este servicio serializa y parsea en los dos sentidos.
 */

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------

async function leerMapaDeParametros(): Promise<Map<string, string>> {
  const filas = await db
    .select({
      clave: configuracionSistema.clave,
      valor: configuracionSistema.valor,
    })
    .from(configuracionSistema);
  return new Map(filas.map((fila) => [fila.clave, fila.valor]));
}

/**
 * Ninguna de estas dos funciones deberia disparar contra un ambiente
 * migrado: la migracion 0004 siembra las 10 filas. Si falta una, es un
 * ambiente sin migrar, no una entrada invalida del administrador.
 */
function numeroDe(mapa: Map<string, string>, clave: string): number {
  const valor = mapa.get(clave);
  if (valor === undefined) {
    throw new Error(
      `Falta sembrar configuracion_sistema."${clave}". Corré pnpm db:migrate.`,
    );
  }
  return Number(valor);
}

function textoDe(mapa: Map<string, string>, clave: string): string {
  const valor = mapa.get(clave);
  if (valor === undefined) {
    throw new Error(
      `Falta sembrar configuracion_sistema."${clave}". Corré pnpm db:migrate.`,
    );
  }
  return valor;
}

/** US-CFG-03 - Los diez parametros vigentes, agrupados por seccion. */
export async function obtenerParametrosSistema(): Promise<ParametrosSistema> {
  const mapa = await leerMapaDeParametros();

  return {
    busqueda: {
      radioBusquedaDefectoKm: numeroDe(
        mapa,
        CLAVE_PARAMETRO.radioBusquedaDefectoKm,
      ),
      distanciaMaximaFiltroKm: numeroDe(
        mapa,
        CLAVE_PARAMETRO.distanciaMaximaFiltroKm,
      ),
      feedPublicacionesPorPagina: numeroDe(
        mapa,
        CLAVE_PARAMETRO.feedPublicacionesPorPagina,
      ),
    },
    pedidos: {
      tiempoCancelacionClienteMinutos: numeroDe(
        mapa,
        CLAVE_PARAMETRO.pedidoTiempoCancelacionClienteMinutos,
      ),
      tiempoExpiracionCocineroMinutos: numeroDe(
        mapa,
        CLAVE_PARAMETRO.pedidoExpiracionMinutos,
      ),
    },
    resenas: {
      minimoResenasParaPromedio: numeroDe(
        mapa,
        CLAVE_PARAMETRO.resenaMinimoParaPromedio,
      ),
      limiteDiasParaResenar: numeroDe(
        mapa,
        CLAVE_PARAMETRO.resenaLimiteDiasParaResenar,
      ),
    },
    institucional: {
      nombrePlataforma: textoDe(mapa, CLAVE_PARAMETRO.plataformaNombre),
      logoPlataformaUrl:
        textoDe(mapa, CLAVE_PARAMETRO.plataformaLogoUrl) || null,
      correoSoporte: textoDe(mapa, CLAVE_PARAMETRO.plataformaCorreoSoporte),
      horarioAtencionSoporte: horarioAtencionSemanaSchema.parse(
        JSON.parse(
          textoDe(mapa, CLAVE_PARAMETRO.plataformaHorarioAtencionSoporte),
        ),
      ),
    },
  };
}

/**
 * US-CFG-03 / RF057 - Minutos que tiene el cliente para cancelar un pedido en
 * estado "Creado".
 *
 * Lectura de UN parametro, sin traer los otros nueve: la consulta la hace el
 * detalle de cada pedido del cliente (US-PED-09) y ahi el resto de la
 * configuracion no interviene.
 *
 * Ante un valor ausente o no numerico cae al valor de fabrica en lugar de
 * fallar: un parametro mal cargado no puede dejar sin detalle a un pedido.
 * Es el mismo criterio con el que la funcion `expirar_pedidos_sin_respuesta`
 * (migracion 0010) trata su propio parametro.
 */
export async function obtenerMinutosDeCancelacion(): Promise<number> {
  const [fila] = await db
    .select({ valor: configuracionSistema.valor })
    .from(configuracionSistema)
    .where(
      eq(
        configuracionSistema.clave,
        CLAVE_PARAMETRO.pedidoTiempoCancelacionClienteMinutos,
      ),
    )
    .limit(1);

  const minutos = Number(fila?.valor);
  return Number.isFinite(minutos) && minutos > 0
    ? minutos
    : PARAMETROS_PEDIDOS_DEFAULT.tiempoCancelacionClienteMinutos;
}

// ---------------------------------------------------------------------------
// Escritura
// ---------------------------------------------------------------------------

/**
 * Escribe un lote de parametros en una unica transaccion y deja constancia
 * en auditoria — reusada tanto por "Guardar cambios" como por "Restaurar
 * valores por defecto" (US-CFG-03: los dos criterios piden confirmacion y
 * los dos son, a efectos de auditoria, una modificacion de la seccion).
 */
async function escribirParametros(entrada: {
  valores: Record<string, string>;
  seccion: SeccionParametrosSistema;
  origen: 'guardado' | 'restauracion';
  administradorId: string;
  ipOrigen: string | null;
}): Promise<void> {
  await db.transaction(async (tx) => {
    for (const [clave, valor] of Object.entries(entrada.valores)) {
      await tx
        .update(configuracionSistema)
        .set({
          valor,
          fechaUltimaModificacion: sql`now()`,
          adminModificadorId: entrada.administradorId,
        })
        .where(eq(configuracionSistema.clave, clave));
    }
  });

  void registrarOperacion({
    usuarioId: entrada.administradorId,
    operacion: 'MODIFICACION',
    tipoObjeto: 'configuracion_sistema',
    objetoAfectadoId: null,
    ipOrigen: entrada.ipOrigen,
    datosAdicionales: {
      seccion: entrada.seccion,
      origen: entrada.origen,
      valores: entrada.valores,
    },
  });
}

interface OperacionDeSeccion {
  administradorId: string;
  ipOrigen: string | null;
}

/** US-CFG-03 - "Guardar cambios" de la subsección Parámetros de búsqueda. */
export async function actualizarParametrosBusqueda(
  entrada: OperacionDeSeccion & { datos: ParametrosBusqueda },
): Promise<ParametrosBusqueda> {
  await escribirParametros({
    valores: {
      [CLAVE_PARAMETRO.radioBusquedaDefectoKm]: String(
        entrada.datos.radioBusquedaDefectoKm,
      ),
      [CLAVE_PARAMETRO.distanciaMaximaFiltroKm]: String(
        entrada.datos.distanciaMaximaFiltroKm,
      ),
      [CLAVE_PARAMETRO.feedPublicacionesPorPagina]: String(
        entrada.datos.feedPublicacionesPorPagina,
      ),
    },
    seccion: 'BUSQUEDA',
    origen: 'guardado',
    administradorId: entrada.administradorId,
    ipOrigen: entrada.ipOrigen,
  });
  return entrada.datos;
}

/** US-CFG-03 - "Restaurar valores por defecto" de Parámetros de búsqueda. */
export async function restaurarParametrosBusqueda(
  entrada: OperacionDeSeccion,
): Promise<ParametrosBusqueda> {
  await escribirParametros({
    valores: {
      [CLAVE_PARAMETRO.radioBusquedaDefectoKm]: String(
        PARAMETROS_BUSQUEDA_DEFAULT.radioBusquedaDefectoKm,
      ),
      [CLAVE_PARAMETRO.distanciaMaximaFiltroKm]: String(
        PARAMETROS_BUSQUEDA_DEFAULT.distanciaMaximaFiltroKm,
      ),
      [CLAVE_PARAMETRO.feedPublicacionesPorPagina]: String(
        PARAMETROS_BUSQUEDA_DEFAULT.feedPublicacionesPorPagina,
      ),
    },
    seccion: 'BUSQUEDA',
    origen: 'restauracion',
    administradorId: entrada.administradorId,
    ipOrigen: entrada.ipOrigen,
  });
  return PARAMETROS_BUSQUEDA_DEFAULT;
}

/** US-CFG-03 - "Guardar cambios" de Parámetros de pedidos. */
export async function actualizarParametrosPedidos(
  entrada: OperacionDeSeccion & { datos: ParametrosPedidos },
): Promise<ParametrosPedidos> {
  await escribirParametros({
    valores: {
      [CLAVE_PARAMETRO.pedidoTiempoCancelacionClienteMinutos]: String(
        entrada.datos.tiempoCancelacionClienteMinutos,
      ),
      [CLAVE_PARAMETRO.pedidoExpiracionMinutos]: String(
        entrada.datos.tiempoExpiracionCocineroMinutos,
      ),
    },
    seccion: 'PEDIDOS',
    origen: 'guardado',
    administradorId: entrada.administradorId,
    ipOrigen: entrada.ipOrigen,
  });
  return entrada.datos;
}

/** US-CFG-03 - "Restaurar valores por defecto" de Parámetros de pedidos. */
export async function restaurarParametrosPedidos(
  entrada: OperacionDeSeccion,
): Promise<ParametrosPedidos> {
  await escribirParametros({
    valores: {
      [CLAVE_PARAMETRO.pedidoTiempoCancelacionClienteMinutos]: String(
        PARAMETROS_PEDIDOS_DEFAULT.tiempoCancelacionClienteMinutos,
      ),
      [CLAVE_PARAMETRO.pedidoExpiracionMinutos]: String(
        PARAMETROS_PEDIDOS_DEFAULT.tiempoExpiracionCocineroMinutos,
      ),
    },
    seccion: 'PEDIDOS',
    origen: 'restauracion',
    administradorId: entrada.administradorId,
    ipOrigen: entrada.ipOrigen,
  });
  return PARAMETROS_PEDIDOS_DEFAULT;
}

/** US-CFG-03 - "Guardar cambios" de Parámetros de reseñas. */
export async function actualizarParametrosResenas(
  entrada: OperacionDeSeccion & { datos: ParametrosResenas },
): Promise<ParametrosResenas> {
  await escribirParametros({
    valores: {
      [CLAVE_PARAMETRO.resenaMinimoParaPromedio]: String(
        entrada.datos.minimoResenasParaPromedio,
      ),
      [CLAVE_PARAMETRO.resenaLimiteDiasParaResenar]: String(
        entrada.datos.limiteDiasParaResenar,
      ),
    },
    seccion: 'RESENAS',
    origen: 'guardado',
    administradorId: entrada.administradorId,
    ipOrigen: entrada.ipOrigen,
  });
  return entrada.datos;
}

/** US-CFG-03 - "Restaurar valores por defecto" de Parámetros de reseñas. */
export async function restaurarParametrosResenas(
  entrada: OperacionDeSeccion,
): Promise<ParametrosResenas> {
  await escribirParametros({
    valores: {
      [CLAVE_PARAMETRO.resenaMinimoParaPromedio]: String(
        PARAMETROS_RESENAS_DEFAULT.minimoResenasParaPromedio,
      ),
      [CLAVE_PARAMETRO.resenaLimiteDiasParaResenar]: String(
        PARAMETROS_RESENAS_DEFAULT.limiteDiasParaResenar,
      ),
    },
    seccion: 'RESENAS',
    origen: 'restauracion',
    administradorId: entrada.administradorId,
    ipOrigen: entrada.ipOrigen,
  });
  return PARAMETROS_RESENAS_DEFAULT;
}

/** US-CFG-03 - "Guardar cambios" de Información institucional. */
export async function actualizarParametrosInstitucionales(
  entrada: OperacionDeSeccion & { datos: ParametrosInstitucionales },
): Promise<ParametrosInstitucionales> {
  await escribirParametros({
    valores: {
      [CLAVE_PARAMETRO.plataformaNombre]: entrada.datos.nombrePlataforma,
      [CLAVE_PARAMETRO.plataformaLogoUrl]:
        entrada.datos.logoPlataformaUrl ?? '',
      [CLAVE_PARAMETRO.plataformaCorreoSoporte]: entrada.datos.correoSoporte,
      [CLAVE_PARAMETRO.plataformaHorarioAtencionSoporte]: JSON.stringify(
        entrada.datos.horarioAtencionSoporte,
      ),
    },
    seccion: 'INSTITUCIONAL',
    origen: 'guardado',
    administradorId: entrada.administradorId,
    ipOrigen: entrada.ipOrigen,
  });
  return entrada.datos;
}

/** US-CFG-03 - "Restaurar valores por defecto" de Información institucional. */
export async function restaurarParametrosInstitucionales(
  entrada: OperacionDeSeccion,
): Promise<ParametrosInstitucionales> {
  await escribirParametros({
    valores: {
      [CLAVE_PARAMETRO.plataformaNombre]:
        PARAMETROS_INSTITUCIONALES_DEFAULT.nombrePlataforma,
      [CLAVE_PARAMETRO.plataformaLogoUrl]:
        PARAMETROS_INSTITUCIONALES_DEFAULT.logoPlataformaUrl ?? '',
      [CLAVE_PARAMETRO.plataformaCorreoSoporte]:
        PARAMETROS_INSTITUCIONALES_DEFAULT.correoSoporte,
      [CLAVE_PARAMETRO.plataformaHorarioAtencionSoporte]: JSON.stringify(
        PARAMETROS_INSTITUCIONALES_DEFAULT.horarioAtencionSoporte,
      ),
    },
    seccion: 'INSTITUCIONAL',
    origen: 'restauracion',
    administradorId: entrada.administradorId,
    ipOrigen: entrada.ipOrigen,
  });
  return PARAMETROS_INSTITUCIONALES_DEFAULT;
}
