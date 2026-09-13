import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { MENSAJES_AUTH } from '@foodhub/shared';
import { crearApp } from '../../app.js';

/**
 * Control de acceso del modulo de gestion de ayuda (US-AYU-05).
 *
 * Verifica lo unico comprobable sin base ni Supabase: que NINGUNA ruta del
 * modulo atienda sin sesion. El rechazo por rol insuficiente (un cliente o
 * cocinero autenticado) exige un usuario real y se prueba en la Etapa 6 contra
 * el ambiente `foodhub-dev`.
 */
const app = crearApp();

interface RespuestaError {
  error: { codigo: string; mensaje: string };
}

const ID_CUALQUIERA = '3f6d1a3e-0e2a-4f5f-9f2b-2c1d5e6a7b8c';

const rutasProtegidas = [
  ['get', '/api/v1/ayuda/capitulos'],
  ['get', `/api/v1/ayuda/capitulos/${ID_CUALQUIERA}`],
  ['post', '/api/v1/ayuda/capitulos'],
  ['patch', `/api/v1/ayuda/capitulos/${ID_CUALQUIERA}`],
  ['post', `/api/v1/ayuda/capitulos/${ID_CUALQUIERA}/habilitacion`],
  ['delete', `/api/v1/ayuda/capitulos/${ID_CUALQUIERA}/habilitacion`],
  ['get', '/api/v1/ayuda/faqs'],
  ['post', '/api/v1/ayuda/faqs'],
  ['patch', `/api/v1/ayuda/faqs/${ID_CUALQUIERA}`],
  ['post', `/api/v1/ayuda/faqs/${ID_CUALQUIERA}/habilitacion`],
  ['delete', `/api/v1/ayuda/faqs/${ID_CUALQUIERA}/habilitacion`],
] as const;

describe('acceso al módulo de gestión de ayuda', () => {
  it.each(rutasProtegidas)(
    '%s %s responde 401 SIN_TOKEN sin sesión',
    async (metodo, ruta) => {
      const respuesta = await request(app)[metodo](ruta).send({});

      expect(respuesta.status).toBe(401);
      const cuerpo = respuesta.body as RespuestaError;
      expect(cuerpo.error.codigo).toBe('SIN_TOKEN');
      expect(cuerpo.error.mensaje).toBe(MENSAJES_AUTH.sesionRequerida);
    },
  );

  it('rechaza un token que no verifica contra el JWKS', async () => {
    const respuesta = await request(app)
      .get('/api/v1/ayuda/capitulos')
      .set('Authorization', 'Bearer token-fabricado');

    expect(respuesta.status).toBe(401);
    expect((respuesta.body as RespuestaError).error.codigo).toBe(
      'TOKEN_INVALIDO',
    );
  });
});
