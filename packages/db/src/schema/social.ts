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
  tipoResenaEnum,
} from './enums.js';
import { cocinero, usuario } from './usuarios.js';
import { publicacion } from './publicaciones.js';

/**
 * Modulo de resenas y calificaciones: el sistema de reputacion bidireccional
 * (alcance 2.2.2.2.2).
 *
 * UNA RESENA SE IDENTIFICA POR (AUTOR, OBJETO RESENADO). El objeto es un
 * PLATO, un COCINERO o un CLIENTE, y hay una sola resena por autor y objeto:
 * si se vuelve a opinar, se EDITA la que ya existe. Sin esa restriccion
 * cualquiera podria inflar o hundir una reputacion repitiendo la resena.
 *
 * EL PEDIDO NO PARTICIPA DE ESA IDENTIDAD y no aparece en ninguna tabla del
 * modulo: solo responde "tiene derecho a resenar?" en el momento del alta, y
 * eso se verifica POR CONSULTA contra `historial_estado_pedido`. Una FK solo
 * podria expresar "esta resena nacio de este pedido", que no es el dato que
 * importa -y cuando se uso como clave de negocio produjo el defecto que esta
 * correccion revierte: la calificacion al cocinero quedaba una por PEDIDO en
 * vez de una por cocinero-.
 *
 * LOS TRES TIPOS VIVEN EN UNA TABLA CON DISCRIMINADOR, igual que `mensaje`
 * (ver `mensajeria.ts`) y al reves que `favorito`. El motivo es que los tres
 * agregados sociales -reaccion, respuesta y reporte- cuelgan de `resena_id` y
 * asi sirven a los tres tipos sin una linea extra, incluida la bandeja de
 * moderacion de PAN-ADM-02. Con una tabla por tipo, cada indice unico habria
 * necesitado su version parcial -en PostgreSQL los NULL no chocan entre si,
 * asi que un indice unico sobre una FK anulable deja de proteger SIN DAR
 * ERROR- y la cola de moderacion habria pasado a ser un UNION ALL reagrupado.
 */

/**
 * Diagrama: Resena. Una opinion de un usuario sobre un plato, un cocinero o un
 * cliente. `tipo_resena` discrimina cual de los tres, y de el depende que
 * columna de destino esta poblada (CHECK `resena_destino_segun_tipo`).
 *
 * | tipo     | destino              | autor    | quien la ve                  |
 * | -------- | -------------------- | -------- | ---------------------------- |
 * | PLATO    | `publicacion_id`     | cliente  | cualquiera (US-RES-01/03)    |
 * | COCINERO | `cocinero_res_id`    | cliente  | cualquiera (RF087/US-RES-07) |
 * | CLIENTE  | `cliente_destino_id` | cocinero | solo cocineros (US-RES-02)   |
 *
 * LA PRIVACIDAD DE LAS DE TIPO CLIENTE YA NO LA DA EL MODELO. Antes vivian en
 * una tabla aparte; ahora depende de que cada endpoint filtre por tipo segun
 * el rol de quien consulta. Hay una prueba de router dedicada a eso.
 *
 * LAS DE TIPO CLIENTE TAMPOCO LLEVAN REACCIONES, RESPUESTA NI REPORTE, y no es
 * un olvido: el cliente no las ve, asi que no hay conversacion publica sobre
 * ellas. La paridad social es entre PLATO y COCINERO.
 */
