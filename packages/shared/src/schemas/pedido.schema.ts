import { z } from 'zod';
import {
  ESTADO_PEDIDO,
  ORIGEN_TRANSICION,
  TRANSICIONES_PEDIDO,
  type EstadoPedido,
} from '../constants/enums.js';
import { MENSAJES_PEDIDO } from '../constants/mensajes.js';

/**
 * Contratos del modulo de Pedidos (US-PED-01 a US-PED-10, RF022 a RF032).
 *
 * TRES DECISIONES QUE ATRAVIESAN TODO EL MODULO
 *
 *   EL PEDIDO NACE DEL CARRITO   `confirmarPedidoSchema` no recibe ni platos ni
 *       cocinero ni precios: el servidor los toma del carrito del cliente
 *       autenticado, que ya es unico por cliente (`carrito_cliente_uq`).
 *       Aceptar esos datos del cliente permitiria armar un pedido con precios
 *       inventados o mezclando cocineros, y ademas duplicaria en el request una
 *       informacion que el servidor ya tiene.
 *
 *   LOS PRECIOS SON `string`   La columna es `numeric(12,2)`; coercionar a
 *       `number` reintroduce el error de punto flotante que esa eleccion evita.
 *       Mismo criterio que `exploracion.schema.ts` y `publicacion.schema.ts`.
 *
 *   UNA LEYENDA POR ROL   El mismo estado interno se nombra distinto segun quien
 *       mire: CREADO es "Recibido" para el cliente (US-PED-02) y "Nuevos" para
 *       el cocinero (US-PED-03). El contrato viaja SIEMPRE con el estado
 *       interno; la traduccion la hacen las pantallas con MENSAJES_PEDIDO.
 */

// ---------------------------------------------------------------------------
// Reglas del dominio
// ---------------------------------------------------------------------------

/**
 * Opciones del selector de tiempo estimado de preparacion (US-PED-03).
 *
 * Los valores salen de la ficha de PAN-PED-04.4 -"selector de tiempo estimado
 * (20/30/45 min / 1 hora)"-. El criterio de aceptacion habla de "las opciones
 * disponibles" sin enumerarlas, asi que la maquetacion es la unica fuente.
 */
export const TIEMPOS_ESTIMADOS_PREPARACION = [20, 30, 45, 60] as const;
export type TiempoEstimadoPreparacion =
  (typeof TIEMPOS_ESTIMADOS_PREPARACION)[number];

/**
 * Palabras minimas del motivo de rechazo escrito a mano (US-PED-04).
 *
 * "El boton permanece deshabilitado hasta que el cocinero seleccione al menos
 * un motivo rapido O ingrese al menos 5 palabras en el campo de texto libre."
 */
export const MINIMO_PALABRAS_MOTIVO_RECHAZO = 5;

/**
 * Ancho, en minutos, del rango horario que ve el cliente mientras el pedido se
 * prepara (US-PED-02: "tiempo estimado de preparacion como rango horario (ej.
 * 'Estimado 9:45 - 9:55 hs')").
 *
 * El cocinero compromete UN valor, no un rango, asi que el rango se construye
 * hacia atras desde la hora prometida: termina cuando el cocinero dijo que iba
 * a estar listo y empieza diez minutos antes. Decision del equipo (2026-08-19),
 * consistente con PAN-PED-03, que muestra "Estimado 14:05 - 14:15 hs" para un
 * pedido aceptado a las 13:45 con 30 minutos de preparacion. El cliente nunca
 * espera mas de lo prometido.
 */
export const MARGEN_RANGO_ESTIMADO_MINUTOS = 10;

/**
 * Unica puerta de entrada a la maquina de estados.
 *
 * Todo cambio de estado -acepte, rechace, avance o cancele- pasa por aca antes
 * de tocar la base. Tener la regla en una funcion y no repartida entre los
 * handlers es lo que garantiza que `CREADO -> COMPLETADO` sea imposible sin
 * importar por que endpoint se intente.
 *
 * Funcion PURA: se prueba sin base.
 */
export function transicionValida(
  desde: EstadoPedido,
  hacia: EstadoPedido,
): boolean {
  const permitidos: readonly EstadoPedido[] = TRANSICIONES_PEDIDO[desde];
  return permitidos.includes(hacia);
}

