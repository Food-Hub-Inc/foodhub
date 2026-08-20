import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  numeric,
  pgSequence,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { estadoPedidoEnum, origenTransicionEnum } from './enums.js';
import { motivoCancelacion } from './catalogo.js';
import { cocinero, usuario } from './usuarios.js';
import { publicacion } from './publicaciones.js';

/**
 * Modulo de pedidos: el proceso transaccional central del sistema
 * (alcance 2.2.2.2.2).
 */

/**
 * Secuencia del numero visible de pedido (US-PED-01, RF022).
 *
 * RF022 fija el formato: "prefijo FH- seguido de un secuencial de cinco digitos
 * con ceros a la izquierda". El secuencial lo lleva la base y no la aplicacion:
 * calcularlo con un `max(numero) + 1` en el servicio abriria una condicion de
 * carrera entre dos clientes que confirman a la vez, y el indice unico de
 * `numero_pedido` convertiria esa carrera en un error visible para el usuario.
 * `nextval` es atomico y no bloquea.
 *
 * Los huecos que deja una transaccion abortada son irrelevantes: el numero
 * identifica al pedido, no cuenta cuantos hubo.
 */
export const secuenciaNumeroPedido = pgSequence('pedido_numero_seq', {
  startWith: 1,
  increment: 1,
  minValue: 1,
  cycle: false,
});

/**
 * Diagrama: Pedido.
 *
 * `estadoPedidoActual` es una columna desnormalizada respecto de
 * historial_estado_pedido: el estado vigente se podria derivar de la ultima
 * transicion, pero el listado de pedidos filtra por estado en cada carga y
 * resolverlo con una subconsulta por fila no escala.
 * historial_estado_pedido conserva la trazabilidad completa.
 */