export const resena = pgTable(
  'resena',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    tipoResena: tipoResenaEnum('tipo_resena').notNull(),

    /** Quien opina. No siempre es un cliente: en las de tipo CLIENTE es el cocinero. */
    autorId: uuid('autor_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'cascade' }),

    /** Destino cuando `tipo_resena = 'PLATO'`. */
    publicacionId: uuid('publicacion_id').references(() => publicacion.id, {
      onDelete: 'cascade',
    }),

    /**
     * Cumple dos papeles segun el tipo, y por eso no se llama `cocineroDestinoId`:
     * es el DESTINO cuando el tipo es COCINERO, y el dueno del plato
     * -desnormalizado respecto de `publicacion.cocinero_id`- cuando es PLATO.
     *
     * La desnormalizacion se conserva porque "Mis resenas" del cocinero
     * (PAN-RES-02) lista las resenas de todos sus platos en cada carga, y
     * resolverlo con un join a `publicacion` recorre dos tablas para un dato
     * que no cambia: una publicacion no se transfiere de cocinero.
     */
    cocineroResId: uuid('cocinero_res_id').references(
      () => cocinero.usuarioId,
      { onDelete: 'cascade' },
    ),

    /** Destino cuando `tipo_resena = 'CLIENTE'`. */
    clienteDestinoId: uuid('cliente_destino_id').references(() => usuario.id, {
      onDelete: 'cascade',
    }),

    calificacion: integer('calificacion').notNull(),
    /**
     * El tope real lo pone zod y depende del tipo (500 en PLATO y COCINERO,
     * 300 en CLIENTE). La columna queda holgada a proposito: cambiar un limite
     * de formulario no deberia costar una migracion.
     */
    comentario: varchar('comentario', { length: 1000 }),
    // Etiquetas rapidas del formulario ("puntual", "bien presentado"). Cada
    // tipo valida contra su propio set en `packages/shared`.
    // `text[]` nativo de PostgreSQL: se filtra con el operador @> sin tabla puente.
    tags: text('tags').array(),
    /** Solo el formulario de PLATO la ofrece (RF080). */
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

    /**
     * Exactamente el destino de su tipo poblado, y ningun otro. Es lo que
     * sostiene el discriminador: sin esto una fila podria apuntar a un plato y
     * a un cliente a la vez, o a ninguno de los tres.
     */
    check(
      'resena_destino_segun_tipo',
      sql`case ${t.tipoResena}
        when 'PLATO' then ${t.publicacionId} is not null and ${t.cocineroResId} is not null and ${t.clienteDestinoId} is null
        when 'COCINERO' then ${t.publicacionId} is null and ${t.cocineroResId} is not null and ${t.clienteDestinoId} is null
        when 'CLIENTE' then ${t.publicacionId} is null and ${t.cocineroResId} is null and ${t.clienteDestinoId} is not null
      end`,
    ),

    // Una resena por autor y objeto resenado, un indice por tipo. Son parciales
    // porque la columna de destino es NULL en los otros dos tipos y en
    // PostgreSQL los NULL no chocan entre si: un unico indice sobre las tres
    // columnas no restringiria nada.
    uniqueIndex('resena_plato_uq')
      .on(t.autorId, t.publicacionId)
      .where(sql`${t.tipoResena} = 'PLATO'`),
    uniqueIndex('resena_cocinero_uq')
      .on(t.autorId, t.cocineroResId)
      .where(sql`${t.tipoResena} = 'COCINERO'`),
    uniqueIndex('resena_cliente_uq')
      .on(t.autorId, t.clienteDestinoId)
      .where(sql`${t.tipoResena} = 'CLIENTE'`),

    // Reputacion del cocinero (RF082): alimenta el promedio del perfil publico
    // y, desde esta correccion, tambien el del feed y el mapa.
    index('resena_opiniones_cocinero_idx')
      .on(t.cocineroResId, t.fechaPublicacion.desc())
      .where(
        sql`${t.estadoResena} = 'VISIBLE' and ${t.tipoResena} = 'COCINERO'`,
      ),
    // "Mis resenas" del cocinero: las de todos sus platos, para responderlas.
    index('resena_platos_del_cocinero_idx')
      .on(t.cocineroResId, t.fechaPublicacion.desc())
      .where(sql`${t.estadoResena} = 'VISIBLE' and ${t.tipoResena} = 'PLATO'`),
    // Promedio POR PLATO: lo consultan el detalle de la publicacion (US-EXP-05)
    // y el filtro por valoracion minima del feed (US-EXP-03).
    index('resena_publicacion_idx')
      .on(t.publicacionId)
      .where(sql`${t.estadoResena} = 'VISIBLE' and ${t.tipoResena} = 'PLATO'`),
    // Reputacion del cliente (US-RES-02), que el cocinero ve en su perfil.
    index('resena_cliente_destino_idx')
      .on(t.clienteDestinoId, t.fechaPublicacion.desc())
      .where(
        sql`${t.estadoResena} = 'VISIBLE' and ${t.tipoResena} = 'CLIENTE'`,
      ),
    index('resena_autor_idx').on(t.autorId),
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
