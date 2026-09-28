/**
 * Enumeraciones del dominio de FoodHub.
 *
 * Estas constantes son la unica definicion de los valores posibles de cada
 * estado del sistema. La base de datos las replica como tipos ENUM de
 * PostgreSQL (ver `packages/db/src/schema/enums.ts`) y los clientes las
 * importan desde aca, de modo que agregar un estado nuevo obliga a tocar un
 * solo archivo y el compilador senala todos los lugares que hay que ajustar.
 *
 * Trazabilidad: diagrama de clases FoodHub - DG12082026_V5.
 */

/** Rol del usuario dentro de la plataforma. Diagrama: Usuario.tipo. */
export const TIPO_USUARIO = ['CLIENTE', 'COCINERO', 'ADMINISTRADOR'] as const;
export type TipoUsuario = (typeof TIPO_USUARIO)[number];

/** Estado de la cuenta. Diagrama: EstadoCuenta. */
export const ESTADO_CUENTA = ['ACTIVA', 'SUSPENDIDA', 'ELIMINADA'] as const;
export type EstadoCuenta = (typeof ESTADO_CUENTA)[number];

/**
 * Disponibilidad de un plato publicado.
 * Alcance 2.2.2.2.2: "tres valores posibles (disponible, no disponible y
 * ultimas unidades)".
 */
export const ESTADO_PUBLICACION = [
  'DISPONIBLE',
  'ULTIMAS_UNIDADES',
  'NO_DISPONIBLE',
] as const;
export type EstadoPublicacion = (typeof ESTADO_PUBLICACION)[number];

/**
 * Ciclo de vida del pedido.
 * El estado LISTO se incorporo en la Etapa 5 para separar la preparacion de
 * la entrega (ver tabla comparativa 2.2.2.3 del documento de proyecto).
 */
export const ESTADO_PEDIDO = [
  'CREADO',
  'ACEPTADO',
  'LISTO',
  'RECHAZADO',
  'COMPLETADO',
] as const;
export type EstadoPedido = (typeof ESTADO_PEDIDO)[number];

/**
 * Transiciones validas del pedido. Cualquier cambio de estado que no figure
 * aca debe rechazarse en el servicio de pedidos antes de tocar la base.
 * Un arreglo vacio indica estado terminal.
 */
export const TRANSICIONES_PEDIDO: Readonly<
  Record<EstadoPedido, readonly EstadoPedido[]>
> = {
  CREADO: ['ACEPTADO', 'RECHAZADO'],
  ACEPTADO: ['LISTO', 'RECHAZADO'],
  LISTO: ['COMPLETADO'],
  RECHAZADO: [],
  COMPLETADO: [],
};

/** Quien origino un rechazo o una transicion. Diagrama: Pedido.origenRechazo. */
export const ORIGEN_TRANSICION = ['CLIENTE', 'COCINERO', 'SISTEMA'] as const;
export type OrigenTransicion = (typeof ORIGEN_TRANSICION)[number];

/**
 * Que se resena. Diagrama: jerarquia Resena.
 *
 * Una resena se identifica por (autor, objeto resenado), y el objeto es un
 * plato, un cocinero o un cliente. El pedido NO participa de esa identidad:
 * solo responde "tiene derecho a resenar?" en el momento del alta.
 */
export const TIPO_RESENA = ['PLATO', 'COCINERO', 'CLIENTE'] as const;
export type TipoResena = (typeof TIPO_RESENA)[number];

/** Estado de moderacion de una resena. Diagrama: Resena.estadoResena. */
export const ESTADO_RESENA = [
  'VISIBLE',
  'OCULTA_MODERACION',
  'ELIMINADA_AUTOR',
] as const;
export type EstadoResena = (typeof ESTADO_RESENA)[number];

/** Reaccion de la comunidad a una resena. Diagrama: ReaccionResena.tipo. */
export const TIPO_REACCION = ['ME_GUSTA', 'NO_ME_GUSTA'] as const;
export type TipoReaccion = (typeof TIPO_REACCION)[number];

