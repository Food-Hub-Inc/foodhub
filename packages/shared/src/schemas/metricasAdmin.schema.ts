import { z } from 'zod';
import {
  ESTADO_PEDIDO,
  OPERACION_AUDITORIA,
  TIPO_USUARIO,
} from '../constants/enums.js';
import { MENSAJES_METRICAS } from '../constants/mensajes.js';

/**
 * Contratos de las métricas generales del panel — US-ADM-05, RF052 y RF053
 * (PAN-ADM-03, REP-02).
 *
 * El layout es el del mockup de PAN-ADM-03 (cuatro KPI con variación, barras
 * de pedidos, torta de usuarios por rol y actividad reciente) MÁS lo que la
 * historia exige y el mockup no dibuja: el período "Personalizado" y la
 * cantidad de pedidos por estado (decisión del equipo).
 *
 * MISMOS CRITERIOS QUE EL DASHBOARD DEL COCINERO (`dashboard.schema.ts`):
 *
 *   EL RANGO LO CALCULA EL CLIENTE con `rangoDePeriodo`, en su zona horaria,
 *       y viaja en UTC. El servidor solo verifica que sea coherente.
 *   UN PEDIDO PERTENECE AL PERÍODO EN QUE SE CREÓ (`pedido.fecha_creacion`).
 */

/**
 * Opciones del selector. El mockup dibuja Semana / Mes / Año; la US agrega el
 * período personalizado. Las tres primeras se calculan con `rangoDePeriodo`
 * del dashboard (semana desde el lunes, mes y año calendario hasta ahora).
 */
export const PERIODO_METRICAS = [
  'SEMANA',
  'MES',
  'ANIO',
  'PERSONALIZADO',
] as const;
export type PeriodoMetricas = (typeof PERIODO_METRICAS)[number];

/** El mockup muestra "Mes" seleccionado. */
export const PERIODO_METRICAS_POR_DEFECTO: PeriodoMetricas = 'MES';

/**
 * Consulta. `zonaHoraria` es la IANA del navegador del administrador: la serie
 * se agrupa por día CALENDARIO LOCAL, y un pedido de las 23 h de Mendoza cae al
 * día siguiente en UTC.
 *
 * Como en el dashboard, no se valida que `hasta` no sea futuro: el fin del día
 * local es futuro respecto del reloj del servidor casi todo el día. Lo impide
 * la interfaz, que no deja elegir un día posterior a hoy.
 */
export const consultaMetricasSchema = z
  .object({
    desde: z.iso.datetime(),
    hasta: z.iso.datetime(),
    zonaHoraria: z
      .string()
      .min(1)
      .max(64)
      .refine(esZonaHorariaValida, 'La zona horaria no es válida.'),
  })
  .refine((rango) => rango.desde <= rango.hasta, {
    message: MENSAJES_METRICAS.rangoInvertido,
    path: ['desde'],
  });

function esZonaHorariaValida(zona: string): boolean {
  try {
    new Intl.DateTimeFormat('es-AR', { timeZone: zona });
    return true;
  } catch {
    return false;
  }
}

/**
 * Un indicador con su variación porcentual.
 *
 * `variacion` es `null` cuando no hay base contra la cual comparar (valor
 * anterior en cero): "+∞ %" no le dice nada a nadie y el chip no se dibuja.
 */
export const indicadorSchema = z.object({
  valor: z.number().int().min(0),
  variacion: z.number().nullable(),
});

/** Un día de la serie de pedidos, en la zona horaria pedida. */
export const diaDePedidosSchema = z.object({
  fecha: z.iso.date(),
  pedidos: z.number().int().min(0),
  completados: z.number().int().min(0),
});

export const actividadRecienteSchema = z.object({
  id: z.uuid(),
  operacion: z.enum(OPERACION_AUDITORIA),
  tipoObjeto: z.string(),
  usuarioEmail: z.string().nullable(),
  fechaHora: z.iso.datetime(),
});

export const metricasAdminSchema = z.object({
  /**
   * Los cuatro KPI del mockup.
   *
   * Usuarios, cocineros y publicaciones son valores AL DÍA (la US filtra por
   * período solo "las métricas de pedidos"); su variación compara contra lo
   * que había al inicio del período, contando por fecha de alta. La de pedidos
   * completados compara contra el período anterior de igual duración.
   */
  kpis: z.object({
    usuariosActivos: indicadorSchema,
    cocinerosActivos: indicadorSchema,
    pedidosCompletados: indicadorSchema,
    publicacionesActivas: indicadorSchema,
  }),

  /** Primer criterio: "total de usuarios registrados diferenciado por rol". */
  usuariosPorRol: z.record(z.enum(TIPO_USUARIO), z.number().int().min(0)),

  /**
   * Primer criterio: "total de pedidos realizados y cantidad de pedidos por
   * estado", del período elegido.
   */
  pedidos: z.object({
    total: z.number().int().min(0),
    porEstado: z.record(z.enum(ESTADO_PEDIDO), z.number().int().min(0)),
  }),

  /** Días CON pedidos; los vacíos los completa el cliente al armar la serie. */
  serie: z.array(diaDePedidosSchema),

  actividadReciente: z.array(actividadRecienteSchema),
});

