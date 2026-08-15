import type { ReactNode } from 'react';

/**
 * Input con un ícono decorativo pegado al borde izquierdo, como muestran las
 * pantallas de acceso de la maquetación.
 *
 * El ícono lleva `pointer-events-none`: sin eso, hacer clic justo sobre el
 * dibujo no enfoca el campo que está debajo y el usuario cree que el
 * formulario no responde.
 */
export function CampoConIcono({
  icono,
  children,
}: {
  icono: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-disabled">
        {icono}
      </span>
      {children}
    </div>
  );
}