/** Resolucion de un reporte de resena. Diagrama: ReporteResena.estadoReporte. */
export const ESTADO_REPORTE = ['PENDIENTE', 'APROBADO', 'RECHAZADO'] as const;
export type EstadoReporte = (typeof ESTADO_REPORTE)[number];

/** Tipo de mensaje del chat. Diagrama: jerarquia Mensaje. */
export const TIPO_MENSAJE = ['TEXTO', 'IMAGEN'] as const;
export type TipoMensaje = (typeof TIPO_MENSAJE)[number];

/** Acuse de recibo de un mensaje. Diagrama: EstadoMensaje. */
export const ESTADO_MENSAJE = ['ENVIADO', 'ENTREGADO', 'LEIDO'] as const;
export type EstadoMensaje = (typeof ESTADO_MENSAJE)[number];

/**
 * Eventos que disparan una notificacion push o in-app (US-NOT-01 a US-NOT-06).
 *
 * Los tres caminos que llevan un pedido a RECHAZADO -el cocinero rechaza, el
 * cliente cancela y el sistema expira- comparten el UNICO tipo
 * `PEDIDO_RECHAZADO`: derivan al mismo estado interno y se distinguen por
 * `pedido.origen_rechazo` (COCINERO / CLIENTE / SISTEMA), que es lo que elige
 * el texto en `MENSAJES_NOTIFICACION`.
 *
 * `PUBLICACION_COCINERO_FAVORITO` (US-NOT-06) se agrega al final: el `ALTER TYPE
 * ... ADD VALUE` de PostgreSQL tambien lo agrega al final del enum, y el
 * literal figura en `TipoNotificacion` del diagrama DG12082026_V5.
 */
export const TIPO_NOTIFICACION = [
  'PEDIDO_CREADO',
  'PEDIDO_ACEPTADO',
  'PEDIDO_LISTO',
  'PEDIDO_RECHAZADO',
  'PEDIDO_COMPLETADO',
  'MENSAJE_NUEVO',
  'RESENA_RECIBIDA',
  'PUBLICACION_ELIMINADA_ADMIN',
  'AVISO_SISTEMA',
  'PUBLICACION_COCINERO_FAVORITO',
] as const;
export type TipoNotificacion = (typeof TIPO_NOTIFICACION)[number];

/** Operaciones que deja asentadas el modulo de auditoria (US-AUD-02). */
export const OPERACION_AUDITORIA = ['ALTA', 'BAJA', 'MODIFICACION'] as const;
export type OperacionAuditoria = (typeof OPERACION_AUDITORIA)[number];

/**
 * Eventos de seguridad registrados por US-AUD-01.
 *
 * LOGIN_FALLIDO   lo alimenta un Auth Hook de Supabase, porque el intento de
 *                 autenticacion no pasa por la API.
 * ACCESO_DENEGADO lo escribe el middleware de autorizacion de la API cuando un
 *                 usuario intenta usar un recurso que su rol no habilita.
 */
export const TIPO_EVENTO_SEGURIDAD = [
  'LOGIN_FALLIDO',
  'ACCESO_DENEGADO',
] as const;
export type TipoEventoSeguridad = (typeof TIPO_EVENTO_SEGURIDAD)[number];

/** Estado de un ticket de soporte. Diagrama: TicketSoporte.estadoTicket. */
export const ESTADO_TICKET = ['ABIERTO', 'EN_PROCESO', 'CERRADO'] as const;
export type EstadoTicket = (typeof ESTADO_TICKET)[number];

/** Ciclo de vida de una version de los terminos y condiciones. */
export const ESTADO_VERSION_TERMINOS = [
  'BORRADOR',
  'VIGENTE',
  'ARCHIVADA',
] as const;
export type EstadoVersionTerminos = (typeof ESTADO_VERSION_TERMINOS)[number];
