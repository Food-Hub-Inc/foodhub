import type {
  EstadoCuenta,
  OperacionAuditoria,
  TipoEventoSeguridad,
  TipoUsuario,
} from '@foodhub/shared';

/**
 * Traducción de los enums del dominio al texto que ve el administrador.
 *
 * POR QUÉ NO SE MUESTRA EL VALOR DEL ENUM DIRECTAMENTE
 *
 * El principio de "correspondencia con el mundo real" de la guía de UX pide el
 * vocabulario del usuario, no el de la base. Además la maquetación escribe
 * "MODIFICACIÓN" con tilde y "SUSPENDIDO" en masculino, mientras que el enum
 * dice `MODIFICACION` y `SUSPENDIDA`: renderizar el enum crudo dejaría la
 * pantalla distinta del mockup aprobado.
 */

/** Badges de la columna ROL de PAN-ADM-01. */
export const ETIQUETA_TIPO_USUARIO: Record<TipoUsuario, string> = {
  CLIENTE: 'CLIENTE',
  COCINERO: 'COCINERO',
  ADMINISTRADOR: 'ADMINISTRADOR',
};

/** El mismo rol, en prosa, para la tarjeta de sesión de la barra lateral. */
export const ROL_EN_PROSA: Record<TipoUsuario, string> = {
  CLIENTE: 'Cliente',
  COCINERO: 'Cocinero',
  ADMINISTRADOR: 'Administrador',
};

/** Badges de la columna ESTADO de PAN-ADM-01. */
export const ETIQUETA_ESTADO_CUENTA: Record<EstadoCuenta, string> = {
  ACTIVA: 'ACTIVO',
  SUSPENDIDA: 'SUSPENDIDO',
  ELIMINADA: 'ELIMINADO',
};

/** Badges de la columna OPERACIÓN de PAN-AUD-01, solapa de operaciones. */
export const ETIQUETA_OPERACION: Record<OperacionAuditoria, string> = {
  ALTA: 'ALTA',
  BAJA: 'BAJA',
  MODIFICACION: 'MODIFICACIÓN',
};

/** Badges de la columna TIPO DE EVENTO de PAN-AUD-01, solapa de seguridad. */
export const ETIQUETA_EVENTO_SEGURIDAD: Record<TipoEventoSeguridad, string> = {
  LOGIN_FALLIDO: 'LOGIN FALLIDO',
  ACCESO_DENEGADO: 'ACCESO DENEGADO',
};

/**
 * Nombres legibles de los campos que la API guarda en `datos_adicionales`.
 *
 * El modal de detalle de PAN-AUD-01 debe mostrar esos datos "estructurados" y
 * no como un JSON crudo. Cuando aparece una clave que no está en esta tabla se
 * muestra tal cual: es preferible una etiqueta fea a esconder información de un
 * registro de auditoría.
 */
export const ETIQUETA_DATO_ADICIONAL: Record<string, string> = {
  nombre: 'Nombre',
  apellido: 'Apellido',
  email: 'Correo electrónico',
  tipo: 'Rol',
  tipoAnterior: 'Rol anterior',
  tipoNuevo: 'Rol nuevo',
  estadoCuenta: 'Estado de la cuenta',
  estadoAnterior: 'Estado anterior',
  estadoNuevo: 'Estado nuevo',
  motivo: 'Motivo',
  motivoSuspension: 'Motivo de la suspensión',
  origen: 'Origen',
  camposModificados: 'Campos modificados',
};
