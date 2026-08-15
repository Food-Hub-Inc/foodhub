/**
 * Contrato común de los íconos del panel.
 *
 * Vive en su propio módulo, y no dentro de `index.tsx`, porque ese archivo
 * exporta únicamente componentes: es la condición que pide
 * `react-refresh/only-export-components` para conservar el estado al guardar.
 */
export interface PropsIcono {
  /**
   * Clases de tamaño y color. El ícono no fija ninguna de las dos: hereda el
   * color del contenedor vía `currentColor` y toma `size-5` solo si nadie
   * indica otra cosa.
   */
  className?: string | undefined;
}
