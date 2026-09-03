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
import { pedido } from './pedidos.js';
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
 * Diagrama: CalificacionACliente. Una de las dos direcciones de la reputacion:
 * el COCINERO califica al CLIENTE (RF081, US-RES-02). Tabla separada de
 * `resena` porque no admite foto, ni respuesta, ni reacciones, y no es publica.
 *
 * SE LLAMABA `calificacion_cocinero` HASTA LA MIGRACION 0014. El nombre viejo
 * era ambiguo -no decia si el cocinero era el autor o el evaluado- y quedo
 * directamente ocupado cuando la version corregida del modulo agrego la
 * direccion contraria (RF087). Ahora las dos tablas se nombran por el evaluado:
 * `calificacion_a_cliente` y `calificacion_a_cocinero`.
 *
 * No cuelga de `pedido` (decision del equipo, 2026-08-18): el cocinero califica
 * a la PERSONA y no a la transaccion, asi que hay una sola calificacion por par
 * cocinero-cliente y se edita si cambia de opinion. El derecho a calificar lo
 * valida el servicio: tiene que existir al menos un `pedido` de ese cliente a
 * ese cocinero que haya alcanzado el estado ACEPTADO.
 */
export const calificacionACliente = pgTable(
  'calificacion_a_cliente',
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
      'calificacion_a_cliente_rango',
      sql`${t.calificacion} between 1 and 5`,
    ),
    // Una calificacion vigente por par cocinero-cliente.
    uniqueIndex('calificacion_a_cliente_uq').on(
      t.cocineroEvaluadorId,
      t.clienteEvaluadoId,
    ),
    index('calificacion_a_cliente_idx').on(t.clienteEvaluadoId),
  ],
).enableRLS();

/**
 * Diagrama: CalificacionACocinero. La otra direccion: el CLIENTE califica al
 * COCINERO (RF087, US-RES-07).
 *
 * ES OTRA COSA QUE LA RESENA DEL PLATO, y por eso es otra tabla. La resena
 * valora el PRODUCTO y se ancla en la publicacion; esto valora el SERVICIO
 * -puntualidad, comunicacion, atencion- y se ancla en el pedido. Son metricas
 * independientes que pueden diferir: un cocinero puede cocinar excelente y
 * atender pesimo.
 *
 * ESTA ES LA QUE CONSTRUYE LA REPUTACION DEL COCINERO (RF082). El promedio del
 * perfil publico sale de aca y NO de las resenas de los platos.
 *
 * UNA POR PEDIDO, NO POR PAR CLIENTE-COCINERO. Es la diferencia con
 * `calificacion_a_cliente` y con `resena`, y es deliberada: un pedido de seis
 * platos deja una sola calificacion de servicio, igual que uno de un plato, asi
 * que un pedido grande no pesa mas sobre la reputacion. Y cada pedido nuevo
 * habilita una calificacion nueva, porque cada uno es una experiencia distinta.
 */
export const calificacionACocinero = pgTable(
  'calificacion_a_cocinero',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /**
     * A DIFERENCIA DE `resena`, ESTA SI REFERENCIA AL PEDIDO. La unicidad es
     * por pedido, asi que la FK no es un dato de contexto: es la clave de
     * negocio, y una restriccion UNIQUE necesita la columna en la tabla.
     */
    pedidoId: uuid('pedido_id')
      .notNull()
      .references(() => pedido.id, { onDelete: 'cascade' }),

    clienteId: uuid('cliente_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'cascade' }),

    /** Desnormalizado igual que `resena.cocinero_res_id`, y por lo mismo: el
     * promedio del perfil publico se consulta por cocinero en cada carga. */
    cocineroId: uuid('cocinero_id')
      .notNull()
      .references(() => cocinero.usuarioId, { onDelete: 'cascade' }),

    calificacion: integer('calificacion').notNull(),
    comentario: varchar('comentario', { length: 1000 }),
    tags: text('tags').array(),

    /**
     * Misma maquinaria de moderacion que `resena`: RF082 excluye del promedio
     * del cocinero las calificaciones OCULTA_MODERACION y ELIMINADA_AUTOR.
     */
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
    check(
      'calificacion_a_cocinero_rango',
      sql`${t.calificacion} between 1 and 5`,
    ),
    // Una calificacion por pedido, sin importar cuantos platos lo integren.
    uniqueIndex('calificacion_a_cocinero_pedido_uq').on(t.pedidoId),
    // Promedio del perfil publico: solo las visibles cuentan.
    index('calificacion_a_cocinero_cocinero_idx')
      .on(t.cocineroId, t.fechaPublicacion.desc())
      .where(sql`${t.estadoResena} = 'VISIBLE'`),
    index('calificacion_a_cocinero_cliente_idx').on(t.clienteId),
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
