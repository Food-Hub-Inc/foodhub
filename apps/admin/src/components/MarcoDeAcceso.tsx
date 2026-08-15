import type { ReactNode } from 'react';
import { LogoFoodhub } from './LogoFoodhub.js';

/**
 * Envoltorio de las pantallas públicas del panel: ingreso (PAN-AUT-03) y
 * definición de contraseña del administrador invitado.
 *
 * Marca centrada arriba, título y bajada, y una tarjeta angosta debajo. No
 * lleva barra lateral a propósito: quien está acá todavía no tiene sesión de
 * administrador, y una navegación que no puede usar es ruido.
 *
 * El ancho fijo de 420 px sale de la maquetación. Un formulario de dos campos
 * estirado a todo el monitor obliga a recorrer la pantalla con la vista para
 * unir la etiqueta con su input.
 */
export function MarcoDeAcceso({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="aparece w-full max-w-[420px]">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <LogoFoodhub />
          <div>
            <h1 className="text-h1 font-extrabold text-text-primary">
              {titulo}
            </h1>
            <p className="mt-1 text-body text-text-secondary">{descripcion}</p>
          </div>
        </div>

        {children}
      </div>
    </main>
  );
}

/** Tarjeta blanca sobre la que se apoya el contenido de una pantalla de acceso. */
export function TarjetaDeAcceso({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-7">
      {children}
    </div>
  );
}
