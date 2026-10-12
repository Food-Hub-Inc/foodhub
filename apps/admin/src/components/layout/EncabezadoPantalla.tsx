import type { ReactNode } from 'react';
import { Button } from '@heroui/react';
import { TEXTOS_PANEL } from '../../lib/textos.js';
import { IconoCampana } from '../iconos/index.js';
// import { IconoConfiguracion } from '../iconos/index.js';

/**
 * Encabezado común a todas las pantallas del panel.
 *
 * Fija la estructura de la maquetación: título y contador a la izquierda,
 * acciones propias de la pantalla a la derecha y, siempre al final, los dos
 * botones globales (notificaciones y ajustes). Tenerlo centralizado es lo que
 * garantiza que el botón primario esté siempre en el mismo lugar, que es el
 * principio de consistencia de la guía de UX.
 */
export function EncabezadoPantalla({
  titulo,
  subtitulo,
  acciones,
  notificacionesPendientes,
}: {
  titulo: string;
  /** Contador o descripción bajo el título. `null` mientras carga. */
  subtitulo: ReactNode;
  acciones?: ReactNode;
  /**
   * Contador de la campana. `null` mientras no exista el módulo de
   * notificaciones del panel: no hay endpoint que lo informe.
   */
  notificacionesPendientes?: number | null;
}) {
  const muestraContador =
    notificacionesPendientes !== null &&
    notificacionesPendientes !== undefined &&
    notificacionesPendientes > 0;

  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border bg-surface px-8 py-6">
      <div className="min-w-0">
        <h1 className="text-h1 font-extrabold text-text-primary">{titulo}</h1>
        <p className="mt-1 text-body text-text-secondary">{subtitulo}</p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {acciones}

        <span aria-hidden="true" className="mx-1 h-6 w-px bg-border" />

        <Button
          aria-label={TEXTOS_PANEL.notificaciones}
          className="relative size-10"
          isIconOnly
          variant="tertiary"
        >
          <IconoCampana className="size-5" />
          {muestraContador ? (
            <span className="absolute top-1.5 right-1.5 flex min-w-4 items-center justify-center rounded-full bg-error px-1 text-caption font-bold text-surface">
              {notificacionesPendientes}
            </span>
          ) : null}
        </Button>

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
      </div>
    </header>
  );
}
