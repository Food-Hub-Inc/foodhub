import type { ReactNode } from 'react';
import { clases } from '../lib/clases.js';

/**
 * Insignia de estado: el "badge" de las tablas del panel.
 *
 * POR QUÉ NO SE USA EL `Chip` DE HEROUI
 *
 * `Chip` colorea con la paleta semántica de la librería (`accent`, `success`,
 * `warning`, `danger`), que ya está mapeada a los tokens de FoodHub en
 * `global.css`. Alcanza para tres de los cinco tonos que necesita el panel,
 * pero no para el gris de "eliminado" ni para el gris de apoyo del rol
 * `CLIENTE`, y `Chip` no admite un tono propio sin pisar sus clases. Se dibuja
 * acá, con los tokens de la guía visual y sin ninguna otra opción de color.
 *
 * El color NUNCA es el único canal: la insignia siempre lleva su texto.
 */

/** Tonos disponibles. Cada uno apunta a un token de la guía visual. */
export type TonoInsignia =
  'naranja' | 'gris' | 'verde' | 'ambar' | 'rojo' | 'neutro';

const TONOS: Record<TonoInsignia, string> = {
  naranja: 'bg-primary/12 text-primary',
  gris: 'bg-secondary/15 text-secondary',
  verde: 'bg-success/12 text-success',
  ambar: 'bg-warning/12 text-warning',
  rojo: 'bg-error/12 text-error',
  neutro: 'bg-text-disabled/25 text-text-secondary',
};

export function Insignia({
  children,
  tono,
  className,
}: {
  children: ReactNode;
  tono: TonoInsignia;
  className?: string | undefined;
}) {
  return (
    <span
      className={clases(
        'inline-flex items-center rounded-full px-2.5 py-1 text-caption font-semibold tracking-wide whitespace-nowrap',
        TONOS[tono],
        className,
      )}
    >
      {children}
    </span>
  );
}
