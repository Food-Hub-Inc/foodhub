/**
 * Atributos comunes a todo trazo del sistema de iconografía.
 *
 * La guía visual (sección 05) fija stroke 1.75 sobre un viewBox de 24×24 y
 * remates redondeados. Cada ícono los difunde en sus paths en lugar de
 * repetirlos, así un cambio de grosor entra en un solo lugar.
 *
 * Vive en su propio archivo y no junto a `Lienzo` porque el Fast Refresh de
 * Metro solo conserva el estado si un módulo exporta únicamente componentes.
 */
/** Atributos comunes a todo trazo del sistema (guía visual: stroke 1.75). */
export const TRAZO = {
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;
