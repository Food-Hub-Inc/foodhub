/**
 * Formateo de valores para mostrar en pantalla.
 *
 * Mismo criterio que `apps/admin/src/lib/formato.ts`: si el formato de un
 * precio o una fecha cambia, cambia en un solo lugar y no en cada tarjeta.
 */

const LOCALE = 'es-AR';

/**
 * Se construyen una vez a nivel de módulo. `Intl.NumberFormat` e
 * `Intl.DateTimeFormat` son caros de instanciar y una lista de 10
 * publicaciones los usaría 10 veces por render si se crearan dentro del
 * componente.
 */
const formatoPrecio = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'ARS',
});

const formatoFecha = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/**
 * `publicacion.precio` llega como string desde la API (columna `numeric`, ver
 * el comentario de `precioSchema` en `packages/shared`): convertirlo a número
 * acá, en el único lugar que lo muestra, no en el contrato.
 *
 * "150.5" → "$ 150,50".
 */
export function formatearPrecio(precio: string): string {
  return formatoPrecio.format(Number(precio));
}

/** "2026-08-14T18:30:00.000Z" → "14/08/2026". */
export function formatearFecha(iso: string): string {
  return formatoFecha.format(new Date(iso));
}

const formatoMesYAnio = new Intl.DateTimeFormat(LOCALE, {
  month: 'long',
  year: 'numeric',
});

/**
 * Mes y año, para el "Miembro desde" del perfil público del cliente.
 *
 * SIN EL DÍA A PROPÓSITO: la fecha exacta de registro no le dice nada al
 * cocinero y es un dato más preciso del que hace falta publicar. Lo que
 * importa es la antigüedad, y para eso alcanza el mes.
 *
 * "2026-08-14T18:30:00.000Z" → "agosto de 2026".
 */
export function formatearMesYAnio(iso: string): string {
  return formatoMesYAnio.format(new Date(iso));
}

/**
 * Hora sin fecha, para la línea de tiempo del pedido y el rango estimado
 * (US-PED-02 y US-PED-07: "nombre del evento, horario").
 *
 * "2026-08-14T18:30:00.000Z" → "15:30" en la zona horaria del dispositivo. Las
 * pantallas le agregan el " hs" cuando corresponde, porque el rango lo escribe
 * una sola vez ("Estimado 14:05 – 14:15 hs") y no una por extremo.
 */
const formatoHora = new Intl.DateTimeFormat(LOCALE, {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function formatearHora(fecha: Date | string): string {
  return formatoHora.format(
    typeof fecha === 'string' ? new Date(fecha) : fecha,
  );
}

/**
 * Cuánto pasó desde un momento dado, en la forma que pide US-PED-03: "tiempo
 * transcurrido desde que el pedido fue recibido (ej. 'hace 3 min')".
 *
 * Se corta en días: un pedido que lleva más de una semana esperando respuesta no
 * existe -la expiración automática lo cierra a los quince minutos (US-PED-10)- y
 * en las pestañas de historial la tarjeta muestra la fecha, no el relativo.
 *
 * Función PURA salvo por el reloj, que se puede inyectar para probarla.
 */
export function tiempoTranscurrido(
  desde: string,
  ahora: Date = new Date(),
): string {
  const minutos = Math.floor(
    (ahora.getTime() - new Date(desde).getTime()) / 60_000,
  );

  if (minutos < 1) return 'recién';
  if (minutos < 60) return `hace ${String(minutos)} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${String(horas)} h`;

  const dias = Math.floor(horas / 24);
  return `hace ${String(dias)} ${dias === 1 ? 'día' : 'días'}`;
}
