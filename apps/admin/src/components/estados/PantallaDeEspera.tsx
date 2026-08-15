import { Spinner } from '@heroui/react';
import { LogoFoodhub } from '../LogoFoodhub.js';

/**
 * Pantalla completa de espera, para el único momento en que todavía no se sabe
 * qué mostrar: mientras se resuelve si hay sesión y quién es.
 *
 * Acá sí corresponde un indicador genérico y no un esqueleto: no se conoce la
 * forma del contenido que viene, porque depende de si la respuesta lleva al
 * panel o al login.
 */
export function PantallaDeEspera({ mensaje }: { mensaje: string }) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background"
    >
      <LogoFoodhub />
      <div className="flex items-center gap-3 text-body text-text-secondary">
        <Spinner className="size-4" />
        <span>{mensaje}</span>
      </div>
    </div>
  );
}
