import type { EstadoPedido, OrigenTransicion } from '@foodhub/shared';
import type { Aleatorio } from '../lib/aleatorio.js';
import { sumarMinutos } from '../lib/tiempo.js';
import type { MotivoDeCierre, PlanPedido } from './06-pedidos.js';

/**
 * Linea de tiempo de un pedido: las filas de `historial_estado_pedido`.
 *
 * Se separa de 06-pedidos.ts porque son dos responsabilidades distintas:
 * alla se decide QUE pedidos existen y aca COMO evoluciono cada uno. Ademas
 * las cuatro ramas del ciclo de vida entran justas en el limite de complejidad
 * de ESLint si comparten archivo con la planificacion.
 *
 * La primera fila siempre tiene `estadoPedidoAnterior` en null: la creacion no
 * viene de ningun estado previo, y el CHECK `historial_transicion_efectiva`
 * exige que anterior y actual sean distintos cuando el anterior existe.
 */

export interface Transicion {
  estadoAnterior: EstadoPedido | null;
  estado: EstadoPedido;
  origen: OrigenTransicion;
  /** Null cuando el origen es SISTEMA: la expiracion no tiene responsable. */
  responsableId: string | null;
  motivo: string | null;
  fecha: Date;
  /** Solo en ACEPTADO: lo que el cocinero prometio al aceptar. */
  tiempoEstimadoMin?: number;
  /** Solo en COMPLETADO: lo que realmente tardo desde que acepto. */
  minutosDesdeAceptacion?: number;
}

/**
 * Minutos que espera un pedido antes de expirar solo.
 *
 * Coincide con `pedido_expiracion_minutos` de `configuracion_sistema`
 * (RF057, valor de fabrica 15). Si ese parametro cambiara, este dataset
 * seguiria siendo coherente: los pedidos ya expiraron, nadie los reevalua.
 */
const MINUTOS_DE_EXPIRACION = 15;

/** Texto legible del motivo, tal como lo arma `motivoParaHistorial` de la API. */
function textoDeMotivo(
  motivo: MotivoDeCierre,
  nombreMotivo: string | null,
): string | null {
  const partes = [nombreMotivo, motivo.motivoTexto].filter(
    (parte): parte is string => parte !== null && parte !== '',
  );
  return partes.length === 0 ? null : partes.join(' - ');
}

/** Tiempo que el cocinero promete al aceptar: el mayor de los platos del pedido. */
function tiempoPrometido(plan: PlanPedido): number {
  const mayor = Math.max(
    ...plan.items.map((item) => item.publicacion.plato.tiempoPreparacion),
  );
  // Se redondea a multiplos de cinco: nadie promete "37 minutos".
  return Math.max(15, Math.round(mayor / 5) * 5);
}

function caminoCompletado(azar: Aleatorio, plan: PlanPedido): Transicion[] {
  const estimado = tiempoPrometido(plan);
  const fechaAceptado = sumarMinutos(plan.fechaCreacion, azar.entero(2, 14));
  // Se cocina entre un 15 % menos y un 40 % mas de lo prometido: cumplir
  // clavado el estimado en los 750 pedidos delataria al generador.
  const realMin = Math.max(
    10,
    Math.round(estimado * (0.85 + azar.flotante() * 0.55)),
  );
  const fechaListo = sumarMinutos(fechaAceptado, realMin);
  // El cliente tarda en pasar a retirar.
  const fechaCompletado = sumarMinutos(fechaListo, azar.entero(5, 45));

  return [
    {
      estadoAnterior: 'CREADO',
      estado: 'ACEPTADO',
      origen: 'COCINERO',
      responsableId: plan.cocinero.id,
      motivo: null,
      fecha: fechaAceptado,
      tiempoEstimadoMin: estimado,
    },
    {
      estadoAnterior: 'ACEPTADO',
      estado: 'LISTO',
      origen: 'COCINERO',
      responsableId: plan.cocinero.id,
      motivo: null,
      fecha: fechaListo,
    },
    {
      estadoAnterior: 'LISTO',
      estado: 'COMPLETADO',
      origen: 'COCINERO',
      responsableId: plan.cocinero.id,
      motivo: null,
      fecha: fechaCompletado,
      minutosDesdeAceptacion: Math.round(
        (fechaCompletado.getTime() - fechaAceptado.getTime()) / 60_000,
      ),
    },
  ];
}

function cierreRechazado(entrada: {
  azar: Aleatorio;
  plan: PlanPedido;
  motivo: string | null;
}): Transicion {
  const { azar, plan } = entrada;
  const desenlace = plan.desenlace;

  if (desenlace === 'TIEMPO_AGOTADO') {
    // El job de pg_cron corre cada tanto, asi que la expiracion se registra
    // algo despues del umbral, no exactamente al minuto quince.
    return {
      estadoAnterior: 'CREADO',
      estado: 'RECHAZADO',
      origen: 'SISTEMA',
      responsableId: null,
      motivo: null,
      fecha: sumarMinutos(
        plan.fechaCreacion,
        MINUTOS_DE_EXPIRACION + azar.entero(0, 4),
      ),
    };
  }

  const porCocinero = desenlace === 'RECHAZADO_POR_COCINERO';
  return {
    estadoAnterior: 'CREADO',
    estado: 'RECHAZADO',
    origen: porCocinero ? 'COCINERO' : 'CLIENTE',
    responsableId: porCocinero ? plan.cocinero.id : plan.cliente.id,
    motivo: entrada.motivo,
    // El cocinero mira la bandeja y contesta; el cliente que se arrepiente lo
    // hace enseguida, dentro de la ventana de cancelacion de RF057.
    fecha: sumarMinutos(
      plan.fechaCreacion,
      porCocinero ? azar.entero(2, 13) : azar.entero(1, 5),
    ),
  };
}

export function transicionesDe(entrada: {
  azar: Aleatorio;
  plan: PlanPedido;
  motivo: MotivoDeCierre;
  nombreMotivo: string | null;
}): Transicion[] {
  const { azar, plan } = entrada;

  const creacion: Transicion = {
    estadoAnterior: null,
    estado: 'CREADO',
    origen: 'CLIENTE',
    responsableId: plan.cliente.id,
    motivo: null,
    fecha: plan.fechaCreacion,
  };

  if (plan.desenlace === 'COMPLETADO') {
    return [creacion, ...caminoCompletado(azar, plan)];
  }

  return [
    creacion,
    cierreRechazado({
      azar,
      plan,
      motivo: textoDeMotivo(entrada.motivo, entrada.nombreMotivo),
    }),
  ];
}
