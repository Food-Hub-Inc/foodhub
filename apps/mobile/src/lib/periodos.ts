import {
  rangoDePeriodo,
  type PeriodoDashboard,
  type PeriodoPredefinido,
  type RangoDashboard,
} from '@foodhub/shared';

/**
 * El período del dashboard, del lado de la interfaz (US-DASH-05).
 *
 * El CÁLCULO de los cuatro rangos predefinidos vive en `@foodhub/shared`
 * (`rangoDePeriodo`), no acá: es una regla del dominio y allá la puede probar el
 * vitest de la API, que es el único runner del monorepo. Este archivo tiene lo
 * que solo le sirve a la pantalla: cómo se escribe el rango activo, cómo se
 * arma la grilla del calendario y cómo se recortan las fechas que elige el
 * cocinero.
 *
 * Todo trabaja en la zona horaria LOCAL, que es la del cocinero. La conversión a
 * UTC ocurre en un único lugar, `aRangoDeApi`, justo antes de salir a la red.
 */

const LOCALE = 'es-AR';

/**
 * Zona de respaldo si el runtime no expone `resolvedOptions().timeZone`.
 *
 * La app es es-AR y el proyecto no sale de Argentina, así que asumir la zona
 * del país es más honesto que mandar UTC y correr un pedido de las 23 h al día
 * siguiente. Cuando el dispositivo sí la informa, manda la suya.
 */
const ZONA_HORARIA_POR_DEFECTO = 'America/Argentina/Buenos_Aires';

/**
 * Se construyen una vez a nivel de módulo por el mismo motivo que en
 * `formato.ts`: `Intl.DateTimeFormat` es caro de instanciar y el encabezado del
 * calendario lo usaría en cada render.
 */
const formatoDiaMes = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
});

const formatoDiaMesAnio = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const formatoMesAnio = new Intl.DateTimeFormat(LOCALE, {
  month: 'long',
  year: 'numeric',
});

/**
 * Algunos ICU escriben el mes abreviado con punto ("13 may."). El ejemplo del
 * criterio no lo lleva ("1 may – 13 may"), así que se saca.
 */
function sinPunto(texto: string): string {
  return texto.replace(/\./g, '');
}

/**
 * El período elegido, tal como lo guarda la pantalla.
 *
 * Lleva las dos fechas ADEMÁS de la opción: con "Personalizado" no hay forma de
 * derivarlas, y recalcular las predefinidas en cada render haría que el rango se
 * moviera solo al cruzar la medianoche con la pantalla abierta.
 */
export interface SeleccionDePeriodo {
  periodo: PeriodoDashboard;
  desde: Date;
  hasta: Date;
}

/** Una de las cuatro opciones predefinidas, ya resuelta a fechas concretas. */
export function seleccionPredefinida(
  periodo: PeriodoPredefinido,
): SeleccionDePeriodo {
  return { periodo, ...rangoDePeriodo(periodo) };
}

/** Medianoche del día, en hora local. Es el "Desde" de un rango. */
export function inicioDelDia(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

/**
 * Último instante del día, en hora local. Es el "Hasta" de un rango.
 *
 * Sin esto, elegir el mismo día en "Desde" y "Hasta" daría un rango de duración
 * cero y el dashboard aparecería vacío con un filtro que el cocinero lee como
 * "hoy".
 */
export function finDelDia(fecha: Date): Date {
  return new Date(
    fecha.getFullYear(),
    fecha.getMonth(),
    fecha.getDate(),
    23,
    59,
    59,
    999,
  );
}

/** La zona IANA del dispositivo, con respaldo para runtimes sin `Intl`. */
function zonaHorariaDelDispositivo(): string {
  try {
    return (
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      ZONA_HORARIA_POR_DEFECTO
    );
  } catch {
    return ZONA_HORARIA_POR_DEFECTO;
  }
}

/**
 * Las dos fechas como las espera la API: instantes en UTC, más la zona del
 * dispositivo.
 *
 * La zona viaja en el rango y no como un dato del usuario porque `usuario` no
 * la guarda: el mismo cocinero puede abrir la app desde otra zona y las
 * métricas por día y por hora tienen que seguir su reloj, no el del servidor.
 */
export function aRangoDeApi(desde: Date, hasta: Date): RangoDashboard {
  return {
    desde: desde.toISOString(),
    hasta: hasta.toISOString(),
    zonaHoraria: zonaHorariaDelDispositivo(),
  };
}

/**
 * El rango activo, como lo escribe US-DASH-05: "indicando visualmente el rango
 * de fechas activo (ej. '1 may – 13 may')".
 *
 * El año aparece solo cuando los dos extremos caen en años distintos. Ponerlo
 * siempre alargaría el rótulo de las cuatro opciones predefinidas, que por
 * definición nunca cruzan un 31 de diciembre.
 */
export function describirRango(desde: Date, hasta: Date): string {
  const cruzaDeAnio = desde.getFullYear() !== hasta.getFullYear();
  const formato = cruzaDeAnio ? formatoDiaMesAnio : formatoDiaMes;

  return `${sinPunto(formato.format(desde))} – ${sinPunto(formato.format(hasta))}`;
}

/** Una fecha suelta, para los campos "Desde" y "Hasta" del modo personalizado. */
export function describirFecha(fecha: Date): string {
  return sinPunto(formatoDiaMesAnio.format(fecha));
}

/** "agosto de 2026", para el encabezado del calendario. */
export function describirMes(mes: Date): string {
  return formatoMesAnio.format(mes);
}

/** Dos fechas del mismo día calendario, sin mirar la hora. */
export function esElMismoDia(una: Date, otra: Date): boolean {
  return (
    una.getFullYear() === otra.getFullYear() &&
    una.getMonth() === otra.getMonth() &&
    una.getDate() === otra.getDate()
  );
}

/** El mes anterior o el siguiente al visible, siempre en su día 1. */
export function correrMes(mes: Date, pasos: number): Date {
  return new Date(mes.getFullYear(), mes.getMonth() + pasos, 1);
}

/**
 * Las semanas del mes como filas de siete celdas, con `null` en los huecos.
 *
 * La semana arranca el LUNES, igual que `rangoDePeriodo` en `@foodhub/shared`:
 * si la grilla y el cálculo de "Esta semana" no coincidieran, el cocinero vería
 * un rango que no se corresponde con lo que le marca el calendario.
 */
export function semanasDelMes(mes: Date): (Date | null)[][] {
  const primero = new Date(mes.getFullYear(), mes.getMonth(), 1);
  const diasDelMes = new Date(
    mes.getFullYear(),
    mes.getMonth() + 1,
    0,
  ).getDate();
  // getDay(): 0 es domingo. Se corre para que el lunes sea la primera columna.
  const huecosIniciales = (primero.getDay() + 6) % 7;

  const celdas: (Date | null)[] = Array.from(
    { length: huecosIniciales },
    () => null,
  );
  for (let dia = 1; dia <= diasDelMes; dia += 1) {
    celdas.push(new Date(mes.getFullYear(), mes.getMonth(), dia));
  }
  while (celdas.length % 7 !== 0) celdas.push(null);

  const semanas: (Date | null)[][] = [];
  for (let inicio = 0; inicio < celdas.length; inicio += 7) {
    semanas.push(celdas.slice(inicio, inicio + 7));
  }
  return semanas;
}
