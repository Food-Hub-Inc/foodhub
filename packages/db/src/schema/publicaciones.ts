import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { estadoPublicacionEnum } from './enums.js';
import { categoria } from './catalogo.js';
import { cocinero, usuario } from './usuarios.js';

/**
 * Modulo de publicaciones y modulo de exploracion y busqueda
 * (alcance 2.2.2.2.2).
 */

/**
 * Diagrama: Publicacion. Plato ofrecido por un cocinero.
 *
 * No se borra fisicamente: `activo` marca la baja logica. Un pedido historico
 * referencia la publicacion, y perder ese dato dejaria el historial del cliente
 * mostrando platos vacios.
 */
export const publicacion = pgTable(
  'publicacion',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cocineroId: uuid('cocinero_id')
      .notNull()
      .references(() => cocinero.usuarioId, { onDelete: 'cascade' }),
    categoriaId: uuid('categoria_id')
      .notNull()
      .references(() => categoria.id, { onDelete: 'restrict' }),

    nombre: varchar('nombre', { length: 120 }).notNull(),
    descripcion: varchar('descripcion', { length: 1000 }),

    /**
     * `numeric` y no `double precision`: el punto flotante binario no
     * representa exactamente los decimales de un precio y acumula error al
     * sumar los items de un pedido.
     */
    precio: numeric('precio', { precision: 12, scale: 2 }).notNull(),

    imagenUrl: text('imagen_url'),
    estadoPublicacion: estadoPublicacionEnum('estado_publicacion')
      .notNull()
      .default('DISPONIBLE'),
    tiempoEstimadoPreparacion: integer('tiempo_estimado_preparacion'),

    // --- Moderacion del administrador (alcance 2.2.2.2.3) --------------------
    motivoEliminacionAdmin: text('motivo_eliminacion_admin'),
    eliminadaPorAdminId: uuid('eliminada_por_admin_id').references(
      () => usuario.id,
      { onDelete: 'set null' },
    ),

    activo: boolean('activo').notNull().default(true),
    fechaCreacion: timestamp('fecha_creacion', { withTimezone: true })
      .notNull()
      .defaultNow(),
    fechaUltimaEdicion: timestamp('fecha_ultima_edicion', {
      withTimezone: true,
    }),
  },
  (t) => [
    // La restriccion vive en la base y no solo en la API: cualquier via de
    // escritura (migracion, script, panel de Supabase) queda cubierta.
    check('publicacion_precio_positivo', sql`${t.precio} > 0`),
    check(
      'publicacion_tiempo_preparacion_valido',
      sql`${t.tiempoEstimadoPreparacion} is null or ${t.tiempoEstimadoPreparacion} > 0`,
    ),
    index('publicacion_cocinero_idx').on(t.cocineroId),
    index('publicacion_categoria_idx').on(t.categoriaId),
    // Indice parcial para el feed: solo interesan las publicaciones vigentes,
    // y asi el indice no crece con el historico dado de baja.
    index('publicacion_feed_idx')
      .on(t.fechaCreacion.desc())
      .where(sql`${t.activo} = true`),
  ],
);

/**
 * Diagrama: Favorito (abstracta) con FavoritoCocinero y FavoritoPublicacion.
 *
 * La jerarquia se traduce a dos tablas concretas en vez de una tabla con
 * columnas mutuamente excluyentes: asi cada FK puede declararse NOT NULL y la
 * base impide por si sola un favorito que no apunte a nada.
 */
export const favoritoCocinero = pgTable(
  'favorito_cocinero',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clienteId: uuid('cliente_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'cascade' }),
    cocineroId: uuid('cocinero_id')
      .notNull()
      .references(() => cocinero.usuarioId, { onDelete: 'cascade' }),
    fechaCreacion: timestamp('fecha_creacion', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('favorito_cocinero_uq').on(t.clienteId, t.cocineroId),
    index('favorito_cocinero_cliente_idx').on(t.clienteId),
  ],
);

export const favoritoPublicacion = pgTable(
  'favorito_publicacion',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clienteId: uuid('cliente_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'cascade' }),
    publicacionId: uuid('publicacion_id')
      .notNull()
      .references(() => publicacion.id, { onDelete: 'cascade' }),
    fechaCreacion: timestamp('fecha_creacion', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('favorito_publicacion_uq').on(t.clienteId, t.publicacionId),
    index('favorito_publicacion_cliente_idx').on(t.clienteId),
  ],
);

/**
 * Diagrama: Carrito. Un carrito por cliente y por cocinero.
 *
 * El indice unico sobre (clienteId, cocineroId) implementa a nivel de base la
 * regla de negocio "un pedido no puede mezclar platos de cocineros distintos":
 * si el cliente agrega un plato de otro cocinero, se abre un carrito separado.
 */
export const carrito = pgTable(
  'carrito',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clienteId: uuid('cliente_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'cascade' }),
    cocineroId: uuid('cocinero_id')
      .notNull()
      .references(() => cocinero.usuarioId, { onDelete: 'cascade' }),
    fechaCreacion: timestamp('fecha_creacion', { withTimezone: true })
      .notNull()
      .defaultNow(),
    fechaUltimaModificacion: timestamp('fecha_ultima_modificacion', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('carrito_cliente_cocinero_uq').on(t.clienteId, t.cocineroId),
  ],
);

/**
 * Diagrama: ItemCarrito.
 *
 * Guarda un snapshot de nombre, precio e imagen ademas de la FK. Si el
 * cocinero edita el plato mientras esta en el carrito, el cliente sigue viendo
 * lo que agrego y la API puede avisarle del cambio antes de confirmar.
 */
export const itemCarrito = pgTable(
  'item_carrito',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    carritoId: uuid('carrito_id')
      .notNull()
      .references(() => carrito.id, { onDelete: 'cascade' }),
    publicacionId: uuid('publicacion_id')
      .notNull()
      .references(() => publicacion.id, { onDelete: 'cascade' }),
    cantidad: integer('cantidad').notNull().default(1),
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
    check('item_carrito_cantidad_positiva', sql`${t.cantidad} > 0`),
    uniqueIndex('item_carrito_uq').on(t.carritoId, t.publicacionId),
  ],
);
