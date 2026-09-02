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
import { tipoNotificacionEnum } from './enums.js';
import { usuario } from './usuarios.js';

/**
 * Modulo de notificaciones y alertas (alcance 2.2.2.2.2).
 */

/**
 * Estado del envio push de una notificacion. Es infraestructura INTERNA de la
 * API -no figura en el diagrama de clases, igual que `dispositivo_push`- y por
 * eso vive como `varchar` con un tipo de TypeScript y no como un ENUM de
 * PostgreSQL ni como literal de `@foodhub/shared`: ningun cliente lo ve.
 *
 *   PENDIENTE    fila escrita, push todavia no intentado (o el intento sincrono
 *                del handler fallo de forma transitoria). El poller la toma.
 *   ENVIADO      Expo acepto el mensaje para al menos un dispositivo.
 *   SIN_DESTINO  fila escrita pero el usuario no tiene ningun `dispositivo_push`
 *                activo al que enviar. Terminal, sin reintento.
 *   FALLIDO      habia dispositivos y Expo los rechazo de forma permanente.
 *                Terminal.
 */
export const PUSH_ESTADO_NOTIFICACION = [
  'PENDIENTE',
  'ENVIADO',
  'SIN_DESTINO',
  'FALLIDO',
] as const;
export type PushEstadoNotificacion = (typeof PUSH_ESTADO_NOTIFICACION)[number];

/**
 * Diagrama: Notificacion. Historial in-app de lo que se le notifico a cada
 * usuario. El envio push por Expo/FCM es un efecto adicional.
 *
 * REGLA DE ESCRITURA DE LA FILA (documento del modulo, revision 01/09/2026):
 * para los tipos CONFIGURABLES, si el usuario tiene la preferencia apagada NO
 * se escribe la fila NI se manda el push. Para los tipos ESENCIALES
 * (`AVISO_SISTEMA`, `PUBLICACION_ELIMINADA_ADMIN`) la fila se escribe siempre.
 * Esto corrige la regla anterior de "la fila se escribe siempre" que todavia
 * describe la skill `foodhub`.
 *
 * `objetoAfectadoId` es un identificador polimorfico (puede apuntar a un
 * pedido, una conversacion o una publicacion) y por eso no lleva FK: se
 * resuelve en la app segun `tipoNotificacion` para armar el deep link.
 */
export const notificacion = pgTable(
  'notificacion',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuarioDestinoId: uuid('usuario_destino_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'cascade' }),
    tipoNotificacion: tipoNotificacionEnum('tipo_notificacion').notNull(),
    titulo: varchar('titulo', { length: 120 }).notNull(),
    cuerpo: varchar('cuerpo', { length: 500 }).notNull(),
    objetoAfectadoId: uuid('objeto_afectado_id'),
    leida: boolean('leida').notNull().default(false),
    /**
     * Estado del envio push. Arranca en 'PENDIENTE': el emisor intenta el push
     * de forma sincrona y, si no puede, lo deja para el poller (que ademas
     * cubre las notificaciones que escribe la funcion SQL de expiracion de
     * pedidos, US-NOT-01, que no puede hablar con Expo).
     */
    pushEstado: varchar('push_estado', { length: 20 })
      .notNull()
      .default('PENDIENTE')
      .$type<PushEstadoNotificacion>(),
    fechaCreacion: timestamp('fecha_creacion', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('notificacion_usuario_idx').on(
      t.usuarioDestinoId,
      t.fechaCreacion.desc(),
    ),
    // Alimenta el contador de no leidas del icono de campana, que se consulta
    // en cada apertura de la app: conviene que sea un indice chico.
    index('notificacion_no_leidas_idx')
      .on(t.usuarioDestinoId)
      .where(sql`${t.leida} = false`),
    // El poller de push barre esta tabla cada ~30s buscando lo pendiente. El
    // indice parcial la mantiene diminuta: casi todas las filas pasan a
    // ENVIADO/SIN_DESTINO/FALLIDO en la primera corrida.
    index('notificacion_push_pendiente_idx')
      .on(t.fechaCreacion)
      .where(sql`${t.pushEstado} = 'PENDIENTE'`),
  ],
).enableRLS();

/**
 * Diagrama: PreferenciaNotificacion. Una fila por usuario y tipo de evento.
 *
 * `modificable = false` marca las notificaciones criticas que el usuario no
 * puede desactivar (por ejemplo, el rechazo de un pedido propio): la interfaz
 * las muestra deshabilitadas en lugar de ocultarlas, para que quede claro que
 * existen y por que no se apagan.
 */
export const preferenciaNotificacion = pgTable(
  'preferencia_notificacion',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'cascade' }),
    tipoNotificacion: tipoNotificacionEnum('tipo_notificacion').notNull(),
    activa: boolean('activa').notNull().default(true),
    modificable: boolean('modificable').notNull().default(true),
  },
  (t) => [
    uniqueIndex('preferencia_notificacion_uq').on(
      t.usuarioId,
      t.tipoNotificacion,
    ),
  ],
).enableRLS();

/**
 * Token de notificacion push del dispositivo (Expo Push Token).
 *
 * NO figura en el diagrama de clases porque es un detalle de infraestructura,
 * pero el analisis de factibilidad tecnica (punto 1.3.1.11) lo exige de forma
 * explicita: "deben persistirse en la base de datos asociados al usuario, con
 * mecanismos de actualizacion ante renovaciones de token o reinstalaciones".
 *
 * Un usuario puede tener varios dispositivos, de ahi la relacion 1:N.
 */
export const dispositivoPush = pgTable(
  'dispositivo_push',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'cascade' }),
    expoPushToken: text('expo_push_token').notNull().unique(),
    plataforma: varchar('plataforma', { length: 20 }).notNull(),
    dispositivoInfo: text('dispositivo_info'),
    activo: boolean('activo').notNull().default(true),
    fechaRegistro: timestamp('fecha_registro', { withTimezone: true })
      .notNull()
      .defaultNow(),
    fechaUltimoUso: timestamp('fecha_ultimo_uso', { withTimezone: true }),
  },
  (t) => [
    index('dispositivo_push_usuario_idx')
      .on(t.usuarioId)
      .where(sql`${t.activo} = true`),
  ],
).enableRLS();
