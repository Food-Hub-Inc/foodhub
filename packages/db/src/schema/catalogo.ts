import { sql } from 'drizzle-orm';
import {
  boolean,
  geometry,
  index,
  numeric,
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
);

/** Diagrama: Ciudad. */
export const ciudad = pgTable(
  'ciudad',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nombre: varchar('nombre', { length: 120 }).notNull(),
    provincia: varchar('provincia', { length: 120 }).notNull(),
    pais: varchar('pais', { length: 80 }).notNull().default('Argentina'),
    activo: boolean('activo').notNull().default(true),
  },
  (t) => [uniqueIndex('ciudad_uq').on(t.nombre, t.provincia, t.pais)],
);

/**
 * Diagrama: ZonaCobertura. Area declarada por el cocinero al registrarse
 * (US-AUT-02) y usada por el buscador de proximidad.
 *
 * `centro` es un punto PostGIS en SRID 4326 (WGS-84, el sistema de coordenadas
 * del GPS), declarado con el tipo `geometry` que expone Drizzle.
 *
 * Para calcular distancias en METROS sobre la superficie terrestre hay que
 * castear a `geography` en la consulta:
 *
 *     ST_DWithin(centro::geography, $punto::geography, $metros)
 *
 * Sin ese cast, ST_DWithin interpreta el radio en grados de latitud/longitud y
 * el resultado no corresponde a ninguna distancia real.
 */
export const zonaCobertura = pgTable(
  'zona_cobertura',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ciudadId: uuid('ciudad_id')
      .notNull()
      .references(() => ciudad.id, { onDelete: 'restrict' }),
    nombre: varchar('nombre', { length: 120 }).notNull(),
    centro: geometry('centro', {
      type: 'point',
      mode: 'xy',
      srid: 4326,
    }).notNull(),
    radioKm: numeric('radio_km', { precision: 6, scale: 2 }).notNull(),
    activo: boolean('activo').notNull().default(true),
  },
  (t) => [
    // Indice GiST: sin el, cada busqueda por proximidad recorre la tabla
    // completa calculando distancias una por una.
    index('zona_cobertura_centro_gix').using('gist', t.centro),
    index('zona_cobertura_ciudad_idx').on(t.ciudadId),
  ],
);

/** Diagrama: RolDestino. Segmenta el contenido de ayuda por rol de usuario. */
export const rolDestino = pgTable('rol_destino', {
  id: uuid('id').primaryKey().defaultRandom(),
  nombre: varchar('nombre', { length: 60 }).notNull().unique(),
});

/** Diagrama: TipoConsulta. Clasifica los tickets de soporte. */
export const tipoConsulta = pgTable('tipo_consulta', {
  id: uuid('id').primaryKey().defaultRandom(),
  nombreTipoConsulta: varchar('nombre_tipo_consulta', { length: 80 })
    .notNull()
    .unique(),
  activo: boolean('activo').notNull().default(true),
});

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
});

/** Diagrama: MotivoCancelacion. ABM del administrador (US-CFG-02). */
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
  (t) => [index('motivo_cancelacion_tipo_idx').on(t.tipoUsuarioCancelacionId)],
);

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
});
