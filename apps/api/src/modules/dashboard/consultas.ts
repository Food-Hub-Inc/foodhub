import { eq, gte, lte, type SQL } from 'drizzle-orm';
import { pedido } from '@foodhub/db';
import {
  DIAS_DE_LA_SEMANA,
  FRANJAS_HORARIAS,
  type ClienteRecurrente,
  type DiaDeSemanaConteo,
  type DistribucionPedidos,
  type EstadoPedido,
  type FranjaHoraria,
  type FranjaHorariaConteo,
  type OrigenTransicion,
  type PlatoMasPedido,
  type RangoDashboard,
  type ResumenActividad,
} from '@foodhub/shared';
import { aValoracion } from '../../lib/valoraciones.js';
import { todas } from '../pedidos/consultas.js';

/**
 * Vocabulario del modulo de Dashboard del cocinero (US-DASH-01 a US-DASH-05).
 *
 * Todo lo que hay aca es PURO o es una condicion SQL sin ejecutar: las consultas
 * viven en `dashboard.service.ts`. La separacion no es estetica -es lo que
 * permite probar el mapeo de los cuatro estados de US-DASH-04 y las banderas de
 * "eliminado" con vitest, que en este proyecto no tiene base contra la cual
 * correr.
 */

/**
 * Los pedidos de un cocinero dentro del periodo.
 *
 * La pertenencia se decide por `fecha_creacion` en las CUATRO secciones
 * (decision del equipo del 20/08/2026, documentada en `dashboard.schema.ts`).
 * Con `fecha_ultima_transicion` un pedido cambiaria de periodo solo, al
 * completarse, y las secciones de una misma pantalla contarian universos
 * distintos.
 */
export function enElPeriodo(cocineroId: string, rango: RangoDashboard): SQL {
  return todas([
    eq(pedido.cocineroPedidoId, cocineroId),
    gte(pedido.fechaCreacion, new Date(rango.desde)),
    lte(pedido.fechaCreacion, new Date(rango.hasta)),
  ]);
}

// ---------------------------------------------------------------------------
// Filas crudas
// ---------------------------------------------------------------------------

export interface FilaResumen {
  pedidosTotales: number;
  ventasAcumuladas: string;
  promedioValoracion: string | null;
  cantidadResenas: number;
}

export interface FilaPlato {
  publicacionId: string;
  nombre: string;
  imagenUrl: string | null;
  precioActual: string;
  activo: boolean;
  categoriaId: string;
  categoriaNombre: string;
  categoriaImagenUrl: string | null;
  vecesPedido: string | null;
}

export interface FilaClienteRecurrente {
  clienteId: string;
  nombre: string;
  apellido: string;
  fotoPerfilUrl: string | null;
  cuentaEliminada: boolean;
  cantidadPedidos: number;
  montoTotal: string;
}

export interface FilaDistribucion {
  estado: EstadoPedido;
  origenRechazo: OrigenTransicion | null;
  cantidad: number;
}

export interface FilaDiaSemana {
  diaNumero: number;
  cantidad: number;
}

export interface FilaFranja {
  franja: FranjaHoraria;
  cantidad: number;
}

// ---------------------------------------------------------------------------
// Mapeo (todo PURO)
// ---------------------------------------------------------------------------

/**
 * US-DASH-01 - Las tres tarjetas.
 *
 * El promedio pasa por `aValoracion` y no por `Number`: `Number(null)` es 0, y
 * un cocinero sin resenas en el periodo quedaria mostrando una valoracion de
 * cero en vez de "Sin calificaciones aun".
 */
export function aResumen(fila: FilaResumen): ResumenActividad {
  return {
    ventasAcumuladas: fila.ventasAcumuladas,
    pedidosTotales: fila.pedidosTotales,
    valoracionPromedio: aValoracion(fila.promedioValoracion),
    cantidadResenas: fila.cantidadResenas,
  };
}

/**
 * US-DASH-02 - Una fila del ranking.
 *
 * `activo = false` es la baja logica de la publicacion: la fila se conserva y la
 * pantalla le agrega "(eliminado)". `sum()` sobre una columna entera vuelve de
 * Postgres como `bigint`, o sea texto, y por eso se convierte aca.
 */
export function aPlatoMasPedido(fila: FilaPlato): PlatoMasPedido {
  return {
    publicacionId: fila.publicacionId,
    nombre: fila.nombre,
    categoria: {
      id: fila.categoriaId,
      nombre: fila.categoriaNombre,
      imagenPredeterminadaUrl: fila.categoriaImagenUrl,
    },
    imagenUrl: fila.imagenUrl,
    vecesPedido: Number(fila.vecesPedido ?? 0),
    precioActual: fila.precioActual,
    eliminado: !fila.activo,
  };
}

/**
 * US-DASH-03 - Una fila de clientes recurrentes.
 *
 * LA IDENTIDAD DE UNA CUENTA ELIMINADA NO SALE DE LA API. El criterio pide
 * mostrar "Usuario eliminado" en lugar del nombre y sin foto: si el nombre
 * viajara igual y solo la pantalla decidiera no dibujarlo, el dato seguiria
 * estando en la respuesta HTTP de cualquiera que la mire.
 */
