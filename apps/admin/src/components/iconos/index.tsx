import type { ReactNode } from 'react';
import { clases } from '../../lib/clases.js';
import type { PropsIcono } from './tipos.js';

/**
 * Sistema de íconos del panel de administración.
 *
 * POR QUÉ NO SE INSTALA UNA LIBRERÍA
 *
 * La guía visual de la Etapa 5 define su propio trazo (stroke 1.75 sobre un
 * viewBox de 24×24, extremos y uniones redondeados). Ninguna librería de
 * íconos coincide exactamente con eso, así que traer una obligaría a elegir
 * entre romper la guía o reescribir cada path igual. Se dibujan acá: son
 * veinte formas geométricas simples y el bundle no crece.
 *
 * Todos heredan el color del contenedor (`currentColor`) y son decorativos
 * (`aria-hidden`): el significado lo aporta el texto del botón o su
 * `aria-label`, nunca el dibujo.
 */

function Trazo({
  children,
  className,
}: PropsIcono & { children: ReactNode }): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className={clases('size-5 shrink-0', className)}
      fill="none"
      focusable="false"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Navegación
// ---------------------------------------------------------------------------

export function IconoInicio({ className }: PropsIcono) {
  return (
    <Trazo className={className}>
      <path d="M3.5 10.5 12 3.75l8.5 6.75V19a1.5 1.5 0 0 1-1.5 1.5h-3.5v-6h-7v6H5A1.5 1.5 0 0 1 3.5 19z" />
    </Trazo>
  );
}

export function IconoUsuarios({ className }: PropsIcono) {
  return (
    <Trazo className={className}>
      <path d="M15.5 20.25v-1.5a3.75 3.75 0 0 0-3.75-3.75h-4A3.75 3.75 0 0 0 4 18.75v1.5" />
      <circle cx="9.75" cy="7.5" r="3.25" />
      <path d="M20 20.25v-1.5a3.75 3.75 0 0 0-2.75-3.6M15.25 4.5a3.25 3.25 0 0 1 0 6" />
    </Trazo>
  );
}

export function IconoModeracion({ className }: PropsIcono) {
  return (
    <Trazo className={className}>
      <path d="M12 3.25 4.75 6v6c0 4.2 2.9 7.2 7.25 8.75 4.35-1.55 7.25-4.55 7.25-8.75V6z" />
      <path d="m9.5 11.75 1.9 1.9 3.6-3.9" />
    </Trazo>
  );
}

export function IconoMetricas({ className }: PropsIcono) {
  return (
    <Trazo className={className}>
      <path d="M4.25 4.25v14a1.5 1.5 0 0 0 1.5 1.5h14" />
      <path d="M8.25 15.5v-3M12 15.5V8.75M15.75 15.5v-5" />
    </Trazo>
  );
}

export function IconoAuditoria({ className }: PropsIcono) {
  return (
    <Trazo className={className}>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 7.25V12l3 1.75" />
    </Trazo>
  );
}

export function IconoConfiguracion({ className }: PropsIcono) {
  return (
    <Trazo className={className}>
      <circle cx="12" cy="12" r="2.75" />
      <path d="M19.15 14.25a1.4 1.4 0 0 0 .28 1.55l.05.05a1.7 1.7 0 1 1-2.4 2.4l-.05-.05a1.4 1.4 0 0 0-1.55-.28 1.4 1.4 0 0 0-.85 1.29v.14a1.7 1.7 0 1 1-3.4 0v-.07a1.4 1.4 0 0 0-.92-1.29 1.4 1.4 0 0 0-1.55.28l-.05.05a1.7 1.7 0 1 1-2.4-2.4l.05-.05a1.4 1.4 0 0 0 .28-1.55 1.4 1.4 0 0 0-1.29-.85h-.14a1.7 1.7 0 1 1 0-3.4h.07a1.4 1.4 0 0 0 1.29-.92 1.4 1.4 0 0 0-.28-1.55l-.05-.05a1.7 1.7 0 1 1 2.4-2.4l.05.05a1.4 1.4 0 0 0 1.55.28h.07a1.4 1.4 0 0 0 .85-1.29v-.14a1.7 1.7 0 1 1 3.4 0v.07a1.4 1.4 0 0 0 .85 1.29 1.4 1.4 0 0 0 1.55-.28l.05-.05a1.7 1.7 0 1 1 2.4 2.4l-.05.05a1.4 1.4 0 0 0-.28 1.55v.07a1.4 1.4 0 0 0 1.29.85h.14a1.7 1.7 0 1 1 0 3.4h-.07a1.4 1.4 0 0 0-1.29.85z" />
    </Trazo>
  );
}

