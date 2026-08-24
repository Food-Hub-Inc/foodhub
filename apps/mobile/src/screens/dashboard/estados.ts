import {
  MENSAJES_DASHBOARD,
  type EstadoDistribucion,
  type PeriodoDashboard,
} from '@foodhub/shared';

/**
 * Vocabulario visual de los cuatro estados de US-DASH-04.
 *
 * En su propio archivo y no dentro de un componente por la misma razón que
 * `screens/pedidos/estados.ts`: son datos, no interfaz, y el Fast Refresh de
 * Metro solo conserva el estado de un módulo que exporta únicamente componentes.
 */

/** El rótulo de cada estado, tal como lo enumera el criterio. */
export const ETIQUETA_DE_ESTADO: Record<EstadoDistribucion, string> = {
  completados: MENSAJES_DASHBOARD.estadoCompletados,
  rechazadosCocinero: MENSAJES_DASHBOARD.estadoRechazadosCocinero,
  canceladosCliente: MENSAJES_DASHBOARD.estadoCanceladosCliente,
  expirados: MENSAJES_DASHBOARD.estadoExpirados,
};

/**
 * El color de cada segmento del gráfico, como clase de la guía visual.
 *
 * LOS CUATRO SALEN DE LA PALETA APROBADA, sin inventar tonos para un gráfico:
 *
 *   completados          `success`, el mismo verde con el que la bandeja del
 *                        cocinero marca un pedido entregado.
 *   rechazadosCocinero   `error`, que la guía reserva para "errores y acciones
 *                        destructivas": rechazar es la acción destructiva del
 *                        cocinero sobre un pedido.
 *   canceladosCliente    `warning`, un cierre negativo que el cocinero no
 *                        decidió y que por eso no comparte color con el rechazo.
 *   expirados            `text-disabled`, el gris de lo inactivo: un pedido
 *                        expirado es exactamente eso, uno que nadie tocó.
 *
 * El color nunca es el único canal: debajo del gráfico va el listado con el
 * nombre de cada estado, su cantidad y su porcentaje.
 */
export const CLASE_DE_ESTADO: Record<
  EstadoDistribucion,
  { fondo: string; texto: string }
> = {
  completados: { fondo: 'bg-success', texto: 'text-success' },
  rechazadosCocinero: { fondo: 'bg-error', texto: 'text-error' },
  canceladosCliente: { fondo: 'bg-warning', texto: 'text-warning' },
  expirados: { fondo: 'bg-text-disabled', texto: 'text-text-disabled' },
};

/**
 * El rotulo de cada opcion del selector (US-DASH-05).
 *
 * Lo comparten el disparador del encabezado -que muestra el periodo vigente- y
 * la hoja de opciones. Con dos copias, cambiar un rotulo dejaria el boton
 * diciendo una cosa y la lista otra.
 */
export const ETIQUETA_DE_PERIODO: Record<PeriodoDashboard, string> = {
  SEMANA: MENSAJES_DASHBOARD.periodoSemana,
  MES: MENSAJES_DASHBOARD.periodoMes,
  TRIMESTRE: MENSAJES_DASHBOARD.periodoTrimestre,
  ANIO: MENSAJES_DASHBOARD.periodoAnio,
  PERSONALIZADO: MENSAJES_DASHBOARD.periodoPersonalizado,
};
