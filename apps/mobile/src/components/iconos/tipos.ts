/**
 * Contrato del sistema de iconografía (guía visual, sección 05).
 *
 * Los íconos se dibujan con `react-native-svg` sobre un viewBox de 24×24 y
 * trazo 1.75, tal como fija la guía. No se usa una librería de íconos: el set
 * de la guía tiene un trazo propio y mezclarlo con otro se nota enseguida.
 *
 * El color NUNCA se pasa como valor: se pasa como clase de Tailwind
 * (`text-primary`, `text-text-secondary`, `text-error`…) y el componente base
 * la resuelve contra los tokens de `global.css`. Así un ícono no puede quedar
 * con un color que no exista en la guía.
 */
export interface PropsIcono {
  /**
   * Clase de color de FoodHub. Se resuelve contra los tokens y se aplica como
   * `currentColor` del SVG.
   * @default 'text-text-secondary'
   */
  className?: string;
  /**
   * Lado del ícono en píxeles independientes. La guía dibuja sobre 24×24; los
   * tamaños distintos son escalados del mismo trazo.
   * @default 24
   */
  size?: number;
}