// ---------------------------------------------------------------------------
// Acciones
// ---------------------------------------------------------------------------

export function IconoCerrarSesion({ className }: PropsIcono) {
  return (
    <Trazo className={className}>
      <path d="M9.5 20.25H5.75a1.5 1.5 0 0 1-1.5-1.5V5.25a1.5 1.5 0 0 1 1.5-1.5H9.5" />
      <path d="m15.25 16.25 4.25-4.25-4.25-4.25M19.5 12h-10" />
    </Trazo>
  );
}

export function IconoBuscar({ className }: PropsIcono) {
  return (
    <Trazo className={className}>
      <circle cx="10.75" cy="10.75" r="6.5" />
      <path d="m20 20-4.65-4.65" />
    </Trazo>
  );
}

export function IconoFiltro({ className }: PropsIcono) {
  return (
    <Trazo className={className}>
      <path d="M4.25 5.75h15.5l-6 7v5.5l-3.5 1.75V12.75z" />
    </Trazo>
  );
}

export function IconoAgregar({ className }: PropsIcono) {
  return (
    <Trazo className={className}>
      <path d="M12 5.25v13.5M5.25 12h13.5" />
    </Trazo>
  );
}

export function IconoEditar({ className }: PropsIcono) {
  return (
    <Trazo className={className}>
      <path d="M15.75 4.75a2.12 2.12 0 0 1 3 3L9 17.5l-4 1 1-4z" />
    </Trazo>
  );
}

export function IconoEliminar({ className }: PropsIcono) {
  return (
    <Trazo className={className}>
      <path d="M4.75 6.75h14.5M9.5 6.75V5.25a1.5 1.5 0 0 1 1.5-1.5h2a1.5 1.5 0 0 1 1.5 1.5v1.5" />
      <path d="M17.75 6.75v12a1.5 1.5 0 0 1-1.5 1.5h-8.5a1.5 1.5 0 0 1-1.5-1.5v-12" />
      <path d="M10.25 10.75v5.5M13.75 10.75v5.5" />
    </Trazo>
  );
}

export function IconoVer({ className }: PropsIcono) {
  return (
    <Trazo className={className}>
      <path d="M2.75 12S6.5 5.75 12 5.75 21.25 12 21.25 12 17.5 18.25 12 18.25 2.75 12 2.75 12" />
      <circle cx="12" cy="12" r="2.75" />
    </Trazo>
  );
}

export function IconoOcultar({ className }: PropsIcono) {
  return (
    <Trazo className={className}>
      <path d="M9.9 5.98A8.9 8.9 0 0 1 12 5.75c5.5 0 9.25 6.25 9.25 6.25a17 17 0 0 1-2.7 3.53M6.4 7.55A16.9 16.9 0 0 0 2.75 12S6.5 18.25 12 18.25a8.8 8.8 0 0 0 3.63-.78" />
      <path d="M10.05 10.05a2.75 2.75 0 0 0 3.9 3.9M4.25 4.25l15.5 15.5" />
    </Trazo>
  );
}

export function IconoDescargar({ className }: PropsIcono) {
  return (
    <Trazo className={className}>
      <path d="M12 3.75v10M8.25 10.25 12 14l3.75-3.75" />
      <path d="M4.75 15.75v2.5a2 2 0 0 0 2 2h10.5a2 2 0 0 0 2-2v-2.5" />
    </Trazo>
  );
}

export function IconoReintentar({ className }: PropsIcono) {
  return (
    <Trazo className={className}>
      <path d="M19.75 12a7.75 7.75 0 1 1-2.4-5.6" />
      <path d="M19.75 4.75V9.5h-4.75" />
    </Trazo>
  );
}

