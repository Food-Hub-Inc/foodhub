import { cn } from '@heroui/react';

/**
 * Combina clases de Tailwind resolviendo los conflictos (la última gana).
 *
 * Envuelve el `cn` de tailwind-variants por una razón concreta: ese devuelve
 * `string | undefined`, y con `exactOptionalPropertyTypes` activado un
 * `className` que puede ser `undefined` no es asignable a los componentes de
 * HeroUI, que lo declaran obligatorio cuando está presente. Acá se normaliza
 * una vez en lugar de escribir `?? ''` en cada componente.
 */
export function clases(
  ...valores: (string | false | null | undefined)[]
): string {
  return cn(...valores) ?? '';
}
