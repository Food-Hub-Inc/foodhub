/**
 * Constantes operativas del modulo de Ayuda y soporte.
 *
 * Tres grupos conviven aca:
 *
 *   - Tamanos y cantidades del formulario de contacto (US-AYU-03). La
 *     documentacion fija "JPG, PNG o PDF, hasta 3 archivos de 5 MB cada
 *     uno" en el criterio de aceptacion: los numeros se exponen como
 *     constantes para que la API y la UI los lean del mismo lugar.
 *   - Etiquetas literales de los CUATRO tipos de consulta del criterio
 *     (US-AYU-03). En la base la fila tiene un id y un nombre; la UI
 *     muestra SIEMPRE estas cuatro etiquetas y nada mas.
 *
 * El primer grupo evita los numeros magicos; el segundo evita que la UI
 * reescriba los literales del documento.
 */

/** Tope por archivo: 5 MB, del criterio de aceptacion de US-AYU-03. */
export const MAXIMO_ADJUNTO_TICKET_BYTES = 5 * 1024 * 1024;

/** Cantidad maxima de adjuntos por consulta: 3, del mismo criterio. */
export const MAXIMO_ADJUNTOS_POR_CONSULTA = 3;

/**
 * Los cuatro valores que el desplegable de "Tipo de consulta" muestra al
 * usuario (US-AYU-03, criterio literal).
 *
 * Coexisten con los `nombre_tipo_consulta` de la base, que son mas finos:
 * la UI muestra estos cuatro, el servidor los traduce al `id` que
 * corresponda.
 */
export const ETIQUETAS_TIPO_CONSULTA = [
  'Consulta general',
  'Reporte de problema',
  'Sugerencia de mejora',
  'Denuncia',
] as const;

export type EtiquetaTipoConsulta = (typeof ETIQUETAS_TIPO_CONSULTA)[number];
