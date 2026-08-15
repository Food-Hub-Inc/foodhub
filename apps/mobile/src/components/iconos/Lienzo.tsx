import type { ReactNode } from 'react';
import { Svg } from 'react-native-svg';
import { useResolveClassNames } from 'uniwind';
import type { PropsIcono } from './tipos';

/**
 * Base de todos los íconos del sistema.
 *
 * POR QUÉ EL COLOR ENTRA COMO CLASE Y SALE COMO `currentColor`
 * ---------------------------------------------------------------------------
 * `stroke` y `fill` de react-native-svg son props, no estilos: uniwind no las
 * puede alcanzar con `className`. Escribir el color a mano en cada ícono
 * rompería la regla de que ningún componente contiene un literal de color.
 *
 * La salida es resolver la clase con `useResolveClassNames` —que devuelve el
 * estilo ya calculado contra los tokens de `global.css`— y entregarle el valor
 * al `Svg` por su prop `color`. react-native-svg lo usa para resolver
 * `currentColor` en todos los hijos, así que cada trazo declara
 * `stroke="currentColor"` y hereda el token sin conocerlo.
 *
 * El escáner de Tailwind lee las clases del código fuente, no de los atributos
 * `className`: las cadenas que se pasan a este componente generan igual su
 * utilidad en el CSS compilado.
 */
export function Lienzo({
  className = 'text-text-secondary',
  size = 24,
  children,
}: PropsIcono & { children: ReactNode }) {
  const estilo = useResolveClassNames(className);
  const color = typeof estilo.color === 'string' ? estilo.color : undefined;

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      color={color}
      // Un ícono siempre acompaña a un texto o vive dentro de un control que ya
      // tiene su propia etiqueta: anunciarlo por separado duplica la lectura.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {children}
    </Svg>
  );
}
