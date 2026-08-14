import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { estadoMensajeEnum, tipoMensajeEnum } from './enums.js';
import { usuario } from './usuarios.js';

/**
 * Modulo de mensajeria directa (alcance 2.2.2.2.2): chat entre cliente y
 * cocinero dentro de la plataforma, para no depender de WhatsApp.
 */

/**
 * Diagrama: Conversacion.
 *
 * Los participantes van como dos columnas y no como tabla puente porque una
 * conversacion es siempre 1 a 1: no hay chats grupales en el alcance. Eso
 * permite declarar las dos FK NOT NULL y resolver el chat con un solo JOIN.
 *
 * Los contadores de no leidos y los flags de archivado estan duplicados por
 * participante: cada uno archiva y marca como leido de forma independiente.
 */
export const conversacion = pgTable(
  'conversacion',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuario1Id: uuid('usuario1_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'cascade' }),
    usuario2Id: uuid('usuario2_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'cascade' }),

    mensajesNoLeidosUsuario1: integer('mensajes_no_leidos_usuario1')
      .notNull()
      .default(0),
    mensajesNoLeidosUsuario2: integer('mensajes_no_leidos_usuario2')
      .notNull()
      .default(0),
    archivadaUsuario1: boolean('archivada_usuario1').notNull().default(false),
    archivadaUsuario2: boolean('archivada_usuario2').notNull().default(false),

    // Se activa cuando una de las partes da de baja su cuenta: el historial
    // queda visible para la otra, pero no se pueden enviar mensajes nuevos.
    bloqueadaPorBaja: boolean('bloqueada_por_baja').notNull().default(false),

    fechaCreacion: timestamp('fecha_creacion', { withTimezone: true })
      .notNull()
      .defaultNow(),
    fechaUltimoMensaje: timestamp('fecha_ultimo_mensaje', {
      withTimezone: true,
    }),
  },
  (t) => [
    check(
      'conversacion_participantes_distintos',
      sql`${t.usuario1Id} <> ${t.usuario2Id}`,
    ),
    /**
     * Unicidad de la conversacion entre dos personas, sin importar quien la
     * inicio: se normaliza el par ordenando los UUID antes de indexar. Sin
     * esto, (A,B) y (B,A) serian dos conversaciones distintas para la misma
     * pareja de usuarios.
     */
    uniqueIndex('conversacion_par_uq').on(
      sql`least(${t.usuario1Id}, ${t.usuario2Id})`,
      sql`greatest(${t.usuario1Id}, ${t.usuario2Id})`,
    ),
    index('conversacion_usuario1_idx').on(
      t.usuario1Id,
      t.fechaUltimoMensaje.desc(),
    ),
    index('conversacion_usuario2_idx').on(
      t.usuario2Id,
      t.fechaUltimoMensaje.desc(),
    ),
  ],
).enableRLS();

/**
 * Diagrama: Mensaje (abstracta) con MensajeTexto y MensajeImagen.
 *
 * A diferencia de Favorito, la jerarquia se resuelve con UNA tabla y un
 * discriminador: los dos subtipos comparten casi todos los atributos, se leen
 * SIEMPRE juntos y en orden cronologico. Separarlos obligaria a un UNION ALL
 * ordenado en cada carga del chat, que es la consulta mas frecuente del modulo.
 *
 * El CHECK garantiza que cada fila tenga poblada la columna que le corresponde
 * a su tipo y solo esa.
 */
export const mensaje = pgTable(
  'mensaje',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversacionId: uuid('conversacion_id')
      .notNull()
      .references(() => conversacion.id, { onDelete: 'cascade' }),
    remitenteId: uuid('remitente_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'cascade' }),

    tipo: tipoMensajeEnum('tipo').notNull(),
    estadoMensaje: estadoMensajeEnum('estado_mensaje')
      .notNull()
      .default('ENVIADO'),

    // MensajeTexto
    contenido: varchar('contenido', { length: 2000 }),
    // MensajeImagen
    imagenUrl: text('imagen_url'),
    pieDeImagen: varchar('pie_de_imagen', { length: 300 }),

    fechaEnvio: timestamp('fecha_envio', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      'mensaje_subtipo_consistente',
      sql`(${t.tipo} = 'TEXTO' and ${t.contenido} is not null and ${t.imagenUrl} is null)
       or (${t.tipo} = 'IMAGEN' and ${t.imagenUrl} is not null and ${t.contenido} is null)`,
    ),
    // Paginacion del chat: mensajes de una conversacion, del mas nuevo al mas viejo.
    index('mensaje_conversacion_idx').on(t.conversacionId, t.fechaEnvio.desc()),
  ],
).enableRLS();