/**
 * Cuenta las palabras de un texto libre.
 *
 * Se usa para el minimo de US-PED-04 y vive aca -y no en la pantalla- porque la
 * misma cuenta la hacen dos partes: la app para habilitar el boton y la API
 * para no confiar en que la app lo haya hecho.
 *
 * Funcion PURA.
 */
export function contarPalabras(texto: string): number {
  const limpio = texto.trim();
  if (limpio === '') return 0;
  return limpio.split(/\s+/u).length;
}

/**
 * El cocinero puede rechazar: eligio un motivo del catalogo O escribio al menos
 * cinco palabras (US-PED-04, primer criterio).
 *
 * Funcion PURA.
 */
export function motivoDeRechazoSuficiente(entrada: {
  motivoCancelacionId?: string | undefined;
  motivoTexto?: string | undefined;
}): boolean {
  if (entrada.motivoCancelacionId) return true;
  return (
    contarPalabras(entrada.motivoTexto ?? '') >= MINIMO_PALABRAS_MOTIVO_RECHAZO
  );
}

/**
 * Rango horario que se le muestra al cliente mientras el pedido se prepara.
 *
 * Devuelve `null` si el pedido todavia no fue aceptado o si no hay tiempo
 * comprometido: sin una de las dos cosas no hay nada que estimar, y mostrar un
 * rango inventado seria peor que no mostrar ninguno.
 *
 * Funcion PURA: recibe la fecha de aceptacion, no la lee del reloj.
 */
export function rangoHorarioEstimado(
  fechaAceptacion: Date | null,
  minutosEstimados: number | null,
): { desde: Date; hasta: Date } | null {
  if (!fechaAceptacion || minutosEstimados === null) return null;

  const hasta = new Date(fechaAceptacion.getTime() + minutosEstimados * 60_000);
  const desde = new Date(
    hasta.getTime() - MARGEN_RANGO_ESTIMADO_MINUTOS * 60_000,
  );
  return { desde, hasta };
}

// ---------------------------------------------------------------------------
// US-PED-01 - Confirmar pedido
// ---------------------------------------------------------------------------

/**
 * Confirmacion del pedido desde el carrito (PAN-PED-01).
 *
 * El unico dato que aporta el cliente son las instrucciones opcionales del
 * campo "Notas para el cocinero", que hasta ahora vivian solo en el estado de
 * la pantalla del carrito (`carrito` no tiene columna para ellas) y recien aca
 * se persisten, en `pedido.instrucciones_cliente`.
 *
 * El tope de 300 caracteres es el de la columna, y el mismo que ya aplica el
 * campo del carrito: dejar escribir mas haria que el cliente perdiera texto
 * justo al confirmar.
 */
export const confirmarPedidoSchema = z.object({
  instruccionesCliente: z
    .string()
    .trim()
    .max(300, 'Las instrucciones no pueden superar los 300 caracteres.')
    .optional(),
});

// ---------------------------------------------------------------------------
// US-PED-03 - Aceptar pedido
// ---------------------------------------------------------------------------

/**
 * Aceptacion del pedido por el cocinero.
 *
 * El tiempo estimado es OBLIGATORIO y con un mensaje literal: el quinto
 * criterio de US-PED-03 exige que aceptar sin elegirlo muestre el literal
 * `MENSAJES_PEDIDO.seleccionaTiempoPreparacion` y no avance. Validarlo tambien en el
 * servidor -y no solo deshabilitando el boton- es lo que impide que un cliente
 * HTTP directo cree un pedido aceptado sin compromiso de tiempo.
 */
export const aceptarPedidoSchema = z.object({
  tiempoEstimadoPreparacionMin: z
    .number({ message: MENSAJES_PEDIDO.seleccionaTiempoPreparacion })
    .int(MENSAJES_PEDIDO.seleccionaTiempoPreparacion)
    .refine(
      (minutos): minutos is TiempoEstimadoPreparacion =>
        (TIEMPOS_ESTIMADOS_PREPARACION as readonly number[]).includes(minutos),
      { message: MENSAJES_PEDIDO.seleccionaTiempoPreparacion },
    ),
});

// ---------------------------------------------------------------------------
// US-PED-04 - Rechazar pedido / US-PED-09 - Cancelar pedido
// ---------------------------------------------------------------------------

