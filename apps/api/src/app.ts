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
import { almacenamientoRouter } from './modules/almacenamiento/almacenamiento.router.js';
import { authRouter } from './modules/auth/auth.router.js';
import { auditoriaRouter } from './modules/auditoria/auditoria.router.js';
import { catalogoRouter } from './modules/catalogo/catalogo.router.js';
import { carritoRouter } from './modules/exploracion/carrito.router.js';
import { exploracionRouter } from './modules/exploracion/exploracion.router.js';
import { publicacionesRouter } from './modules/publicaciones/publicaciones.router.js';
import { seguridadRouter } from './modules/seguridad/seguridad.router.js';
import { usuariosRouter } from './modules/usuarios/usuarios.router.js';

/**
 * Prefijo de todas las rutas de negocio. Versionar desde el principio permite
 * publicar una v2 sin romper las apps ya instaladas en los telefonos, que no se
 * actualizan al mismo tiempo que el servidor.
 */
const PREFIJO_API = '/api/v1';

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

  // Modulos transversales (Etapa 6): autenticacion, usuarios y auditoria.
  app.use(`${PREFIJO_API}/auth`, authRouter);
  app.use(`${PREFIJO_API}/usuarios`, usuariosRouter);
  app.use(`${PREFIJO_API}/auditoria`, auditoriaRouter);
  app.use(`${PREFIJO_API}/seguridad`, seguridadRouter);
  app.use(`${PREFIJO_API}/almacenamiento`, almacenamientoRouter);
  app.use(`${PREFIJO_API}/catalogo`, catalogoRouter);
  app.use(`${PREFIJO_API}/publicaciones`, publicacionesRouter);

  // Modulos funcionales: exploracion y busqueda (US-EXP-01 a US-EXP-07).
  // El carrito va en su propio prefijo y no bajo /exploracion: es un recurso
  // del cliente, no un resultado de explorar, y su pantalla (PAN-PED-01)
  // pertenece al modulo de Pedidos, que va a leer de estas mismas rutas.
  app.use(`${PREFIJO_API}/exploracion`, exploracionRouter);
  app.use(`${PREFIJO_API}/carrito`, carritoRouter);

  // A medida que avance la Etapa 6 se montan aca los routers de cada modulo:
  //   app.use(`${PREFIJO_API}/pedidos`, pedidosRouter);
  //   ...

  // --- 7. Errores (siempre al final) -----------------------------------------
  app.use(rutaNoEncontrada);
  app.use(manejadorErrores);

  return app;
}
