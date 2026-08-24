import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { MENSAJES_AUTH } from '@foodhub/shared';
import { crearApp } from '../../app.js';

/**
 * Control de acceso al modulo de Dashboard del cocinero.
 *
 * El dashboard expone la facturacion y la clientela de un cocinero, asi que la
 * puerta importa tanto como el calculo: ninguna de sus rutas puede responder sin
 * sesion, y el rol se verifica en `requiereRol('COCINERO')`, montado para el
 * router entero.
 *
 * El 403 de un CLIENTE no se prueba aca: exige un JWT que verifique contra el
 * JWKS de Supabase, y el entorno de test apunta a un puerto cerrado a proposito
 * (`vitest.config.ts`). Ese caso se verifica a mano contra foodhub-dev, mismo
 * alcance que el resto de los modulos.
 */

const app = crearApp();

interface RespuestaError {
  error: { codigo: string; mensaje: string };
}

describe('acceso al modulo de dashboard', () => {
  it('GET /api/v1/dashboard/actividad responde 401 SIN_TOKEN sin sesión', async () => {
    const respuesta = await request(app).get('/api/v1/dashboard/actividad');

    expect(respuesta.status).toBe(401);
    const cuerpo = respuesta.body as RespuestaError;
    expect(cuerpo.error.codigo).toBe('SIN_TOKEN');
    expect(cuerpo.error.mensaje).toBe(MENSAJES_AUTH.sesionRequerida);
  });

  it('rechaza un token que no verifica contra el JWKS', async () => {
    const respuesta = await request(app)
      .get('/api/v1/dashboard/actividad')
      .set('Authorization', 'Bearer token-fabricado');

    expect(respuesta.status).toBe(401);
    expect((respuesta.body as RespuestaError).error.codigo).toBe(
      'TOKEN_INVALIDO',
    );
  });
});