/**
 * Motivo de una salida del pedido hacia RECHAZADO.
 *
 * Las dos partes lo componen igual -un motivo del catalogo, un texto libre, o
 * ambos- pero la EXIGENCIA es distinta y por eso hay dos schemas y no uno con
 * una bandera:
 *
 *   COCINERO (US-PED-04)  motivo obligatorio: catalogo o cinco palabras.
 *   CLIENTE  (US-PED-09)  "con o sin motivo ingresado": todo opcional.
 *
 * Meterlas en el mismo schema obligaria a que el servicio recordara cual regla
 * aplica; separadas, el propio contrato lo dice.
 */
const motivoBaseSchema = z.object({
  motivoCancelacionId: z
    .uuid('El motivo seleccionado no es válido.')
    .optional(),
  motivoTexto: z
    .string()
    .trim()
    .max(300, 'El motivo no puede superar los 300 caracteres.')
    .optional(),
});

export const rechazarPedidoSchema = motivoBaseSchema.refine(
  motivoDeRechazoSuficiente,
  {
    message: MENSAJES_PEDIDO.motivoRechazoRequerido,
    path: ['motivoTexto'],
  },
);

export const cancelarPedidoSchema = motivoBaseSchema;

// ---------------------------------------------------------------------------
// Pestanas de los dos historiales
// ---------------------------------------------------------------------------

/**
 * Pestanas del historial del cliente (US-PED-06, PAN-PED-05).
 *
 * "Tres pestanas horizontales: Activos ("En curso"), Completados y Rechazados."
 */
export const PESTANA_PEDIDOS_CLIENTE = [
  'EN_CURSO',
  'COMPLETADOS',
  'RECHAZADOS',
] as const;
export type PestanaPedidosCliente = (typeof PESTANA_PEDIDOS_CLIENTE)[number];

/**
 * Pestanas de la bandeja del cocinero (US-PED-03 y US-PED-08, PAN-PED-04).
 *
 * "Cinco pestanas: Nuevos (pedidos en estado Creado), Preparando (Aceptado),
 * Listos (Listo), Completados y Rechazados."
 */
export const PESTANA_PEDIDOS_COCINERO = [
  'NUEVOS',
  'PREPARANDO',
  'LISTOS',
  'COMPLETADOS',
  'RECHAZADOS',
] as const;
export type PestanaPedidosCocinero = (typeof PESTANA_PEDIDOS_COCINERO)[number];

/**
 * Que estados internos entran en cada pestana.
 *
 * Es la traduccion de los criterios y la unica definicion de ese mapeo: el
 * servicio filtra con estas listas y la interfaz cuenta con ellas, de modo que
 * mover un estado de pestana sea un cambio de una linea.
 */
export const ESTADOS_POR_PESTANA_CLIENTE: Readonly<
  Record<PestanaPedidosCliente, readonly EstadoPedido[]>
> = {
  EN_CURSO: ['CREADO', 'ACEPTADO', 'LISTO'],
  COMPLETADOS: ['COMPLETADO'],
  RECHAZADOS: ['RECHAZADO'],
};

export const ESTADOS_POR_PESTANA_COCINERO: Readonly<
  Record<PestanaPedidosCocinero, readonly EstadoPedido[]>
> = {
  NUEVOS: ['CREADO'],
  PREPARANDO: ['ACEPTADO'],
  LISTOS: ['LISTO'],
  COMPLETADOS: ['COMPLETADO'],
  RECHAZADOS: ['RECHAZADO'],
};

/** Paginacion compartida por los dos listados. */
export const PEDIDOS_POR_PAGINA = 20;

export const filtrosPedidoClienteSchema = z.object({
  pestana: z.enum(PESTANA_PEDIDOS_CLIENTE).default('EN_CURSO'),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(50).default(PEDIDOS_POR_PAGINA),
});

export const filtrosPedidoCocineroSchema = z.object({
  pestana: z.enum(PESTANA_PEDIDOS_COCINERO).default('NUEVOS'),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(50).default(PEDIDOS_POR_PAGINA),
});

/**
 * US-DASH-03 - Los pedidos que un cliente le hizo al cocinero de la sesion.
 *
 * SIN PESTANA, a diferencia de los otros dos: la solapa del perfil del cliente
 * muestra el historial completo con esa persona, y separarlo por estado ahi
 * seria pedirle al cocinero que adivine en cual mirar para reconstruir la
 * relacion. Los contadores por estado viajan igual en la respuesta.
 */
export const filtrosPedidosConClienteSchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(50).default(PEDIDOS_POR_PAGINA),
});

// ---------------------------------------------------------------------------
// Piezas compartidas de las respuestas
// ---------------------------------------------------------------------------

/**
 * La otra parte del pedido: el cocinero cuando mira el cliente, el cliente
 * cuando mira el cocinero.
 *
 * Un solo tipo para los dos sentidos porque las dos pantallas muestran lo
 * mismo -foto, nombre y calificacion promedio- y duplicarlo haria que un
 * cambio en la tarjeta de identidad hubiera que hacerlo dos veces.
 *
 * `valoracionPromedio` es `null` y no 0 cuando todavia no hay calificaciones:
 * un 0 se leeria como la peor nota posible. La usan PAN-PED-04.6 (el cocinero
 * ve la reputacion del cliente) y PAN-PED-06 (el cliente, la del cocinero).
 */
export const participantePedidoSchema = z.object({
  id: z.uuid(),
  nombre: z.string(),
  apellido: z.string(),
  fotoPerfilUrl: z.url().nullable(),
  valoracionPromedio: z.number().nullable(),
});

/**
 * Un plato dentro del pedido, con los valores CONGELADOS al confirmar.
 *
 * No sale de la publicacion vigente: si el cocinero cambia el precio o da de
 * baja el plato, el historial del cliente y el importe cobrado tienen que
 * seguir siendo los originales (regla 2 del modulo).
 */
export const itemPedidoSchema = z.object({
  id: z.uuid(),
  publicacionId: z.uuid(),
  nombre: z.string(),
  precioUnitario: z.string(),
  cantidad: z.number().int().min(1),
  imagenUrl: z.url().nullable(),

  /**
   * Solo para el cliente y solo en pedidos COMPLETADO: si ya dejo su resena de
   * ESE plato. La resena es por publicacion, no por pedido (US-RES-01), asi que
   * el dato es por item y no del pedido entero.
   */
  yaResenado: z.boolean(),
});

/**
 * Un evento de la linea de tiempo (US-PED-07: "linea de tiempo cronologica con
 * todos los eventos del pedido registrados (nombre del evento, horario)").
 *
 * Es una fila de `historial_estado_pedido` tal cual: el estado al que se paso,
 * quien lo origino y cuando. La leyenda visible ("Recibido", "Aceptado"...) la
 * arma la pantalla, que es la que sabe si mira un cliente o un cocinero.
 */
export const eventoPedidoSchema = z.object({
  id: z.uuid(),
  estadoAnterior: z.enum(ESTADO_PEDIDO).nullable(),
  estado: z.enum(ESTADO_PEDIDO),
  origen: z.enum(ORIGEN_TRANSICION),
  motivo: z.string().nullable(),
  fecha: z.iso.datetime(),
});

// ---------------------------------------------------------------------------
// Respuestas
// ---------------------------------------------------------------------------

/**
 * Tarjeta de pedido de cualquiera de los listados.
 *
 * `primerItem` existe por un criterio explicito de US-PED-06: "(En caso de ser
 * varios platos, que se recupere el primero que fue seleccionado)". La tarjeta
 * muestra un plato aunque el pedido tenga varios, y `cantidadItems` permite
 * indicar que hay mas sin traerlos todos.
 *
 * `origenRechazo` viaja siempre -no solo cuando el pedido esta RECHAZADO-
 * porque es lo que distingue las tres etiquetas de la pestana "Rechazados":
 * "Cancelado por vos", "Rechazado por el cocinero" y "Expirado - sin respuesta
 * del cocinero" (US-PED-06).
 */
export const pedidoResumenSchema = z.object({
  id: z.uuid(),
  numeroPedido: z.string(),
  estado: z.enum(ESTADO_PEDIDO),
  origenRechazo: z.enum(ORIGEN_TRANSICION).nullable(),
  total: z.string(),
  cantidadItems: z.number().int().min(1),
  primerItem: z.object({
    nombre: z.string(),
    imagenUrl: z.url().nullable(),
    cantidad: z.number().int().min(1),
  }),
  participante: participantePedidoSchema,
  fechaCreacion: z.iso.datetime(),
  fechaUltimaTransicion: z.iso.datetime(),

  /**
   * `true` cuando el pedido esta COMPLETADO y todavia queda algo por calificar:
   * para el cliente, algun plato sin resenar; para el cocinero, ese cliente sin
   * calificar. Es lo que decide si la tarjeta muestra "Dejar resena"
   * (US-PED-06) o "Calificar cliente" (US-PED-08).
   */
  puedeCalificar: z.boolean(),
});

