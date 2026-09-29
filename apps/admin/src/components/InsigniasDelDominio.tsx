import type {
  EstadoCuenta,
  EstadoPublicacion,
  OperacionAuditoria,
  TipoEventoSeguridad,
  TipoUsuario,
} from '@foodhub/shared';
import {
  ETIQUETA_ESTADO_CUENTA,
  ETIQUETA_ESTADO_PUBLICACION,
  ETIQUETA_EVENTO_SEGURIDAD,
  ETIQUETA_OPERACION,
  ETIQUETA_TIPO_USUARIO,
} from '../lib/etiquetas.js';
import { Insignia, type TonoInsignia } from './Insignia.js';

/**
 * Insignias con significado de negocio. Cada mapa de color es un criterio de
 * aceptación, no una preferencia estética: si acá cambia un tono, cambia lo
 * que verifica la prueba funcional de la Etapa 6.
 */

/**
 * ROL — maquetación de PAN-ADM-01.
 *
 * DECISIÓN PENDIENTE DE REVISIÓN: la maquetación pide azul para `CLIENTE`, y
 * la guía visual (sección 01) no tiene ningún azul. Se usa
 * `--color-secondary` (#6C757D), el "color de apoyo" de la paleta y el único
 * gris azulado aprobado. Si el equipo quiere el azul del mockup hay que
 * agregarlo primero a la guía visual y después acá; no se inventa un literal.
 */
const TONO_POR_ROL: Record<TipoUsuario, TonoInsignia> = {
  COCINERO: 'naranja',
  CLIENTE: 'gris',
  ADMINISTRADOR: 'neutro',
};

export function InsigniaRol({ tipo }: { tipo: TipoUsuario }) {
  return (
    <Insignia tono={TONO_POR_ROL[tipo]}>{ETIQUETA_TIPO_USUARIO[tipo]}</Insignia>
  );
}

/** ESTADO — ACTIVO verde, SUSPENDIDO ámbar, ELIMINADO gris (PAN-ADM-01). */
const TONO_POR_ESTADO: Record<EstadoCuenta, TonoInsignia> = {
  ACTIVA: 'verde',
  SUSPENDIDA: 'ambar',
  ELIMINADA: 'neutro',
};

export function InsigniaEstadoCuenta({ estado }: { estado: EstadoCuenta }) {
  return (
    <Insignia tono={TONO_POR_ESTADO[estado]}>
      {ETIQUETA_ESTADO_CUENTA[estado]}
    </Insignia>
  );
}

/**
 * OPERACIÓN — criterio de US-AUD-02: "Alta verde, Baja roja, Modificación azul
 * o amarilla".
 *
 * Se toma la segunda opción para modificación (`--color-warning`, el ámbar de
 * la guía visual) porque la paleta aprobada no tiene azul. El propio criterio
 * de aceptación admite las dos, así que la elección no requiere ampliar la
 * guía.
 */
const TONO_POR_OPERACION: Record<OperacionAuditoria, TonoInsignia> = {
  ALTA: 'verde',
  BAJA: 'rojo',
  MODIFICACION: 'ambar',
};

export function InsigniaOperacion({
  operacion,
}: {
  operacion: OperacionAuditoria;
}) {
  return (
    <Insignia tono={TONO_POR_OPERACION[operacion]}>
      {ETIQUETA_OPERACION[operacion]}
    </Insignia>
  );
}

/**
 * TIPO DE EVENTO — solapa de seguridad de PAN-AUD-01.
 *
 * Los dos son incidentes, no operaciones normales: un login fallido es rojo y
 * un acceso denegado por rol es ámbar, siguiendo la misma escala de gravedad
 * que el resto del panel.
 */
const TONO_POR_EVENTO: Record<TipoEventoSeguridad, TonoInsignia> = {
  LOGIN_FALLIDO: 'rojo',
  ACCESO_DENEGADO: 'ambar',
};

export function InsigniaEventoSeguridad({
  tipo,
}: {
  tipo: TipoEventoSeguridad;
}) {
  return (
    <Insignia tono={TONO_POR_EVENTO[tipo]}>
      {ETIQUETA_EVENTO_SEGURIDAD[tipo]}
    </Insignia>
  );
}

/**
 * HABILITACIÓN — categorías de platos y motivos de cancelación (US-CFG-01,
 * US-CFG-02, PAN-ADM-04): "indicador visual de color" del estado de
 * habilitación. Verde disponible, gris fuera de uso, misma escala que
 * `InsigniaEstadoCuenta`.
 *
 * Los textos no son fijos porque el género cambia según la entidad:
 * "Habilitada" (categoría) vs. "Habilitado" (motivo).
 */
export function InsigniaHabilitacion({
  activo,
  etiquetaHabilitado = 'Habilitada',
  etiquetaDeshabilitado = 'Deshabilitada',
}: {
  activo: boolean;
  etiquetaHabilitado?: string;
  etiquetaDeshabilitado?: string;
}) {
  return (
    <Insignia tono={activo ? 'verde' : 'neutro'}>
      {activo ? etiquetaHabilitado : etiquetaDeshabilitado}
    </Insignia>
  );
}

/**
 * DISPONIBILIDAD de una publicación — guía visual, "Badges de disponibilidad":
 * Disponible verde, Últimas unidades ámbar, No disponible gris.
 */
const TONO_POR_ESTADO_PUBLICACION: Record<EstadoPublicacion, TonoInsignia> = {
  DISPONIBLE: 'verde',
  ULTIMAS_UNIDADES: 'ambar',
  NO_DISPONIBLE: 'neutro',
};

export function InsigniaEstadoPublicacion({
  estado,
}: {
  estado: EstadoPublicacion;
}) {
  return (
    <Insignia tono={TONO_POR_ESTADO_PUBLICACION[estado]}>
      {ETIQUETA_ESTADO_PUBLICACION[estado]}
    </Insignia>
  );
}
