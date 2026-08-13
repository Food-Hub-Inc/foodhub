/**
 * Schema completo de FoodHub.
 *
 * Traduccion a modelo relacional del diagrama de clases
 * "FoodHub - DG12082026_V4.drawio" (45 clases).
 *
 * Los archivos se agrupan por modulo del alcance definitivo (punto 2.2.2.2 del
 * documento de proyecto), no por tipo de artefacto, para que un cambio de
 * requerimiento se localice en un unico archivo:
 *
 *   enums.ts           tipos ENUM de PostgreSQL
 *   catalogo.ts        entidades de referencia y parametrizacion (ABM del admin)
 *   usuarios.ts        usuarios, terminos y eventos de seguridad
 *   publicaciones.ts   platos, favoritos y carrito
 *   pedidos.ts         pedidos, items e historial de estados
 *   social.ts          resenas, calificaciones, respuestas y reportes
 *   mensajeria.ts      conversaciones y mensajes
 *   notificaciones.ts  notificaciones, preferencias y tokens push
 *   soporte.ts         ayuda, FAQ y tickets
 *   auditoria.ts       registro de operaciones de negocio
 *
 * drizzle.config.ts apunta a este archivo, asi que una tabla que no se exporte
 * aca no se incluye en las migraciones.
 */

export * from './enums.js';
export * from './catalogo.js';
export * from './usuarios.js';
export * from './publicaciones.js';
export * from './pedidos.js';
export * from './social.js';
export * from './mensajeria.js';
export * from './notificaciones.js';
export * from './soporte.js';
export * from './auditoria.js';
