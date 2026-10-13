import type { ReactNode } from 'react';
// import { Button } from '@heroui/react';
// import { TEXTOS_PANEL } from '../../lib/textos.js';
// import { IconoConfiguracion } from '../iconos/index.js';

/**
 * Encabezado común a todas las pantallas del panel.
 *
 * Fija la estructura de la maquetación: título y contador a la izquierda y
 * acciones propias de la pantalla a la derecha. Tenerlo centralizado es lo que
 * garantiza que el botón primario esté siempre en el mismo lugar, que es el
 * principio de consistencia de la guía de UX.
 *
 * SIN CAMPANA: ningún requisito ni historia de usuario hace al administrador
 * destinatario de una notificación —en todas las del módulo NOT es quien las
 * emite—, así que un historial suyo estaría siempre vacío. Decisión del equipo
 * del 13/10/2026.
 */
export function EncabezadoPantalla({
  titulo,
  subtitulo,
  acciones,
}: {
  titulo: string;
  /** Contador o descripción bajo el título. `null` mientras carga. */
  subtitulo: ReactNode;
  acciones?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border bg-surface px-8 py-6">
      <div className="min-w-0">
        <h1 className="text-h1 font-extrabold text-text-primary">{titulo}</h1>
        <p className="mt-1 text-body text-text-secondary">{subtitulo}</p>
      </div>

      {acciones ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {acciones}
        </div>
      ) : null}

      {/*
        Se saca del encabezado: no navegaba a ningún lado y la configuración
        ya es accesible desde el sidebar.
        <Button
          aria-label={TEXTOS_PANEL.ajustes}
          className="size-10"
          isIconOnly
          variant="tertiary"
        >
          <IconoConfiguracion className="size-5" />
        </Button>
      */}
    </header>
  );
}