export const pedido = pgTable(
  'pedido',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /**
     * Identificador visible para el usuario (ej. "FH-000123"). Se muestra en
     * la app y en el chat: un UUID no es dictable por telefono ni memorizable.
     */
    numeroPedido: varchar('numero_pedido', { length: 20 }).notNull().unique(),

    clientePedidoId: uuid('cliente_pedido_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'restrict' }),
    cocineroPedidoId: uuid('cocinero_pedido_id')
      .notNull()
      .references(() => cocinero.usuarioId, { onDelete: 'restrict' }),

    estadoPedidoActual: estadoPedidoEnum('estado_pedido_actual')
      .notNull()
      .default('CREADO'),

    instruccionesCliente: varchar('instrucciones_cliente', { length: 300 }),
    tiempoEstimadoPreparacionMin: integer('tiempo_estimado_preparacion_min'),
    tiempoFinalPreparacionMin: integer('tiempo_final_preparacion_min'),

    // --- Rechazo / cancelacion ----------------------------------------------
    origenRechazo: origenTransicionEnum('origen_rechazo'),
    motivoRechazo: text('motivo_rechazo'),
    usuarioOrigenRechazoId: uuid('usuario_origen_rechazo_id').references(
      () => usuario.id,
      { onDelete: 'set null' },
    ),
    motivoCancelacionId: uuid('motivo_cancelacion_id').references(
      () => motivoCancelacion.id,
      { onDelete: 'restrict' },
    ),

    fechaCreacion: timestamp('fecha_creacion', { withTimezone: true })
      .notNull()
      .defaultNow(),
    fechaUltimaTransicion: timestamp('fecha_ultima_transicion', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    /**
     * NO HAY CHECK DE "RECHAZO CON MOTIVO", y su ausencia es deliberada.
     *
     * El CHECK original exigia `motivo_cancelacion_id` en todo pedido
     * RECHAZADO, pero los tres caminos que llevan a ese estado lo contradicen:
     * el cliente cancela "con o sin motivo ingresado" (US-PED-09), el cocinero
     * puede rechazar con solo texto libre de cinco palabras y sin elegir un
     * motivo del catalogo (US-PED-04) y la expiracion automatica no tiene
     * motivo alguno (US-PED-10). Se elimino en la migracion 0008.
     *
     * La obligatoriedad que SI existe -motivo cuando rechaza el cocinero- es
     * condicional y depende de `origen_rechazo`, asi que vive en
     * `rechazarPedidoSchema` (@foodhub/shared) y en el servicio de pedidos.
     */
    // Nadie puede pedirse a si mismo.
    check(
      'pedido_partes_distintas',
      sql`${t.clientePedidoId} <> ${t.cocineroPedidoId}`,
    ),
    // Indices compuestos: ambos listados (el del cliente y el del cocinero)
    // filtran por estado y ordenan por fecha descendente.
    index('pedido_cliente_idx').on(
      t.clientePedidoId,
      t.estadoPedidoActual,
      t.fechaCreacion.desc(),
    ),
    index('pedido_cocinero_idx').on(
      t.cocineroPedidoId,
      t.estadoPedidoActual,
      t.fechaCreacion.desc(),
    ),
    // Usado por el job de expiracion automatica (US-PED-10), que busca los
    // pedidos en CREADO cuya fecha supera el limite parametrizado.
    index('pedido_expiracion_idx')
      .on(t.fechaCreacion)
      .where(sql`${t.estadoPedidoActual} = 'CREADO'`),
  ],
).enableRLS();

/**
 * Diagrama: ItemPedido.
 *
 * Los campos *Snapshot congelan el plato tal como estaba al confirmar el
 * pedido. Si el cocinero cambia el precio o borra la publicacion despues, el
 * historial del cliente y el total cobrado siguen siendo los originales.
 * Sin este congelamiento el importe de un pedido cerrado podria cambiar solo.
 */
export const itemPedido = pgTable(
  'item_pedido',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pedidoId: uuid('pedido_id')
      .notNull()
      .references(() => pedido.id, { onDelete: 'cascade' }),
    publicacionId: uuid('publicacion_id')
      .notNull()
      .references(() => publicacion.id, { onDelete: 'restrict' }),
    cantidad: integer('cantidad').notNull(),
    precioUnitarioSnapshot: numeric('precio_unitario_snapshot', {
      precision: 12,
      scale: 2,
    }).notNull(),
    nombrePlatoSnapshot: varchar('nombre_plato_snapshot', {
      length: 120,
    }).notNull(),
    imagenSnapshot: text('imagen_snapshot'),
  },
  (t) => [
    check('item_pedido_cantidad_positiva', sql`${t.cantidad} > 0`),
    check('item_pedido_precio_positivo', sql`${t.precioUnitarioSnapshot} > 0`),
    index('item_pedido_pedido_idx').on(t.pedidoId),
  ],
).enableRLS();

/**
 * Diagrama: HistorialEstadoPedido. Registro append-only de cada transicion.
 *
 * Responde "quien cambio que y cuando" sobre el ciclo de vida del pedido, dato
 * que el modulo de pedidos expone a ambas partes y que el administrador usa
 * para resolver reclamos.
 */
export const historialEstadoPedido = pgTable(
  'historial_estado_pedido',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pedidoId: uuid('pedido_id')
      .notNull()
      .references(() => pedido.id, { onDelete: 'cascade' }),
    // Nullable solo en la primera fila: la creacion del pedido no tiene estado
    // anterior del que provenir.
    estadoPedidoAnterior: estadoPedidoEnum('estado_pedido_anterior'),
    estadoPedidoActual: estadoPedidoEnum('estado_pedido_actual').notNull(),
    origenTransicion: origenTransicionEnum('origen_transicion').notNull(),
    // Nullable cuando el origen es SISTEMA (expiracion automatica).
    usuarioResponsableId: uuid('usuario_responsable_id').references(
      () => usuario.id,
      { onDelete: 'set null' },
    ),
    motivo: text('motivo'),
    fechaTransicion: timestamp('fecha_transicion', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('historial_pedido_idx').on(t.pedidoId, t.fechaTransicion),
    check(
      'historial_transicion_efectiva',
      sql`${t.estadoPedidoAnterior} is null or ${t.estadoPedidoAnterior} <> ${t.estadoPedidoActual}`,
    ),
  ],
).enableRLS();
