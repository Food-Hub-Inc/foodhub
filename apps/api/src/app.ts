import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
// Import nombrado y no por defecto: pino-http es CommonJS y, con la
// resolucion NodeNext, su `export default` no queda invocable desde ESM.
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import {
  manejadorErrores,
  rutaNoEncontrada,
} from './middleware/error.middleware.js';
import { saludRouter } from './modules/salud/salud.router.js';

/**
 * Construccion de la aplicacion Express.
 *
 * Se separa de `server.ts` a proposito: `crearApp()` devuelve la app sin
 * escuchar en ningun puerto, de modo que las pruebas de integracion la puedan
 * levantar con supertest sin ocupar un puerto real ni depender de que el
 * servidor este corriendo.
 *
 * EL ORDEN DE LOS MIDDLEWARES IMPORTA y sigue esta secuencia:
 *   seguridad -> CORS -> parseo -> logging -> limites -> rutas -> errores
 */
export function crearApp(): Express {
  const app = express();

  /**
   * Railway termina TLS en su proxy y reenvia la request por HTTP interno.
   * Sin `trust proxy`, Express ve la IP del proxy en lugar de la del cliente:
   * el rate limiting agruparia a TODOS los usuarios en un mismo contador y los
   * eventos de seguridad registrarian siempre la misma IP.
   * El valor 1 confia en un unico salto, el de Railway, y no en cualquier
   * X-Forwarded-For que llegue de afuera.
   */
  app.set('trust proxy', 1);
  app.disable('x-powered-by'); // no revelar el stack del servidor

  // --- 1. Encabezados de seguridad ------------------------------------------
  app.use(
    helmet({
      // La API solo devuelve JSON: no hay HTML que proteger con CSP, y una
      // politica activa rompe la interfaz de Swagger si se agrega mas adelante.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // --- 2. CORS ---------------------------------------------------------------
  // La lista blanca sale de CORS_ORIGINS. La app movil no envia `Origin`
  // (no es un navegador), por eso se admite el caso sin origen.
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || env.CORS_ORIGINS.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error(`Origen no permitido: ${origin}`));
      },
      credentials: true,
    }),
  );

  // --- 3. Parseo del cuerpo ---------------------------------------------------
  // Limite de 1 MB: la API nunca recibe archivos. Las imagenes se suben
  // directo del dispositivo a Supabase Storage mediante URL firmada
  // (punto 1.3.1.11), asi que el servidor no procesa binarios.
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // --- 4. Logging de requests -------------------------------------------------
  app.use(pinoHttp({ logger }));

  // --- 5. Rate limiting -------------------------------------------------------
  // Mitiga el abuso automatizado (modulo de seguridad, alcance 2.2.2.2.1).
  // Los chequeos de salud quedan exentos: Railway los consulta muy seguido y
  // no deben consumir el cupo de nadie.
  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      limit: env.RATE_LIMIT_MAX,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      skip: (req) => req.path.startsWith('/salud'),
      message: {
        error: {
          codigo: 'DEMASIADAS_SOLICITUDES',
          mensaje: 'Hiciste demasiadas solicitudes. Esperá un momento.',
        },
      },
    }),
  );

  // --- 6. Rutas ---------------------------------------------------------------
  app.use(saludRouter);

  // A medida que avance la Etapa 6 se montan aca los routers de cada modulo:
  //   app.use('/api/v1/auth', authRouter);
  //   app.use('/api/v1/publicaciones', publicacionesRouter);
  //   app.use('/api/v1/pedidos', pedidosRouter);
  //   ...

  // --- 7. Errores (siempre al final) -----------------------------------------
  app.use(rutaNoEncontrada);
  app.use(manejadorErrores);

  return app;
}
