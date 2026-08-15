import { clases } from '../lib/clases.js';
import { IconoPin } from './iconos/index.js';

/**
 * Marca de FoodHub tal como aparece en la maquetación: el pin naranja y el
 * wordmark partido en dos, "Food" en el color primario y "hub" en el color de
 * apoyo.
 *
 * El nombre completo va en un `aria-label` sobre un solo elemento: separado en
 * dos `<span>`, un lector de pantalla lo leería como "Food. hub".
 */
export function LogoFoodhub({ className }: { className?: string | undefined }) {
  return (
    <span
      aria-label="FoodHub"
      className={clases('inline-flex items-center gap-2', className)}
      role="img"
    >
      <IconoPin className="size-6 text-primary" />
      <span
        aria-hidden="true"
        className="text-h2 font-extrabold tracking-tight"
      >
        <span className="text-primary">Food</span>
        <span className="text-secondary">hub</span>
      </span>
    </span>
  );
}
