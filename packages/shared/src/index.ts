/**
 * @foodhub/shared
 *
 * Punto de entrada unico del paquete compartido. Las tres aplicaciones
 * importan desde `@foodhub/shared` y nunca desde rutas internas, de modo que
 * la organizacion interna de carpetas pueda cambiar sin romper a los consumidores.
 */

export * from './constants/enums.js';
export * from './schemas/auth.schema.js';
export * from './schemas/pedido.schema.js';
