import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

/**
 * Entidades de referencia y parametrizacion del sistema.
 *
 * Todas son administrables desde el panel (Modulo de configuracion y
 * parametros, alcance 2.2.2.2.3), por eso son tablas y no ENUM: el
 * administrador puede darlas de alta o baja sin desplegar codigo.
 *
 * Ninguna se borra fisicamente: llevan un flag `activo`. Dar de baja una
 * categoria no puede romper las publicaciones historicas que la referencian.
 */

/** Diagrama: Categoria. Categorias de platos (US-CFG-01). */
export const categoria = pgTable(
  'categoria',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nombre: varchar('nombre', { length: 80 }).notNull(),
    descripcion: text('descripcion'),
    imagenPredeterminadaUrl: text('imagen_predeterminada_url'),
    activo: boolean('activo').notNull().default(true),
    fechaCreacion: timestamp('fecha_creacion', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Nombre unico solo entre las activas: permite reutilizar el nombre de una
    // categoria dada de baja sin chocar con el historico.
    uniqueIndex('categoria_nombre_activo_uq')
      .on(t.nombre)
      .where(sql`${t.activo} = true`),
  ],
).enableRLS();

/** Diagrama: RolDestino. Segmenta el contenido de ayuda por rol de usuario. */
export const rolDestino = pgTable('rol_destino', {
  id: uuid('id').primaryKey().defaultRandom(),
  nombre: varchar('nombre', { length: 60 }).notNull().unique(),
}).enableRLS();

/** Diagrama: TipoConsulta. Clasifica los tickets de soporte. */
export const tipoConsulta = pgTable('tipo_consulta', {
  id: uuid('id').primaryKey().defaultRandom(),
  nombreTipoConsulta: varchar('nombre_tipo_consulta', { length: 80 })
    .notNull()
    .unique(),
  activo: boolean('activo').notNull().default(true),
}).enableRLS();

/**
 * Diagrama: TipoUsuarioCancelacion. Determina que motivos de cancelacion ve
 * cada parte: un cliente no deberia poder elegir "no tengo ingredientes".
 */
export const tipoUsuarioCancelacion = pgTable('tipo_usuario_cancelacion', {
  id: uuid('id').primaryKey().defaultRandom(),
  nombreTipoUsuarioCancelacion: varchar('nombre_tipo_usuario_cancelacion', {
    length: 60,
  })
    .notNull()
    .unique(),
}).enableRLS();

/**
 * Diagrama: MotivoCancelacion. ABM del administrador (US-CFG-02).
 *
 * `nombre` es unico solo entre los activos (RF056: "Nombre del motivo...
 * unico"), mismo criterio que `categoria`: permite reutilizar el nombre de un
 * motivo deshabilitado sin chocar con el historico de pedidos que todavia lo
 * referencian.
 */
export const motivoCancelacion = pgTable(
  'motivo_cancelacion',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nombre: varchar('nombre', { length: 160 }).notNull(),
    tipoUsuarioCancelacionId: uuid('tipo_usuario_cancelacion_id')
      .notNull()
      .references(() => tipoUsuarioCancelacion.id, { onDelete: 'restrict' }),
    activo: boolean('activo').notNull().default(true),
  },
  (t) => [
    index('motivo_cancelacion_tipo_idx').on(t.tipoUsuarioCancelacionId),
    uniqueIndex('motivo_cancelacion_nombre_activo_uq')
      .on(t.nombre)
      .where(sql`${t.activo} = true`),
  ],
).enableRLS();

/**
 * Diagrama: ConfiguracionSistema. Parametros operativos editables sin
 * desplegar codigo (US-CFG-03): radio de busqueda por defecto, minutos de
 * expiracion de un
 * pedido sin respuesta (US-PED-10), tamano maximo de imagen, etc.
 *
 * Se guarda `valor` como texto y cada consumidor lo interpreta con su propio
 * schema de zod: una tabla clave-valor no puede tipar columnas distintas.
 */
export const configuracionSistema = pgTable('configuracion_sistema', {
  id: uuid('id').primaryKey().defaultRandom(),
  clave: varchar('clave', { length: 120 }).notNull().unique(),
  valor: text('valor').notNull(),
  descripcion: text('descripcion'),
  fechaUltimaModificacion: timestamp('fecha_ultima_modificacion', {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
  // Sin FK a usuario para evitar una dependencia circular entre modulos:
  // el administrador que modifico el parametro queda trazado en registro_auditoria.
  adminModificadorId: uuid('admin_modificador_id'),
}).enableRLS();