/**
 * Detalle completo del pedido (PAN-PED-06 para el cliente, PAN-PED-04.4 y
 * PAN-PED-04.6 para el cocinero).
 *
 * Es el mismo contrato para los dos roles. Lo que cambia entre ellos no son los
 * datos sino las acciones, y esas las decide la pantalla a partir de `estado` y
 * del rol de quien mira.
 */
export const pedidoDetalleSchema = pedidoResumenSchema.extend({
  items: z.array(itemPedidoSchema),
  instruccionesCliente: z.string().nullable(),
  tiempoEstimadoPreparacionMin: z.number().int().nullable(),

  /**
   * Momento en que el cocinero acepto, o `null` si nunca paso por ACEPTADO.
   * Con `tiempoEstimadoPreparacionMin` arma el rango horario que ve el cliente
   * (`rangoHorarioEstimado`).
   */
  fechaAceptacion: z.iso.datetime().nullable(),

  /** Texto libre de quien rechazo o cancelo. */
  motivoRechazo: z.string().nullable(),

  /** Nombre del motivo del catalogo elegido, si hubo (US-CFG-02). */
  motivoCancelacion: z.string().nullable(),

  historial: z.array(eventoPedidoSchema),

  /**
   * Si el cliente todavia esta a tiempo de cancelar (US-PED-09: el boton se
   * muestra solo en CREADO y "siempre que no haya transcurrido el tiempo maximo
   * de cancelacion configurado", RF057).
   *
   * Lo resuelve el servidor y no la app: el limite sale de
   * `configuracion_sistema` y depende del reloj del servidor, no del telefono.
   */
  puedeCancelar: z.boolean(),
});

/**
 * Pagina de un listado, con el contador de CADA pestana.
 *
 * Los contadores vienen completos y no solo el de la pestana pedida porque
 * US-PED-03 exige que "cada pestana muestre un contador con la cantidad de
 * pedidos en ese estado": si viniera uno solo, la bandeja tendria que hacer
 * cinco consultas para dibujar su encabezado.
 */
export const contadoresPedidoSchema = z.object({
  CREADO: z.number().int().min(0),
  ACEPTADO: z.number().int().min(0),
  LISTO: z.number().int().min(0),
  COMPLETADO: z.number().int().min(0),
  RECHAZADO: z.number().int().min(0),
});

export const paginaPedidosSchema = z.object({
  datos: z.array(pedidoResumenSchema),
  pagina: z.number().int().min(1),
  porPagina: z.number().int().min(1),
  hayMas: z.boolean(),
  contadores: contadoresPedidoSchema,
});

export type ConfirmarPedidoInput = z.infer<typeof confirmarPedidoSchema>;
export type AceptarPedidoInput = z.infer<typeof aceptarPedidoSchema>;
export type RechazarPedidoInput = z.infer<typeof rechazarPedidoSchema>;
export type CancelarPedidoInput = z.infer<typeof cancelarPedidoSchema>;
export type FiltrosPedidoCliente = z.infer<typeof filtrosPedidoClienteSchema>;
export type FiltrosPedidoCocinero = z.infer<typeof filtrosPedidoCocineroSchema>;
export type FiltrosPedidosConCliente = z.infer<
  typeof filtrosPedidosConClienteSchema
>;
export type ParticipantePedido = z.infer<typeof participantePedidoSchema>;
export type ItemPedido = z.infer<typeof itemPedidoSchema>;
export type EventoPedido = z.infer<typeof eventoPedidoSchema>;
export type PedidoResumen = z.infer<typeof pedidoResumenSchema>;
export type PedidoDetalle = z.infer<typeof pedidoDetalleSchema>;
export type ContadoresPedido = z.infer<typeof contadoresPedidoSchema>;
export type PaginaPedidos = z.infer<typeof paginaPedidosSchema>;