export function IconoCerrar({ className }: PropsIcono) {
  return (
    <Trazo className={className}>
      <path d="m6.25 6.25 11.5 11.5M17.75 6.25 6.25 17.75" />
    </Trazo>
  );
}

// ---------------------------------------------------------------------------
// Estado y señalización
// ---------------------------------------------------------------------------

export function IconoCampana({ className }: PropsIcono) {
  return (
    <Trazo className={className}>
      <path d="M18 8.75a6 6 0 1 0-12 0c0 5.25-2 6.75-2 6.75h16s-2-1.5-2-6.75" />
      <path d="M13.75 19.25a2 2 0 0 1-3.5 0" />
    </Trazo>
  );
}

export function IconoCorreo({ className }: PropsIcono) {
  return (
    <Trazo className={className}>
      <rect height="13.5" rx="2" width="18.5" x="2.75" y="5.25" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </Trazo>
  );
}

export function IconoCandado({ className }: PropsIcono) {
  return (
    <Trazo className={className}>
      <rect height="10" rx="2" width="14" x="5" y="10.25" />
      <path d="M8.25 10.25V7.75a3.75 3.75 0 0 1 7.5 0v2.5" />
    </Trazo>
  );
}

export function IconoExito({ className }: PropsIcono) {
  return (
    <Trazo className={className}>
      <circle cx="12" cy="12" r="8.25" />
      <path d="m8.5 12.25 2.4 2.4 4.6-5" />
    </Trazo>
  );
}

export function IconoAlerta({ className }: PropsIcono) {
  return (
    <Trazo className={className}>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 8v4.75M12 16h.01" />
    </Trazo>
  );
}

export function IconoInformacion({ className }: PropsIcono) {
  return (
    <Trazo className={className}>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 11.25V16M12 8h.01" />
    </Trazo>
  );
}

export function IconoBandeja({ className }: PropsIcono) {
  return (
    <Trazo className={className}>
      <path d="M3.75 13.25h4l1.25 2.5h6l1.25-2.5h4" />
      <path d="M6.4 4.75h11.2l2.65 8.5v4a2 2 0 0 1-2 2H5.75a2 2 0 0 1-2-2v-4z" />
    </Trazo>
  );
}

export function IconoObra({ className }: PropsIcono) {
  return (
    <Trazo className={className}>
      <path d="M4.75 20.25h14.5M6.5 20.25v-4.5h11v4.5" />
      <path d="M12 15.75V9.5M8.25 9.5h7.5l-1.5-5.25h-4.5z" />
    </Trazo>
  );
}

// ---------------------------------------------------------------------------
// Dirección
// ---------------------------------------------------------------------------

export function IconoChevronAbajo({ className }: PropsIcono) {
  return (
    <Trazo className={className}>
      <path d="m6.75 9.75 5.25 5 5.25-5" />
    </Trazo>
  );
}

export function IconoChevronIzquierda({ className }: PropsIcono) {
  return (
    <Trazo className={className}>
      <path d="m14.25 6.75-5 5.25 5 5.25" />
    </Trazo>
  );
}

export function IconoChevronDerecha({ className }: PropsIcono) {
  return (
    <Trazo className={className}>
      <path d="m9.75 6.75 5 5.25-5 5.25" />
    </Trazo>
  );
}

/**
 * Pin del logo. Es el único ícono con relleno: en la marca es una forma
 * sólida, no un contorno.
 */
export function IconoPin({ className }: PropsIcono) {
  return (
    <svg
      aria-hidden="true"
      className={clases('size-5 shrink-0', className)}
      fill="currentColor"
      focusable="false"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 2.5a7.25 7.25 0 0 0-7.25 7.25c0 5.16 6.3 11.28 6.57 11.54a.97.97 0 0 0 1.36 0c.27-.26 6.57-6.38 6.57-11.54A7.25 7.25 0 0 0 12 2.5m0 10a2.75 2.75 0 1 1 0-5.5 2.75 2.75 0 0 1 0 5.5" />
    </svg>
  );
}
