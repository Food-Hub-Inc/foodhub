import pino from 'pino';
import { env, esProduccion } from '../config/env.js';

/**
 * Logger estructurado del servidor.
 *
 * En produccion escribe JSON por linea, que es lo que Railway indexa y permite
 * filtrar. En desarrollo usa pino-pretty para que sea legible en la consola.
 *
 * `redact` es la parte importante: nunca deben quedar credenciales ni tokens en
 * los logs del proveedor. Los logs se conservan mas tiempo que las sesiones y
 * suelen ser accesibles a mas gente que la base de datos.
 */
/**
 * En desarrollo se enruta la salida por pino-pretty. La opcion se arma aparte
 * y se esparce condicionalmente: con `exactOptionalPropertyTypes` activado,
 * pasar `transport: undefined` no es lo mismo que omitir la propiedad, y el
 * tipo de pino no admite el undefined explicito.
 */
const transporteDesarrollo = {
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
    },
  },
};

export const logger = pino({
  level: esProduccion ? 'info' : 'debug',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.confirmPassword',
      'res.headers["set-cookie"]',
      '*.SUPABASE_SERVICE_ROLE_KEY',
      '*.DATABASE_URL',
    ],
    censor: '[REDACTADO]',
  },
  base: { env: env.APP_ENV },
  ...(esProduccion ? {} : transporteDesarrollo),
});
