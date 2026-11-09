import type { ComponentType } from 'react';
import type { PropsIcono } from '../iconos/tipos.js';
import {
  IconoAuditoria,
  IconoAyuda,
  IconoCampana,
  IconoConfiguracion,
  IconoInicio,
  IconoMetricas,
  IconoModeracion,
  IconoUsuarios,
} from '../iconos/index.js';

/**
 * Ítems de la barra lateral, en el orden de la maquetación.
 *
 * Se declaran como datos y no como JSX repetido para que la barra y el ruteo
 * no puedan desalinearse: agregar una pantalla es agregar una fila acá.
 */
export interface ItemDeNavegacion {
  ruta: string;
  etiqueta: string;
  Icono: ComponentType<PropsIcono>;
  /**
   * Cuando es `true`, el ítem muestra el contador de pendientes a la derecha.
   * Hoy solo Moderación lo lleva (reportes de reseñas sin resolver).
   */
  muestraPendientes?: boolean;
}

export const ITEMS_DE_NAVEGACION: readonly ItemDeNavegacion[] = [
  { ruta: '/', etiqueta: 'Inicio', Icono: IconoInicio },
  { ruta: '/usuarios', etiqueta: 'Usuarios', Icono: IconoUsuarios },
  {
    ruta: '/moderacion',
    etiqueta: 'Moderación',
    Icono: IconoModeracion,
    muestraPendientes: true,
  },
  // US-NOT-04: no está en la maquetación; va junto a Moderación por ser la
  // otra sección desde la que el administrador se comunica con los usuarios.
  { ruta: '/avisos', etiqueta: 'Avisos', Icono: IconoCampana },
  { ruta: '/metricas', etiqueta: 'Métricas', Icono: IconoMetricas },
  { ruta: '/auditoria', etiqueta: 'Auditoría', Icono: IconoAuditoria },
  {
    ruta: '/ayuda',
    etiqueta: 'Gestión de ayuda',
    Icono: IconoAyuda,
  },
  {
    ruta: '/configuracion',
    etiqueta: 'Configuración',
    Icono: IconoConfiguracion,
  },
];
