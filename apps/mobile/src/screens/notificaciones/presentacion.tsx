import type { ComponentType } from 'react';
import type { Notificacion, TipoNotificacion } from '@foodhub/shared';
import {
  IconoAlerta,
  IconoBolsa,
  IconoEstrella,
  IconoInformacion,
  IconoMensaje,
  IconoTildeCirculo,
} from '../../components/iconos';
import type { PropsIcono } from '../../components/iconos/tipos';
import { encabezadoDeDiaNotificacion } from '../../lib/formato';

/**
 * PAN-NOT-01 - Cómo se ve cada notificación según su tipo: el ícono
 * "representativo del tipo" (US-NOT-07, tercer criterio) y su color de acento.
 *
 * El color nunca es el único canal (accesibilidad): cada tipo tiene además su
 * ícono y el texto lo dice todo. Los íconos y colores salen del set y los
 * tokens de la guía visual; no hay literales.
 */

type Acento = 'primary' | 'success' | 'warning' | 'error' | 'secondary';

interface Presentacion {
  Icono: ComponentType<PropsIcono>;
  acento: Acento;
}

const POR_TIPO: Record<TipoNotificacion, Presentacion> = {
  PEDIDO_CREADO: { Icono: IconoBolsa, acento: 'primary' },
  PEDIDO_ACEPTADO: { Icono: IconoBolsa, acento: 'primary' },
  PEDIDO_LISTO: { Icono: IconoTildeCirculo, acento: 'success' },
  PEDIDO_COMPLETADO: { Icono: IconoTildeCirculo, acento: 'success' },
  PEDIDO_RECHAZADO: { Icono: IconoAlerta, acento: 'error' },
  MENSAJE_NUEVO: { Icono: IconoMensaje, acento: 'secondary' },
  RESENA_RECIBIDA: { Icono: IconoEstrella, acento: 'warning' },
  PUBLICACION_COCINERO_FAVORITO: { Icono: IconoInformacion, acento: 'primary' },
  PUBLICACION_ELIMINADA_ADMIN: { Icono: IconoAlerta, acento: 'error' },
  AVISO_SISTEMA: { Icono: IconoInformacion, acento: 'secondary' },
};

/** Clases estáticas del círculo del ícono: uniwind no compila clases armadas. */
const CLASES_ACENTO: Record<Acento, { fondo: string; icono: string }> = {
  primary: { fondo: 'bg-primary/10', icono: 'text-primary' },
  success: { fondo: 'bg-success/10', icono: 'text-success' },
  warning: { fondo: 'bg-warning/10', icono: 'text-warning' },
  error: { fondo: 'bg-error/10', icono: 'text-error' },
  secondary: { fondo: 'bg-secondary/10', icono: 'text-secondary' },
};

export function presentacionDe(tipo: TipoNotificacion): {
  Icono: ComponentType<PropsIcono>;
  fondo: string;
  icono: string;
} {
  const { Icono, acento } = POR_TIPO[tipo];
  return { Icono, ...CLASES_ACENTO[acento] };
}

/** Una sección de la lista: un día con sus notificaciones. */
export interface SeccionDeNotificaciones {
  titulo: string;
  data: Notificacion[];
}

/**
 * Agrupa la lista (ya ordenada de la más reciente a la más antigua) en
 * secciones por día. El `ahora` se inyecta para poder probarlo.
 */
export function agruparPorDia(
  notificaciones: Notificacion[],
  ahora: Date = new Date(),
): SeccionDeNotificaciones[] {
  const secciones: SeccionDeNotificaciones[] = [];

  for (const notificacion of notificaciones) {
    const titulo = encabezadoDeDiaNotificacion(
      notificacion.fechaCreacion,
      ahora,
    );
    const ultima = secciones[secciones.length - 1];
    if (ultima?.titulo === titulo) {
      ultima.data.push(notificacion);
    } else {
      secciones.push({ titulo, data: [notificacion] });
    }
  }

  return secciones;
}
