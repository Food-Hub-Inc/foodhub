import { pgEnum } from 'drizzle-orm/pg-core';
import {
  ESTADO_CUENTA,
  ESTADO_MENSAJE,
  ESTADO_PEDIDO,
  ESTADO_PUBLICACION,
  ESTADO_REPORTE,
  ESTADO_RESENA,
  ESTADO_TICKET,
  ESTADO_VERSION_TERMINOS,
  OPERACION_AUDITORIA,
  ORIGEN_TRANSICION,
  TIPO_EVENTO_SEGURIDAD,
  TIPO_MENSAJE,
  TIPO_NOTIFICACION,
  TIPO_REACCION,
  TIPO_USUARIO,
} from '@foodhub/shared';

/**
 * Tipos ENUM de PostgreSQL.
 *
 * CRITERIO DE TRADUCCION del diagrama de clases (DG12082026_V4) al modelo
 * relacional, aplicado de forma uniforme en todo el schema:
 *
 *   - Si el diagrama modela el conjunto de valores como una CLASE propia
 *     (Categoria, MotivoCancelacion, TipoConsulta, RolDestino, Ciudad...),
 *     se traduce a TABLA. Son entidades que el administrador da de alta y baja
 *     desde el panel, segun el Modulo de configuracion y parametros
 *     (alcance 2.2.2.2.3), y por lo tanto necesitan ABM.
 *
 *   - Si el diagrama enumera los valores INLINE dentro de un atributo
 *     (por ejemplo `origenRechazo (CLIENTE / COCINERO / SISTEMA)`), se traduce
 *     a ENUM de PostgreSQL. Son valores fijos del dominio: agregarlos implica
 *     cambiar reglas de negocio y desplegar codigo, no cargar una fila.
 *
 * Los literales se importan de @foodhub/shared para que la base, la API y los
 * clientes compartan exactamente el mismo conjunto de valores.
 */

export const tipoUsuarioEnum = pgEnum('tipo_usuario', TIPO_USUARIO);
// EstadoCuenta figura como clase en el diagrama, pero sus tres valores son
// fijos y no admiten ABM desde el panel: se traduce a ENUM.
export const estadoCuentaEnum = pgEnum('estado_cuenta', ESTADO_CUENTA);
export const estadoPublicacionEnum = pgEnum(
  'estado_publicacion',
  ESTADO_PUBLICACION,
);
export const estadoPedidoEnum = pgEnum('estado_pedido', ESTADO_PEDIDO);
export const origenTransicionEnum = pgEnum(
  'origen_transicion',
  ORIGEN_TRANSICION,
);
export const estadoResenaEnum = pgEnum('estado_resena', ESTADO_RESENA);
export const tipoReaccionEnum = pgEnum('tipo_reaccion', TIPO_REACCION);
export const estadoReporteEnum = pgEnum('estado_reporte', ESTADO_REPORTE);
export const tipoMensajeEnum = pgEnum('tipo_mensaje', TIPO_MENSAJE);
export const estadoMensajeEnum = pgEnum('estado_mensaje', ESTADO_MENSAJE);
export const tipoNotificacionEnum = pgEnum(
  'tipo_notificacion',
  TIPO_NOTIFICACION,
);
export const operacionAuditoriaEnum = pgEnum(
  'operacion_auditoria',
  OPERACION_AUDITORIA,
);
export const tipoEventoSeguridadEnum = pgEnum(
  'tipo_evento_seguridad',
  TIPO_EVENTO_SEGURIDAD,
);
export const estadoTicketEnum = pgEnum('estado_ticket', ESTADO_TICKET);
export const estadoVersionTerminosEnum = pgEnum(
  'estado_version_terminos',
  ESTADO_VERSION_TERMINOS,
);
