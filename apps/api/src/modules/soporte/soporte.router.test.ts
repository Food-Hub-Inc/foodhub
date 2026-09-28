import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { MENSAJES_AUTH } from '@foodhub/shared';
import { crearApp } from '../../app.js';

const app = crearApp();

interface RespuestaError {
  error: {
    codigo: string;
    mensaje: string;
    campos?: { campo: string; mensaje: string }[];
  };
}

describe('acceso al módulo de soporte', () => {
  it('responde 401 SIN_TOKEN sin sesión en GET /faqs', async () => {
    const respuesta = await request(app).get('/api/v1/soporte/faqs');

    expect(respuesta.status).toBe(401);
    const cuerpo = respuesta.body as RespuestaError;
    expect(cuerpo.error.codigo).toBe('SIN_TOKEN');
    expect(cuerpo.error.mensaje).toBe(MENSAJES_AUTH.sesionRequerida);
  });

  it('rechaza un token que no verifica contra el JWKS en GET /faqs', async () => {
    const respuesta = await request(app)
      .get('/api/v1/soporte/faqs')
      .set('Authorization', 'Bearer token-fabricado');

    expect(respuesta.status).toBe(401);
    expect((respuesta.body as RespuestaError).error.codigo).toBe(
      'TOKEN_INVALIDO',
    );
  });

  it('responde 401 SIN_TOKEN sin sesión en POST /tickets', async () => {
    const respuesta = await request(app)
      .post('/api/v1/soporte/tickets')
      .send({ tipoConsultaId: '00000000-0000-0000-0000-000000000000' });

    expect(respuesta.status).toBe(401);
    const cuerpo = respuesta.body as RespuestaError;
    expect(cuerpo.error.codigo).toBe('SIN_TOKEN');
    expect(cuerpo.error.mensaje).toBe(MENSAJES_AUTH.sesionRequerida);
  });

  it('responde 401 SIN_TOKEN sin sesión en GET /manual', async () => {
    const respuesta = await request(app).get('/api/v1/soporte/manual');

    expect(respuesta.status).toBe(401);
    const cuerpo = respuesta.body as RespuestaError;
    expect(cuerpo.error.codigo).toBe('SIN_TOKEN');
    expect(cuerpo.error.mensaje).toBe(MENSAJES_AUTH.sesionRequerida);
  });

  /**
   * El rechazo por sesion ocurre ANTES de mirar el cuerpo. Si fuera al
   * reves, un anonimo podria sondear la forma de los errores de
   * validacion (mismo criterio que `almacenamiento.router.test.ts`).
   */
  it('rechaza por sesión antes que por un cuerpo inválido en POST /tickets', async () => {
    const respuesta = await request(app)
      .post('/api/v1/soporte/tickets')
      .send({ tipoConsultaId: 'no-es-un-uuid' });

    expect(respuesta.status).toBe(401);
    expect((respuesta.body as RespuestaError).error.codigo).toBe('SIN_TOKEN');
  });
});
