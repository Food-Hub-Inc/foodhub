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
