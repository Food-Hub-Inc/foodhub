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
import {
  estadoReporteEnum,
  estadoResenaEnum,
  tipoReaccionEnum,
} from './enums.js';
import { cocinero, usuario } from './usuarios.js';
import { publicacion } from './publicaciones.js';

/**
 * Modulo de resenas y calificaciones: el sistema de reputacion bidireccional
 * (alcance 2.2.2.2.2).
 *
 * DECISION DEL EQUIPO (2026-08-18): la resena es POR PLATO, no por pedido.
 *
 * El modelo anterior colgaba `resena` de `pedido` con `pedido_id` UNIQUE. Eso
 * hacia imposible calcular la valoracion de UNA publicacion -un pedido puede
 * incluir varios platos del mismo cocinero, asi que no habia forma de atribuir
 * la resena a uno de ellos-, y US-EXP-03 y US-EXP-05 exigen exactamente eso: un
 * filtro por valoracion minima y el promedio del plato en su detalle.
 *
 * La relacion con `pedido` desaparece de las dos tablas. El derecho a opinar se
 * verifica POR CONSULTA y no por clave foranea: la FK solo podia expresar "esta
 * resena nacio de este pedido", que ya no es el dato que importa.
 */

/**
 * Diagrama: Resena. Calificacion del CLIENTE hacia un PLATO del cocinero.
 *
 * Una resena por cliente y publicacion (ver el indice unico de mas abajo): si
 * el cliente vuelve a pedir el mismo plato, EDITA la que ya tiene en vez de
 * sumar una nueva. Sin esa restriccion podria inflar o hundir la reputacion de
 * un cocinero repitiendo la resena sobre el mismo plato.
 *
 * El derecho a resenar lo valida el servicio: tiene que existir un `item_pedido`
 * de esta publicacion en un pedido COMPLETADO de este cliente.
 */
export const resena = pgTable(
  'resena',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicacionId: uuid('publicacion_id')
      .notNull()
      .references(() => publicacion.id, { onDelete: 'cascade' }),
    clienteResId: uuid('cliente_res_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'cascade' }),

    /**
     * Desnormalizado respecto de `publicacion.cocinero_id`. Se conserva porque
     * el promedio del perfil publico (US-EXP-04, US-RES-03) se consulta por
     * cocinero en cada carga y resolverlo con un join a `publicacion` recorre
     * dos tablas para un dato que no cambia: una publicacion no se transfiere
     * de cocinero.
     */
    cocineroResId: uuid('cocinero_res_id')
      .notNull()
      .references(() => cocinero.usuarioId, { onDelete: 'cascade' }),

    calificacion: integer('calificacion').notNull(),
    comentario: varchar('comentario', { length: 1000 }),
    // Etiquetas rapidas del formulario ("puntual", "bien presentado").
    // `text[]` nativo de PostgreSQL: se filtra con el operador @> sin tabla puente.
    tags: text('tags').array(),
    fotoUrl: text('foto_url'),

    estadoResena: estadoResenaEnum('estado_resena')
      .notNull()
      .default('VISIBLE'),
    editada: boolean('editada').notNull().default(false),
    fechaPublicacion: timestamp('fecha_publicacion', { withTimezone: true })
      .notNull()
      .defaultNow(),
    fechaUltimaEdicion: timestamp('fecha_ultima_edicion', {
      withTimezone: true,
    }),
  },
  (t) => [
    check('resena_calificacion_rango', sql`${t.calificacion} between 1 and 5`),
    // Una resena por cliente y plato. Reemplaza al viejo `pedido_id` UNIQUE.
    uniqueIndex('resena_cliente_publicacion_uq').on(
      t.clienteResId,
      t.publicacionId,
    ),
    // Solo las visibles promedian en el perfil publico del cocinero.
    index('resena_cocinero_idx')
      .on(t.cocineroResId, t.fechaPublicacion.desc())
      .where(sql`${t.estadoResena} = 'VISIBLE'`),
    // Promedio POR PLATO: lo consultan el detalle de la publicacion (US-EXP-05)
    // y el filtro por valoracion minima del feed (US-EXP-03).
    index('resena_publicacion_idx')
      .on(t.publicacionId)
      .where(sql`${t.estadoResena} = 'VISIBLE'`),
    index('resena_cliente_idx').on(t.clienteResId),
  ],
).enableRLS();

/**
 * Diagrama: CalificacionCocinero. La otra direccion de la reputacion: el
 * cocinero califica al CLIENTE. Tabla separada de `resena` porque no admite
 * foto, ni respuesta, ni reacciones, y no es publica.
 *
 * Tampoco cuelga de `pedido` (decision del equipo, 2026-08-18): el cocinero
 * califica a la PERSONA y no a la transaccion, asi que hay una sola
 * calificacion por par cocinero-cliente y se edita si cambia de opinion. El
 * derecho a calificar lo valida el servicio: tiene que existir al menos un
 * `pedido` de ese cliente a ese cocinero que haya alcanzado el estado ACEPTADO.
 */