export function aClienteRecurrente(
  fila: FilaClienteRecurrente,
): ClienteRecurrente {
  return {
    clienteId: fila.clienteId,
    nombre: fila.cuentaEliminada ? null : fila.nombre,
    apellido: fila.cuentaEliminada ? null : fila.apellido,
    fotoPerfilUrl: fila.cuentaEliminada ? null : fila.fotoPerfilUrl,
    cantidadPedidos: fila.cantidadPedidos,
    montoTotal: fila.montoTotal,
    eliminado: fila.cuentaEliminada,
  };
}

/**
 * US-DASH-04 - Los cuatro cubos de la distribucion.
 *
 * Traduce dos estados internos a los cuatro rotulos del criterio:
 *
 *   COMPLETADO                  -> completados
 *   RECHAZADO + origen COCINERO -> rechazadosCocinero
 *   RECHAZADO + origen CLIENTE  -> canceladosCliente   (US-PED-09)
 *   RECHAZADO + origen SISTEMA  -> expirados           (US-PED-10)
 *
 * CREADO, ACEPTADO y LISTO NO ENTRAN, ni en el grafico ni en `total`. El
 * criterio enumera cuatro estados y ninguno cubre un pedido todavia abierto;
 * contarlos en el denominador dejaria los porcentajes sin cerrar en 100
 * (decision del equipo del 20/08/2026).
 *
 * Un RECHAZADO sin `origen_rechazo` no deberia existir -las tres transiciones
 * que llevan a ese estado lo escriben-, pero la columna es nullable, asi que se
 * descarta en vez de asumirle un origen: inventarle uno ensuciaria la metrica.
 */
export function aDistribucion(filas: FilaDistribucion[]): DistribucionPedidos {
  const distribucion = {
    completados: 0,
    rechazadosCocinero: 0,
    canceladosCliente: 0,
    expirados: 0,
    total: 0,
  };

  for (const fila of filas) {
    if (fila.estado === 'COMPLETADO') {
      distribucion.completados += fila.cantidad;
    } else if (fila.estado === 'RECHAZADO') {
      if (fila.origenRechazo === 'COCINERO') {
        distribucion.rechazadosCocinero += fila.cantidad;
      } else if (fila.origenRechazo === 'CLIENTE') {
        distribucion.canceladosCliente += fila.cantidad;
      } else if (fila.origenRechazo === 'SISTEMA') {
        distribucion.expirados += fila.cantidad;
      }
    }
  }

  distribucion.total =
    distribucion.completados +
    distribucion.rechazadosCocinero +
    distribucion.canceladosCliente +
    distribucion.expirados;

  return distribucion;
}

/** Estados en los que un pedido todavia no cerro. */
const ESTADOS_ABIERTOS = new Set<EstadoPedido>(['CREADO', 'ACEPTADO', 'LISTO']);

/**
 * Pedidos que siguen abiertos en el periodo: CREADO, ACEPTADO o LISTO.
 *
 * Es la contracara de `aDistribucion`, no una metrica de US-DASH-04. Se calcula
 * de las MISMAS filas del `GROUP BY` para que la pantalla pueda reconciliar
 * `pedidosTotales` con el grafico sin una consulta extra ni dos universos que se
 * puedan desincronizar entre si.
 */
export function aPedidosAbiertos(filas: FilaDistribucion[]): number {
  return filas.reduce(
    (suma, fila) =>
      suma + (ESTADOS_ABIERTOS.has(fila.estado) ? fila.cantidad : 0),
    0,
  );
}

/**
 * Pedidos por dia de la semana. Garantiza los SIETE cubos, en orden lunes a
 * domingo, aunque la consulta no devuelva un dia sin pedidos.
 *
 * No resuelve rotulos ni pico: eso es presentacion y lo hace
 * `detalleDeDiasDeSemana` del paquete compartido, que es puro y se prueba una
 * sola vez. Asi la API no se acopla al copy en espanol.
 */
export function aPedidosPorDiaSemana(
  filas: FilaDiaSemana[],
): DiaDeSemanaConteo[] {
  const cantidades = new Map(
    filas.map((fila) => [fila.diaNumero, fila.cantidad]),
  );

  return DIAS_DE_LA_SEMANA.map((dia) => ({
    diaNumero: dia.diaNumero,
    cantidad: cantidades.get(dia.diaNumero) ?? 0,
  }));
}

/**
 * Pedidos por franja horaria. Garantiza las SEIS franjas, en el orden de
 * `FRANJAS_HORARIAS`, y descarta una clave que el CASE no pueda producir.
 */
export function aFranjasHorarias(filas: FilaFranja[]): FranjaHorariaConteo[] {
  const validas = new Set<FranjaHoraria>(
    FRANJAS_HORARIAS.map((franja) => franja.franja),
  );
  const cantidades = new Map<FranjaHoraria, number>();

  for (const fila of filas) {
    if (validas.has(fila.franja)) {
      cantidades.set(fila.franja, fila.cantidad);
    }
  }

  return FRANJAS_HORARIAS.map((franja) => ({
    franja: franja.franja,
    cantidad: cantidades.get(franja.franja) ?? 0,
  }));
}
