import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { MENSAJES_AUTH } from '@foodhub/shared';
import { crearApp } from '../../app.js';

/**
 * Control de acceso del modulo de catalogo.
 *
 * Lo unico que se puede verificar sin base ni Supabase: que el listado de
 * categorias no atienda sin sesion. La regla de negocio en si (solo las
 * activas, ordenadas por nombre) se prueba con datos reales en la Etapa 6.
 */
const app = crearApp();

interface RespuestaError {
  error: { codigo: string; mensaje: string };
}

describe('acceso al módulo de catálogo', () => {
  it('responde 401 SIN_TOKEN sin sesión', async () => {
    const respuesta = await request(app).get('/api/v1/catalogo/categorias');

    expect(respuesta.status).toBe(401);
    const cuerpo = respuesta.body as RespuestaError;
    expect(cuerpo.error.codigo).toBe('SIN_TOKEN');
    expect(cuerpo.error.mensaje).toBe(MENSAJES_AUTH.sesionRequerida);
  });

  it('rechaza un token que no verifica contra el JWKS', async () => {
    const respuesta = await request(app)
      .get('/api/v1/catalogo/categorias')
      .set('Authorization', 'Bearer token-fabricado');

    expect(respuesta.status).toBe(401);
    expect((respuesta.body as RespuestaError).error.codigo).toBe(
      'TOKEN_INVALIDO',
    );
  });
});
