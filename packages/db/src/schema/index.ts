/**
 * Schema completo de FoodHub.
 *
 * Traduccion a modelo relacional del diagrama de clases
 * "FoodHub - DG12082026_V5.drawio" (43 clases).
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
 *
 *
 * POR QUE TODAS LAS TABLAS LLEVAN .enableRLS() Y NINGUNA POLITICA
 * ---------------------------------------------------------------------------
 * La clave publica de Supabase viaja embebida en el APK y en el bundle del
 * panel: cualquiera que descargue la aplicacion la puede leer. Con RLS
 * deshabilitado, esa clave da acceso de lectura y escritura a toda la base a
 * traves de la API REST que Supabase expone sola en /rest/v1.
 *
 * Habilitar RLS sin declarar politicas deniega por defecto: los roles `anon` y
 * `authenticated` (los unicos que alcanza esa clave) pierden todo acceso
 * directo a `public`. Deja de haber puerta trasera.
 *
 * No rompe nada del backend porque ni la API ni las migraciones entran por ahi:
 * ambas se conectan con DATABASE_URL como rol `postgres`, y tanto `postgres`
 * como `service_role` tienen el atributo BYPASSRLS, de modo que las politicas
 * no se les evaluan. Es coherente con la arquitectura del CLAUDE.md: mobile y
 * admin usan Supabase solo para autenticacion, y todo dato de negocio pasa por
 * la API, que valida el JWT y aplica las reglas del dominio.
 *
 * Si en algun momento una pantalla necesita consultar una tabla directo con
 * supabase-js (por ejemplo para Realtime en el chat), hay que escribir la
 * politica de esa tabla ANTES, no volver a apagar RLS.
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
