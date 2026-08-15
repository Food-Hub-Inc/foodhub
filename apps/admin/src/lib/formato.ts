/**
 * Formateo de valores para mostrar en pantalla.
 *
 * Todo lo que se ve en el panel pasa por acá: si el formato de una fecha
 * cambia, cambia en un solo lugar y no en siete tablas.
 */

const LOCALE = 'es-AR';

/**
 * Se construyen una vez a nivel de módulo. `Intl.DateTimeFormat` es caro de
 * instanciar y una tabla de auditoría de 50 filas lo usaría 50 veces por
 * render si se creara dentro del componente.
 */
const formatoFecha = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const formatoFechaHora = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const formatoNumero = new Intl.NumberFormat(LOCALE);

/** `2026-08-14T18:30:00Z` → `14/08/2026`. */
export function formatearFecha(iso: string | null): string {
  const fecha = aFecha(iso);
  return fecha ? formatoFecha.format(fecha) : '—';
}

/** `2026-08-14T18:30:00Z` → `14/08/2026 15:30:00` (hora local del administrador). */
export function formatearFechaHora(iso: string | null): string {
  const fecha = aFecha(iso);
  return fecha ? formatoFechaHora.format(fecha) : '—';
}

/** `824` → `824`; `1500` → `1.500`. */
export function formatearNumero(valor: number): string {
  return formatoNumero.format(valor);
}

function aFecha(iso: string | null): Date | null {
  if (!iso) return null;
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/**
 * Iniciales para el avatar cuando la persona no tiene foto.
 * "Ezequiel", "Aguilar" → "EA".
 */
export function iniciales(nombre: string, apellido: string): string {
  const primera = nombre.trim().charAt(0);
  const segunda = apellido.trim().charAt(0);
  return `${primera}${segunda}`.toUpperCase() || '?';
}

/** "Ezequiel", "Aguilar" → "Ezequiel Aguilar". */
export function nombreCompleto(nombre: string, apellido: string): string {
  return `${nombre} ${apellido}`.trim();
}

/**
 * Identificador abreviado para la columna ID de las tablas.
 *
 * Los identificadores del sistema son UUID de 36 caracteres: mostrarlos
 * completos ocupa más ancho que el resto de la fila junta. Se muestran los
 * primeros ocho y el valor completo queda en el `title` del elemento, que es
 * lo que se copia cuando alguien necesita el id real.
 */
export function idAbreviado(id: string): string {
  return id.slice(0, 8);
}

/**
 * "Mostrando 1–20 de 824 usuarios".
 *
 * Devuelve las dos puntas del rango visible. Con la lista vacía devuelve
 * `null`: no hay rango que mostrar y el pie usa el estado vacío.
 */
export function rangoVisible(
  pagina: number,
  porPagina: number,
  cantidadEnPagina: number,
): { desde: number; hasta: number } | null {
  if (cantidadEnPagina === 0) return null;
  const desde = (pagina - 1) * porPagina + 1;
  return { desde, hasta: desde + cantidadEnPagina - 1 };
}

export function cantidadDePaginas(total: number, porPagina: number): number {
  return Math.max(1, Math.ceil(total / porPagina));
}

/**
 * Convierte el `YYYY-MM-DD` de un `<input type="date">` al ISO 8601 completo
 * que exigen `filtrosAuditoriaSchema` y `filtrosEventoSeguridadSchema`.
 *
 * El límite se calcula sobre la MEDIANOCHE LOCAL, no sobre la UTC: quien filtra
 * "desde el 14/08" en Argentina espera ver lo que pasó a partir de las 00:00 de
 * Mendoza. Tomar `${fecha}T00:00:00Z` correría el corte tres horas y dejaría
 * afuera los registros de la primera madrugada.
 */
export function inicioDelDiaISO(fecha: string): string | undefined {
  const partes = descomponerFecha(fecha);
  if (!partes) return undefined;
  return new Date(
    partes.anio,
    partes.mes - 1,
    partes.dia,
    0,
    0,
    0,
  ).toISOString();
}

/** Contraparte de `inicioDelDiaISO`: el último milisegundo del día local. */
export function finDelDiaISO(fecha: string): string | undefined {
  const partes = descomponerFecha(fecha);
  if (!partes) return undefined;
  return new Date(
    partes.anio,
    partes.mes - 1,
    partes.dia,
    23,
    59,
    59,
    999,
  ).toISOString();
}

function descomponerFecha(
  fecha: string,
): { anio: number; mes: number; dia: number } | null {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  if (!coincidencia) return null;
  const [, anio, mes, dia] = coincidencia;
  return { anio: Number(anio), mes: Number(mes), dia: Number(dia) };
}

/**
 * Sufijo con la fecha del día para los archivos exportados.
 * `auditoria` → `auditoria-2026-08-14.csv`.
 */
export function nombreDeExportacion(base: string): string {
  const hoy = new Date();
  const dosDigitos = (n: number) => String(n).padStart(2, '0');
  const fecha = `${hoy.getFullYear()}-${dosDigitos(hoy.getMonth() + 1)}-${dosDigitos(hoy.getDate())}`;
  return `${base}-${fecha}.csv`;
}
