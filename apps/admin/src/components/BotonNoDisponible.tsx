import { useId, type ReactNode } from 'react';
import { Button } from '@heroui/react';

/**
 * Botón presente en la maquetación cuya acción todavía no existe en el
 * contrato de la API.
 *
 * POR QUÉ SE DIBUJA EN VEZ DE OMITIRSE
 *
 * La maquetación aprobada en la Etapa 5 lo ubica en un lugar concreto de la
 * pantalla. Sacarlo cambiaría la composición del encabezado y de la barra de
 * filtros respecto de lo que se validó con el equipo. Dejarlo activo apuntando
 * a un endpoint inexistente sería peor: un error de red en vez de una
 * explicación.
 *
 * El motivo no queda solo en el `title` —que un teclado no alcanza— sino en un
 * texto oculto referenciado con `aria-describedby`: un botón deshabilitado sin
 * explicación es una pared sin cartel.
 */
export function BotonNoDisponible({
  children,
  motivo,
  className,
}: {
  children: ReactNode;
  motivo: string;
  className?: string | undefined;
}) {
  const idMotivo = useId();

  return (
    // El `title` va en el contenedor y no en el botón: React Aria no reenvía
    // ese atributo, y sobre un elemento deshabilitado el navegador tampoco
    // dispararía el tooltip nativo.
    <span className="inline-flex" title={motivo}>
      <Button
        aria-describedby={idMotivo}
        className={className ?? ''}
        isDisabled
        variant="secondary"
      >
        {children}
      </Button>
      <span className="sr-only" id={idMotivo}>
        {motivo}
      </span>
    </span>
  );
}