export const calificacionCocinero = pgTable(
  'calificacion_cocinero',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cocineroEvaluadorId: uuid('cocinero_evaluador_id')
      .notNull()
      .references(() => cocinero.usuarioId, { onDelete: 'cascade' }),
    clienteEvaluadoId: uuid('cliente_evaluado_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'cascade' }),
    calificacion: integer('calificacion').notNull(),
    comentario: varchar('comentario', { length: 1000 }),
    tags: text('tags').array(),
    fechaPublicacion: timestamp('fecha_publicacion', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      'calificacion_cocinero_rango',
      sql`${t.calificacion} between 1 and 5`,
    ),
    // Una calificacion por par cocinero-cliente. Reemplaza al `pedido_id` UNIQUE.
    uniqueIndex('calificacion_cocinero_uq').on(
      t.cocineroEvaluadorId,
      t.clienteEvaluadoId,
    ),
    index('calificacion_cliente_idx').on(t.clienteEvaluadoId),
  ],
).enableRLS();

/**
 * Diagrama: ReaccionResena. Likes y dislikes de la comunidad sobre una resena.
 * El indice unico permite una sola reaccion por usuario y resena; cambiar de
 * opinion es un UPDATE del campo `tipo`, no una fila nueva.
 */
export const reaccionResena = pgTable(
  'reaccion_resena',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    resenaId: uuid('resena_id')
      .notNull()
      .references(() => resena.id, { onDelete: 'cascade' }),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'cascade' }),
    tipo: tipoReaccionEnum('tipo').notNull(),
    fechaReaccion: timestamp('fecha_reaccion', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('reaccion_resena_uq').on(t.resenaId, t.usuarioId),
    index('reaccion_resena_resena_idx').on(t.resenaId),
  ],
).enableRLS();

/**
 * Diagrama: RespuestaCocinero. Derecho a replica del cocinero, una por resena.
 * `fechaEdicionLimite` congela la respuesta pasada una ventana de tiempo, para
 * que no se altere despues de que el cliente la leyo.
 */
export const respuestaCocinero = pgTable(
  'respuesta_cocinero',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    resenaId: uuid('resena_id')
      .notNull()
      .unique()
      .references(() => resena.id, { onDelete: 'cascade' }),
    cocineroId: uuid('cocinero_id')
      .notNull()
      .references(() => cocinero.usuarioId, { onDelete: 'cascade' }),
    contenido: varchar('contenido', { length: 1000 }).notNull(),
    editada: boolean('editada').notNull().default(false),
    fechaPublicacion: timestamp('fecha_publicacion', { withTimezone: true })
      .notNull()
      .defaultNow(),
    fechaEdicionLimite: timestamp('fecha_edicion_limite', {
      withTimezone: true,
    }),
  },
  (t) => [index('respuesta_cocinero_idx').on(t.cocineroId)],
).enableRLS();

/**
 * Diagrama: ReporteResena. Denuncia de una resena para moderacion del
 * administrador.
 */
export const reporteResena = pgTable(
  'reporte_resena',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    resenaId: uuid('resena_id')
      .notNull()
      .references(() => resena.id, { onDelete: 'cascade' }),
    usuarioReportanteId: uuid('usuario_reportante_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'cascade' }),
    // El diagrama lo marca como multi-valor: un reporte puede invocar varios
    // motivos a la vez (spam + lenguaje ofensivo).
    motivos: text('motivos').array().notNull(),
    detalleAdicional: varchar('detalle_adicional', { length: 500 }),
    estadoReporte: estadoReporteEnum('estado_reporte')
      .notNull()
      .default('PENDIENTE'),
    adminResolutorId: uuid('admin_resolutor_id').references(() => usuario.id, {
      onDelete: 'set null',
    }),
    fechaReporte: timestamp('fecha_reporte', { withTimezone: true })
      .notNull()
      .defaultNow(),
    fechaResolucion: timestamp('fecha_resolucion', { withTimezone: true }),
  },
  (t) => [
    // Un usuario no puede reportar dos veces la misma resena.
    uniqueIndex('reporte_resena_uq').on(t.resenaId, t.usuarioReportanteId),
    // Cola de moderacion: los pendientes primero, en orden de llegada.
    index('reporte_resena_pendientes_idx')
      .on(t.fechaReporte)
      .where(sql`${t.estadoReporte} = 'PENDIENTE'`),
  ],
).enableRLS();
