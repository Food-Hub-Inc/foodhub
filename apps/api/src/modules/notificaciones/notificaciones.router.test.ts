import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { MENSAJES_AUTH } from '@foodhub/shared';
import { crearApp } from '../../app.js';

/**
 * Control de acceso al modulo de Notificaciones y Alertas.
 *
 * El historial, el contador de la campana y los tokens push son datos privados
 * del usuario de la sesion: ninguna ruta responde sin sesion. El 403 de un
 * ADMINISTRADOR -que el router rechaza con `requiereRol('CLIENTE', 'COCINERO')`-
 * no se prueba aca por el mismo motivo que en Mensajeria: exige un JWT que
 * verifique contra el JWKS y el entorno de test apunta a un puerto cerrado.
 */

const app = crearApp();

interface RespuestaError {
  error: { codigo: string; mensaje: string };
}

const RUTAS = [
  ['get', '/api/v1/notificaciones'],
  ['get', '/api/v1/notificaciones/no-leidas'],
  ['post', '/api/v1/notificaciones/marcar-leidas'],
  ['post', '/api/v1/notificaciones/dispositivos'],
  ['delete', '/api/v1/notificaciones/dispositivos'],
  ['put', '/api/v1/notificaciones/presencia'],
] as const;

describe('acceso al modulo de notificaciones', () => {
  it.each(RUTAS)(
    '%s %s responde 401 SIN_TOKEN sin sesión',
    async (metodo, ruta) => {
      const respuesta = await request(app)[metodo](ruta);

      expect(respuesta.status).toBe(401);
      const cuerpo = respuesta.body as RespuestaError;
      expect(cuerpo.error.codigo).toBe('SIN_TOKEN');
      expect(cuerpo.error.mensaje).toBe(MENSAJES_AUTH.sesionRequerida);
    },
  );

  it('rechaza un token que no verifica contra el JWKS', async () => {
    const respuesta = await request(app)
      .get('/api/v1/notificaciones')
      .set('Authorization', 'Bearer token-fabricado');

    expect(respuesta.status).toBe(401);
    expect((respuesta.body as RespuestaError).error.codigo).toBe(
      'TOKEN_INVALIDO',
    );
  });
});
