import type { Aleatorio } from './aleatorio.js';

/**
 * Ventana temporal del dataset y utilidades de fecha.
 *
 * POR QUE LA FECHA DE CORTE ES FIJA Y NO `new Date()`
 *
 * Todo el dataset se ancla a `FIN_VENTANA`. Si el corte fuera "ahora", cada
 * corrida moveria las fechas y los pedidos "de hoy" de una captura dejarian
 * de coincidir con los de la siguiente. Con un corte fijo, la seed es
 * reproducible; para refrescar el dataset se actualiza esta constante.
 *
 * El script avisa por consola si la fecha quedo muy vieja respecto del reloj
 * del sistema, porque los filtros "hoy" y "ultimos 7 dias" del dashboard
 * empiezan a devolver vacio.
 */

/** Cierre de la ventana: fecha a la que corresponde el "hoy" del dataset. */
export const FIN_VENTANA = new Date('2026-08-29T21:00:00.000Z');

/** Apertura de la ventana. Seis meses de historial (decision del equipo). */
export const INICIO_VENTANA = new Date('2026-03-01T12:00:00.000Z');

const MINUTO = 60 * 1000;
const DIA = 24 * 60 * MINUTO;

export function sumarMinutos(fecha: Date, minutos: number): Date {
  return new Date(fecha.getTime() + minutos * MINUTO);
}

export function sumarDias(fecha: Date, dias: number): Date {
  return new Date(fecha.getTime() + dias * DIA);
}

/** Recorta una fecha al rango [minimo, maximo]. */
export function acotar(fecha: Date, minimo: Date, maximo: Date): Date {
  if (fecha < minimo) return minimo;
  return fecha > maximo ? maximo : fecha;
}

export function diasEntre(desde: Date, hasta: Date): number {
  return Math.round((hasta.getTime() - desde.getTime()) / DIA);
}

/**
 * Fecha dentro de un rango con SESGO HACIA EL PRESENTE.
 *
 * Un reparto uniforme dejaria el mismo volumen en marzo que en agosto, y el
 * dashboard mostraria una plataforma estancada. Elevar el azar a la cuarta
 * concentra la masa cerca del corte: el negocio "crece", los filtros de 7 y
 * 30 dias devuelven datos y el historial largo sigue existiendo.
 *
 * `desde` es parametrico porque cada cocinero tiene su propio piso: no puede
 * haber recibido un pedido antes de registrarse. Reescalar el rango -en lugar
 * de generar sobre la ventana completa y recortar despues- conserva el sesgo:
 * un recorte amontonaria en el piso todo lo que cayo antes.
 */
export function fechaConSesgoReciente(
  azar: Aleatorio,
  desde: Date = INICIO_VENTANA,
  hasta: Date = FIN_VENTANA,
): Date {
  const total = Math.max(hasta.getTime() - desde.getTime(), 60 * 60 * 1000);
  return new Date(desde.getTime() + total * azar.flotante() ** 0.25);
}

/**
 * Lleva la fecha a una hora verosimil de pedido de comida.
 *
 * Sin esto los pedidos caen uniformemente a las 4 de la manana y el grafico
 * de "horarios pico" del dashboard del cocinero no dice nada. Se reparte
 * entre el mediodia y la noche, con la noche mas cargada, que es como se
 * comporta el rubro.
 */
export function enHorarioDeComida(fecha: Date, azar: Aleatorio): Date {
  const franja = azar.pesado({ mediodia: 35, tarde: 15, noche: 50 });
  const hora =
    franja === 'mediodia'
      ? azar.entero(11, 14)
      : franja === 'tarde'
        ? azar.entero(15, 18)
        : azar.entero(19, 23);

  const ajustada = new Date(fecha);
  ajustada.setHours(hora, azar.entero(0, 59), azar.entero(0, 59), 0);
  return ajustada;
}
