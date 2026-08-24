import {
  MENSAJES_PEDIDO,
  type EstadoPedido,
  type OrigenTransicion,
  type PedidoDetalle,
  type PedidoResumen,
} from '@foodhub/shared';

/**
 * Cómo se muestra el estado de un pedido, en un solo lugar.
 *
 * EL MISMO ESTADO INTERNO SE LLAMA DISTINTO SEGÚN QUIÉN MIRE, y eso no es una
 * decisión de interfaz sino parte del requerimiento: US-PED-02 fija las cuatro
 * leyendas del cliente ("Recibido", "Preparando", "Listo", "Entregado") y
 * US-PED-03 los cinco rótulos de las pestañas del cocinero ("Nuevos",
 * "Preparando", "Listos", "Completados", "Rechazados"). Un pedido CREADO es
 * "Recibido" para uno y "Nuevo" para el otro.
 *
 * Los colores salen de la guía visual y NUNCA son el único canal: todo badge que
 * use este mapa lleva su etiqueta en texto, igual que `ESTILO_DISPONIBILIDAD`.
 */

/** Leyendas de la línea de tiempo del cliente, en orden (US-PED-02). */
export const PASOS_DEL_SEGUIMIENTO = [
  { estado: 'CREADO', leyenda: MENSAJES_PEDIDO.leyendaRecibido },
  { estado: 'ACEPTADO', leyenda: MENSAJES_PEDIDO.leyendaPreparando },
  { estado: 'LISTO', leyenda: MENSAJES_PEDIDO.leyendaListo },
  { estado: 'COMPLETADO', leyenda: MENSAJES_PEDIDO.leyendaEntregado },
] as const satisfies readonly { estado: EstadoPedido; leyenda: string }[];

/**
 * Etiqueta del badge en las listas del cliente.
 *
 * RECHAZADO no está: su etiqueta depende de QUIÉN rechazó y la resuelve
 * `etiquetaDeCierre`, que es la única que puede distinguir "Cancelado por vos"
 * de "Rechazado por el cocinero".
 */
const ETIQUETA_ACTIVA_CLIENTE: Record<
  Exclude<EstadoPedido, 'RECHAZADO'>,
  string
> = {
  CREADO: MENSAJES_PEDIDO.leyendaRecibido,
  ACEPTADO: MENSAJES_PEDIDO.leyendaPreparando,
  LISTO: MENSAJES_PEDIDO.leyendaListo,
  COMPLETADO: MENSAJES_PEDIDO.leyendaEntregado,
};

/**
 * DESDE QUÉ LADO SE MIRA EL PEDIDO.
 *
 * Hace falta porque los literales de US-PED-06 y US-PED-07 están escritos para
 * la pantalla del CLIENTE ("Cancelado por vos") y el detalle es una sola
 * pantalla para los dos roles: sin este dato, al cocinero se le atribuía una
 * cancelación que había hecho el cliente.
 */
export type VistaDePedido = 'CLIENTE' | 'COCINERO';

/**
 * Cómo terminó un pedido rechazado, según su origen (US-PED-06, tercer
 * criterio de la pestaña "Rechazados").
 *
 * Las tres etiquetas son literales del criterio y son lo que distingue una
 * cancelación del cliente de un rechazo del cocinero o de una expiración
 * automática: en la base los tres son el mismo estado RECHAZADO.
 */
const ETIQUETA_POR_ORIGEN: Record<OrigenTransicion, string> = {
  CLIENTE: MENSAJES_PEDIDO.canceladoPorVos,
  COCINERO: MENSAJES_PEDIDO.rechazadoPorElCocinero,
  SISTEMA: MENSAJES_PEDIDO.expiradoSinRespuesta,
};

/**
 * Lo MISMO visto por el cocinero, y lo único que cambia es el origen CLIENTE.
 *
 * "Rechazado por el cocinero" y "Expirado - sin respuesta del cocinero" se
 * dejan tal cual: son literales de la documentación y redactarlos en segunda
 * persona sería inventar dos textos que ningún criterio respalda.
 */
const ETIQUETA_POR_ORIGEN_COCINERO: Record<OrigenTransicion, string> = {
  ...ETIQUETA_POR_ORIGEN,
  CLIENTE: MENSAJES_PEDIDO.canceladoPorElCliente,
};

/** Encabezado del detalle de un pedido que ya cerró (US-PED-07). */
const ENCABEZADO_POR_ORIGEN: Record<OrigenTransicion, string> = {
  CLIENTE: MENSAJES_PEDIDO.encabezadoPedidoCancelado,
  COCINERO: MENSAJES_PEDIDO.encabezadoPedidoRechazado,
  SISTEMA: MENSAJES_PEDIDO.encabezadoPedidoExpirado,
};

/**
 * Indicador de estado del DETALLE, que para la expiración dice algo distinto
 * del de la tarjeta: "Expirado - el cocinero no respondió a tiempo" en
 * PAN-PED-06.4 contra "Expirado - sin respuesta del cocinero" en la lista. Son
 * dos literales distintos del documento, no una variante de redacción.
 */
const INDICADOR_POR_ORIGEN: Record<OrigenTransicion, string> = {
  ...ETIQUETA_POR_ORIGEN,
  SISTEMA: MENSAJES_PEDIDO.expiradoSinRespuestaDetalle,
};

const INDICADOR_POR_ORIGEN_COCINERO: Record<OrigenTransicion, string> = {
  ...INDICADOR_POR_ORIGEN,
  CLIENTE: MENSAJES_PEDIDO.canceladoPorElCliente,
};

