import type { ReactNode } from 'react';
import { Button } from '@heroui/react';

/**
 * Estado VACÍO de una pantalla con datos.
 *
 * La guía de UX es explícita: "un estado vacío que dice solo 'Sin resultados'
 * es un estado sin terminar". Siempre lleva tres piezas: un ícono que lo
 * distingue de un error, la explicación de por qué no hay nada, y —cuando hay
 * una— la acción que devuelve resultados.
 */
export function EstadoVacio({
  icono,
  mensaje,
  accion,
}: {
  icono: ReactNode;
  mensaje: string;
  accion?: { etiqueta: string; alPresionar: () => void };
}) {
  return (
    <div className="aparece flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-background text-text-disabled">
        {icono}
      </span>

      <p className="max-w-md text-body text-text-secondary">{mensaje}</p>

      {accion ? (
        <Button onPress={accion.alPresionar} size="sm" variant="secondary">
          {accion.etiqueta}
        </Button>
      ) : null}
    </div>
  );
}