// ---------------------------------------------------------------------------
// Reglas puras (se prueban en `apps/api/src/modules/metricas/reglas.test.ts`)
// ---------------------------------------------------------------------------

/**
 * Variación porcentual de `actual` respecto de `anterior`, con un decimal.
 * `null` si no hay base (anterior en cero): no hay porcentaje que mostrar.
 */
export function variacionPorcentual(
  actual: number,
  anterior: number,
): number | null {
  if (anterior <= 0) return null;
  return Math.round(((actual - anterior) * 1000) / anterior) / 10;
}

/** Una barra del gráfico "Pedidos vs Completados". */
export interface TramoDeSerie {
  etiqueta: string;
  pedidos: number;
  completados: number;
}

type Granularidad = 'DIA' | 'SEMANA' | 'MES';

const MESES_CORTOS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
] as const;

/**
 * Cuántas barras tiene el gráfico según el período. Semana por día, mes por
 * semana ("Sem 1" a "Sem 5", como el mockup) y año por mes. El personalizado
 * elige la más fina que no amontone barras: día hasta un mes, semana hasta
 * medio año, mes más allá.
 */
function granularidadDe(
  periodo: PeriodoMetricas,
  desde: Date,
  hasta: Date,
): Granularidad {
  if (periodo === 'SEMANA') return 'DIA';
  if (periodo === 'MES') return 'SEMANA';
  if (periodo === 'ANIO') return 'MES';

  const dias = (hasta.getTime() - desde.getTime()) / 86_400_000;
  if (dias <= 31) return 'DIA';
  if (dias <= 183) return 'SEMANA';
  return 'MES';
}

/** `YYYY-MM-DD` de una fecha en la zona horaria LOCAL, como la manda la API. */
function claveDeDia(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${String(fecha.getFullYear())}-${mes}-${dia}`;
}

function etiquetaDe(
  granularidad: Granularidad,
  fecha: Date,
  indiceDeSemana: number,
): string {
  if (granularidad === 'MES') return MESES_CORTOS[fecha.getMonth()] ?? '';
  if (granularidad === 'SEMANA') return `Sem ${String(indiceDeSemana + 1)}`;
  return `${String(fecha.getDate()).padStart(2, '0')}/${String(fecha.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Arma las barras del gráfico a partir de los días que devolvió la API.
 * Función PURA: recorre día por día el rango (en la zona horaria local, la
 * misma que se le mandó a la API) y suma cada día en su tramo. Los días sin
 * pedidos cuentan cero: un tramo vacío tiene que verse como una barra en cero y
 * no desaparecer del eje.
 */
export function agruparSerieDePedidos(
  serie: readonly DiaDePedidos[],
  periodo: PeriodoMetricas,
  desde: Date,
  hasta: Date,
): TramoDeSerie[] {
  const granularidad = granularidadDe(periodo, desde, hasta);
  const porDia = new Map(serie.map((dia) => [dia.fecha, dia]));
  const tramos = new Map<string, TramoDeSerie>();

  const dia = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate());
  for (let indice = 0; dia <= hasta; indice += 1) {
    const clave =
      granularidad === 'DIA'
        ? claveDeDia(dia)
        : granularidad === 'SEMANA'
          ? String(Math.floor(indice / 7))
          : `${String(dia.getFullYear())}-${String(dia.getMonth())}`;

    const tramo = tramos.get(clave) ?? {
      etiqueta: etiquetaDe(granularidad, dia, Math.floor(indice / 7)),
      pedidos: 0,
      completados: 0,
    };
    const datos = porDia.get(claveDeDia(dia));
    tramo.pedidos += datos?.pedidos ?? 0;
    tramo.completados += datos?.completados ?? 0;
    tramos.set(clave, tramo);

    dia.setDate(dia.getDate() + 1);
  }

  return [...tramos.values()];
}

export type ConsultaMetricas = z.infer<typeof consultaMetricasSchema>;
export type Indicador = z.infer<typeof indicadorSchema>;
export type DiaDePedidos = z.infer<typeof diaDePedidosSchema>;
export type ActividadReciente = z.infer<typeof actividadRecienteSchema>;
export type MetricasAdmin = z.infer<typeof metricasAdminSchema>;
