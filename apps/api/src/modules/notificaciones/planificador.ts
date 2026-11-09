import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import {
  DESPACHO_HABILITADO,
  despacharPendientes,
  recuperarEnviosInterrumpidos,
} from './despacho.service.js';
import { notificarExpiracionesPendientes } from './disparadores.service.js';

/**
 * Proceso periodico del modulo de Notificaciones. Lo arranca `server.ts` (NO
 * `crearApp`, para que las pruebas con supertest no dejen un timer corriendo).
 *
 * Cada vuelta hace dos cosas, en orden:
 *
 *   1. `notificarExpiracionesPendientes` - escribe las filas de `notificacion`
 *      de los pedidos que expiraron dentro de PostgreSQL (US-NOT-01, origen
 *      SISTEMA), que la API no vio en el momento.
 *   2. `despacharPendientes` - manda por Expo todo lo que quedo en
 *      `push_estado = 'PENDIENTE'`, incluidas las filas del paso 1.
 *
 * Vive aca y no dentro de `despacho.service.ts` para no crear un ciclo de
 * imports: `disparadores` importa `emision`, que importa `despacho`. Este
 * archivo es hoja: nadie lo importa salvo `server.ts`.
 */

async function vuelta(): Promise<void> {
  try {
    await notificarExpiracionesPendientes();
  } catch (error) {
    logger.error(
      { err: error },
      'no se pudieron notificar las expiraciones de pedidos',
    );
  }
  await despacharPendientes();
}

export function iniciarPlanificadorDeNotificaciones(): () => void {
  if (!DESPACHO_HABILITADO) return () => undefined;

  void recuperarEnviosInterrumpidos()
    .then(() => vuelta())
    .catch((error: unknown) => {
      logger.error(
        { err: error },
        'no se pudo recuperar el estado del push al arrancar',
      );
    });

  const intervalo = setInterval(() => {
    void vuelta();
  }, env.NOTIFICACIONES_DESPACHO_INTERVALO_MS);
  intervalo.unref();

  return () => {
    clearInterval(intervalo);
  };
}
