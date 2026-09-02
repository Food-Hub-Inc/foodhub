import { cerrarConexion } from '@foodhub/db';
import { crearApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { iniciarDespachadorDePush } from './modules/notificaciones/despacho.service.js';

/**
 * Punto de entrada del proceso: levanta el servidor HTTP y gestiona su ciclo
 * de vida.
 */

const app = crearApp();

const servidor = app.listen(env.PORT, () => {
  logger.info(
    { puerto: env.PORT, ambiente: env.APP_ENV },
    `API de FoodHub escuchando en http://localhost:${String(env.PORT)}`,
  );
});

/**
 * Despachador de notificaciones push (US-NOT-01 a US-NOT-06). Vive aca y no en
 * `crearApp` a proposito: es un proceso periodico, no un middleware, y las
 * pruebas de integracion levantan `crearApp` con supertest sin que un timer se
 * quede corriendo entre casos.
 */
const detenerDespachador = iniciarDespachadorDePush();

/**
 * Apagado ordenado.
 *
 * Al desplegar una version nueva, Railway envia SIGTERM y espera. Sin este
 * manejador el proceso muere de inmediato y las requests en curso se cortan a
 * la mitad, con transacciones abiertas. Aca se deja de aceptar conexiones
 * nuevas, se terminan las que estan en vuelo y recien despues se cierra el
 * pool de la base.
 */
function apagar(senal: NodeJS.Signals): void {
  logger.info({ senal }, 'apagando el servidor');

  detenerDespachador();

  servidor.close(() => {
    void cerrarConexion().then(() => {
      logger.info('servidor detenido correctamente');
      process.exit(0);
    });
  });

  // Red de seguridad: si a los 10 s alguna conexion sigue abierta, se corta.
  // Sin esto, una conexion colgada dejaria el despliegue trabado.
  setTimeout(() => {
    logger.error('apagado forzado: hubo conexiones que no cerraron a tiempo');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', apagar);
process.on('SIGINT', apagar);

// Un error no capturado deja el proceso en estado desconocido. Se registra y
// se sale con codigo distinto de cero para que Railway reinicie la instancia.
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'excepción no capturada');
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  logger.fatal({ err }, 'promesa rechazada sin manejar');
  process.exit(1);
});
