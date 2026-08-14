import {
  index,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { operacionAuditoriaEnum } from './enums.js';
import { usuario } from './usuarios.js';

/**
 * Modulo de auditoria y trazabilidad (alcance 2.2.2.2.1).
 *
 * Reparto de responsabilidades entre las dos tablas del modulo:
 *
 *   registro_auditoria  -> operaciones de NEGOCIO sobre entidades del sistema
 *                          (altas, bajas y modificaciones).            US-AUD-02
 *   evento_seguridad    -> eventos de SEGURIDAD (login fallido, acceso
 *                          denegado). Definida en usuarios.ts.         US-AUD-01
 *
 * Mantenerlas separadas evita una tabla con la mitad de las columnas siempre
 * nulas y permite aplicar politicas de retencion distintas: los eventos de
 * seguridad se purgan antes que el historial de operaciones.
 */

/**
 * Diagrama: RegistroAuditoria. Registro append-only: nunca se actualiza ni se
 * borra desde la aplicacion. Si se pudiera editar, dejaria de ser evidencia.
 */
export const registroAuditoria = pgTable(
  'registro_auditoria',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // `set null` y no `cascade`: si se elimina la cuenta del usuario, el
    // registro de lo que hizo debe sobrevivir. Borrarse a uno mismo no puede
    // ser una forma de borrar el propio rastro.
    usuarioId: uuid('usuario_id').references(() => usuario.id, {
      onDelete: 'set null',
    }),

    operacion: operacionAuditoriaEnum('operacion').notNull(),
    // Nombre de la entidad afectada ('publicacion', 'pedido', 'usuario'...).
    tipoObjeto: varchar('tipo_objeto', { length: 60 }).notNull(),
    objetoAfectadoId: uuid('objeto_afectado_id'),
    ipOrigen: varchar('ip_origen', { length: 45 }),

    /**
     * `jsonb` y no texto plano: US-AUD-02 pide abrir un modal con "los datos
     * adicionales estructurados". Con jsonb el detalle se consulta y se filtra
     * por campo desde SQL, sin parsear en la aplicacion.
     */
    datosAdicionales: jsonb('datos_adicionales'),

    fechaHora: timestamp('fecha_hora', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // El panel ordena por fecha descendente por defecto (US-AUD-02).
    index('registro_auditoria_fecha_idx').on(t.fechaHora.desc()),
    // Filtros del panel: por usuario, por tipo de operacion y por objeto.
    index('registro_auditoria_usuario_idx').on(t.usuarioId, t.fechaHora.desc()),
    index('registro_auditoria_operacion_idx').on(
      t.operacion,
      t.fechaHora.desc(),
    ),
    index('registro_auditoria_objeto_idx').on(t.tipoObjeto, t.objetoAfectadoId),
  ],
).enableRLS();
