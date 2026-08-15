import { useResolveClassNames } from 'uniwind';

/**
 * Puente entre los tokens de la guía visual y las APIs nativas que reciben el
 * color como VALOR y no como estilo.
 *
 * POR QUÉ HACE FALTA
 * ---------------------------------------------------------------------------
 * Casi toda la interfaz se pinta con `className` y uniwind resuelve el token.
 * Pero la barra de tabs de react-navigation no es un componente nuestro: sus
 * colores entran por `tabBarActiveTintColor`, `tabBarStyle` y compañía, que
 * esperan un `ColorValue`. Escribir el `#EC6829` ahí pondría un literal fuera
 * de la guía y desincronizaría la barra del resto de la app el día que el
 * color cambie.
 *
 * Es el mismo recurso que ya usan `Lienzo.tsx` (para el `currentColor` de los
 * SVG) y `HojaInferior.tsx` (para el fondo de la hoja).
 */

/** Valor del color de un token, a partir de su clase `text-*`. */
export function useColorDeToken(clase: string): string | undefined {
  const estilo = useResolveClassNames(clase);
  return typeof estilo.color === 'string' ? estilo.color : undefined;
}
