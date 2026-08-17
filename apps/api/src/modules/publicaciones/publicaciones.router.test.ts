import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { MENSAJES_AUTH } from '@foodhub/shared';
import { crearApp } from '../../app.js';

/**
 * Control de acceso del modulo de publicaciones.
 *
 * Verifica lo unico que se puede comprobar sin base ni Supabase: que NINGUNA
 * ruta del modulo atienda sin sesion. Rol insuficiente (un cliente pidiendo
 * "Mis publicaciones") y los datos en si se prueban con usuarios reales en la
 * Etapa 6.
 *
 * La tabla se extiende historia a historia: US-PUB-05 solo agrega el listado
 * y el detalle, y las siguientes suman alta, edicion, disponibilidad y baja.
 */
const app = crearApp();

interface RespuestaError {
  error: { codigo: string; mensaje: string };
}

const ID_CUALQUIERA = '3f6d1a3e-0e2a-4f5f-9f2b-2c1d5e6a7b8c';

const rutasProtegidas = [
  ['get', '/api/v1/publicaciones'],
  ['get', `/api/v1/publicaciones/${ID_CUALQUIERA}`],
  ['post', '/api/v1/publicaciones'],
  ['patch', `/api/v1/publicaciones/${ID_CUALQUIERA}/disponibilidad`],
  ['patch', `/api/v1/publicaciones/${ID_CUALQUIERA}`],
] as const;

describe('acceso al módulo de publicaciones', () => {
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
      .get('/api/v1/publicaciones')
      .set('Authorization', 'Bearer token-fabricado');

    expect(respuesta.status).toBe(401);
    expect((respuesta.body as RespuestaError).error.codigo).toBe(
      'TOKEN_INVALIDO',
    );
  });
});
