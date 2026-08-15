import { vi } from 'vitest';
import pino from 'pino';

/**
 * Preparacion comun a todas las pruebas.
 *
 * El logger real escribe una linea JSON por request directamente al descriptor
 * 1 con sonic-boom, sin pasar por `console`, asi que vitest no puede capturarlo
 * y la salida de la suite queda sepultada bajo los logs. Se reemplaza por una
 * instancia de pino silenciada: es pino de verdad, de modo que `pino-http` y
 * los `logger.error` de los servicios siguen encontrando la API completa.
 */
vi.mock('../lib/logger.js', () => ({ logger: pino({ level: 'silent' }) }));