/**
 * Tono del badge: un color de la paleta para el fondo tenue y otro para el
 * texto.
 *
 * `fondo` es el color PLENO, no un tinte: el badge lo pinta con `FondoTenue`,
 * la capa al 10 % que ya usa el resto de la app. La guía visual no tiene tintes
 * propios y agregarlos como tokens nuevos sería inventar colores que el
 * documento de diseño no aprobó.
 */
export interface TonoDeEstado {
  fondo: string;
  texto: string;
}

/**
 * Un pedido rechazado usa el gris secundario -y no el rojo de error- cuando lo
 * canceló el propio cliente o cuando expiró: la guía reserva el error para
 * "errores y acciones destructivas", y un pedido que el cliente decidió no
 * hacer no es ninguna de las dos. El rechazo del cocinero sí lo es, y ahí el
 * rojo comunica lo que pasó.
 */
const TONO_POR_ORIGEN: Record<OrigenTransicion, TonoDeEstado> = {
  CLIENTE: { fondo: 'bg-secondary', texto: 'text-text-secondary' },
  COCINERO: { fondo: 'bg-error', texto: 'text-error' },
  SISTEMA: { fondo: 'bg-secondary', texto: 'text-text-secondary' },
};

/**
 * CREADO va en gris secundario y no en el azul de PAN-PED-05: la paleta de la
 * guía visual no tiene un color informativo, y "Esperando" es justamente el
 * estado en el que todavía no pasó nada. Los otros tres sí tienen color propio:
 * naranja de advertencia mientras se prepara, verde de éxito cuando está listo
 * o entregado.
 */
const TONO_ACTIVO: Record<Exclude<EstadoPedido, 'RECHAZADO'>, TonoDeEstado> = {
  CREADO: { fondo: 'bg-secondary', texto: 'text-text-secondary' },
  ACEPTADO: { fondo: 'bg-warning', texto: 'text-warning' },
  LISTO: { fondo: 'bg-success', texto: 'text-success' },
  COMPLETADO: { fondo: 'bg-success', texto: 'text-success' },
};

/** Lo que un pedido cerrado necesita para dibujarse, resuelto de una vez. */
type PedidoParaEtiquetar = Pick<PedidoResumen, 'estado' | 'origenRechazo'>;

/**
 * Origen de un pedido rechazado.
 *
 * `origen_rechazo` es nullable en la base y podría faltar en filas anteriores a
 * este módulo; ante la duda se asume SISTEMA, que es la única de las tres
 * lecturas que no le atribuye la decisión a una persona equivocada.
 */
function origenDe(pedido: PedidoParaEtiquetar): OrigenTransicion {
  return pedido.origenRechazo ?? 'SISTEMA';
}

/**
 * Texto del badge de estado.
 *
 * `vista` es obligatoria y no tiene valor por defecto a propósito: un default
 * dejaría que una pantalla nueva del cocinero heredara en silencio la redacción
 * del cliente, que es exactamente el defecto que esto corrige.
 */
export function etiquetaDeEstado(
  pedido: PedidoParaEtiquetar,
  vista: VistaDePedido,
): string {
  if (pedido.estado !== 'RECHAZADO') {
    return ETIQUETA_ACTIVA_CLIENTE[pedido.estado];
  }
  const etiquetas =
    vista === 'COCINERO' ? ETIQUETA_POR_ORIGEN_COCINERO : ETIQUETA_POR_ORIGEN;
  return etiquetas[origenDe(pedido)];
}

/** Colores del badge de estado. */
export function tonoDeEstado(pedido: PedidoParaEtiquetar): TonoDeEstado {
  return pedido.estado === 'RECHAZADO'
    ? TONO_POR_ORIGEN[origenDe(pedido)]
    : TONO_ACTIVO[pedido.estado];
}

/**
 * Encabezado del detalle de un pedido cerrado (US-PED-07).
 *
 * No recibe `vista`: los tres encabezados ("Pedido rechazado", "Pedido
 * cancelado", "Pedido expirado") describen el hecho sin atribuírselo a nadie,
 * así que sirven igual para los dos roles.
 */
export function encabezadoDeCierre(pedido: PedidoParaEtiquetar): string {
  return ENCABEZADO_POR_ORIGEN[origenDe(pedido)];
}

/** Indicador de estado del detalle de un pedido cerrado (US-PED-07). */
export function indicadorDeCierre(
  pedido: PedidoParaEtiquetar,
  vista: VistaDePedido,
): string {
  const indicadores =
    vista === 'COCINERO' ? INDICADOR_POR_ORIGEN_COCINERO : INDICADOR_POR_ORIGEN;
  return indicadores[origenDe(pedido)];
}

/**
 * Motivo que se le muestra a la otra parte, ya resuelto entre el del catálogo y
 * el texto libre.
 *
 * US-PED-07 pide "el mensaje de motivo enviado por el cocinero de forma íntegra
 * y destacada"; cuando el cocinero eligió un motivo rápido Y escribió, se
 * muestran los dos: el rápido dice el qué y el texto el por qué.
 */
export function motivoVisible(pedido: PedidoDetalle): string | null {
  const partes = [pedido.motivoCancelacion, pedido.motivoRechazo].filter(
    (parte): parte is string => Boolean(parte),
  );
  return partes.length > 0 ? partes.join(' · ') : null;
}
