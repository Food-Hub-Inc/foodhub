import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { estadoTicketEnum } from './enums.js';
import { rolDestino, tipoConsulta } from './catalogo.js';
import { usuario } from './usuarios.js';

/**
 * Modulo de ayuda y soporte al usuario (alcance 2.2.2.2.3).
 */

/** Diagrama: CapituloAyuda. Nivel superior del manual dentro de la app. */
export const capituloAyuda = pgTable(
  'capitulo_ayuda',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    titulo: varchar('titulo', { length: 160 }).notNull(),
    rolDestinoId: uuid('rol_destino_id')
      .notNull()
      .references(() => rolDestino.id, { onDelete: 'restrict' }),
    // Orden de presentacion definido por el administrador: el manual sigue una
    // secuencia didactica, no el orden de carga.
    orden: integer('orden').notNull().default(0),
    activo: boolean('activo').notNull().default(true),
    fechaCreacion: timestamp('fecha_creacion', { withTimezone: true })
      .notNull()
      .defaultNow(),
    // US-AYU-05: al editar se registra la fecha de modificacion. No hay trigger:
    // la actualiza el servicio en cada edicion, igual que configuracion_sistema.
    fechaUltimaModificacion: timestamp('fecha_ultima_modificacion', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('capitulo_ayuda_rol_idx').on(t.rolDestinoId, t.orden)],
).enableRLS();

/** Diagrama: SeccionAyuda. Contenido concreto dentro de un capitulo. */
export const seccionAyuda = pgTable(
  'seccion_ayuda',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    capituloId: uuid('capitulo_id')
      .notNull()
      .references(() => capituloAyuda.id, { onDelete: 'cascade' }),
    titulo: varchar('titulo', { length: 160 }).notNull(),
    contenidoHtml: text('contenido_html').notNull(),
    rolDestinoId: uuid('rol_destino_id')
      .notNull()
      .references(() => rolDestino.id, { onDelete: 'restrict' }),
    orden: integer('orden').notNull().default(0),
    habilitado: boolean('habilitado').notNull().default(true),
    fechaCreacion: timestamp('fecha_creacion', { withTimezone: true })
      .notNull()
      .defaultNow(),
    fechaUltimaModificacion: timestamp('fecha_ultima_modificacion', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('seccion_ayuda_capitulo_idx').on(t.capituloId, t.orden)],
).enableRLS();

/**
 * Diagrama: FAQ. Preguntas frecuentes diferenciadas por rol.
 * Los contadores de votos permiten ordenar por utilidad y detectar que
 * respuestas conviene reescribir.
 */
export const faq = pgTable(
  'faq',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pregunta: varchar('pregunta', { length: 300 }).notNull(),
    respuesta: text('respuesta').notNull(),
    categoria: varchar('categoria', { length: 80 }),
    rolDestinoId: uuid('rol_destino_id')
      .notNull()
      .references(() => rolDestino.id, { onDelete: 'restrict' }),
    votosUtil: integer('votos_util').notNull().default(0),
    votosNoUtil: integer('votos_no_util').notNull().default(0),
    activo: boolean('activo').notNull().default(true),
    fechaCreacion: timestamp('fecha_creacion', { withTimezone: true })
      .notNull()
      .defaultNow(),
    fechaUltimaModificacion: timestamp('fecha_ultima_modificacion', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('faq_rol_idx').on(t.rolDestinoId)],
).enableRLS();

/** Diagrama: TicketSoporte. Canal de contacto del usuario con el equipo. */
export const ticketSoporte = pgTable(
  'ticket_soporte',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'cascade' }),
    tipoConsultaId: uuid('tipo_consulta_id')
      .notNull()
      .references(() => tipoConsulta.id, { onDelete: 'restrict' }),
    asunto: varchar('asunto', { length: 200 }).notNull(),
    descripcion: text('descripcion').notNull(),
    estadoTicket: estadoTicketEnum('estado_ticket')
      .notNull()
      .default('ABIERTO'),
    fechaCreacion: timestamp('fecha_creacion', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('ticket_soporte_usuario_idx').on(t.usuarioId),
    // Bandeja de entrada del equipo de soporte, agrupada por estado.
    index('ticket_soporte_estado_idx').on(
      t.estadoTicket,
      t.fechaCreacion.desc(),
    ),
  ],
).enableRLS();

/** Diagrama: AdjuntoTicket. Capturas que el usuario sube junto al reclamo. */
export const adjuntoTicket = pgTable(
  'adjunto_ticket',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ticketId: uuid('ticket_id')
      .notNull()
      .references(() => ticketSoporte.id, { onDelete: 'cascade' }),
    archivoUrl: text('archivo_url').notNull(),
    nombreArchivo: varchar('nombre_archivo', { length: 255 }).notNull(),
    tipoMime: varchar('tipo_mime', { length: 100 }).notNull(),
    tamanoBytes: integer('tamano_bytes').notNull(),
  },
  (t) => [index('adjunto_ticket_idx').on(t.ticketId)],
).enableRLS();
