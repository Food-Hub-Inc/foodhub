import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { MENSAJES_AUTH } from '@foodhub/shared';
import { crearApp } from '../../app.js';

/**
 * Control de acceso del modulo de Resenas.
 *
 * Verifica lo unico que se puede comprobar sin base ni Supabase: que ninguna
 * ruta atienda sin sesion. Mismo alcance y criterio que
 * `pedidos.router.test.ts`; las reglas de negocio de cada endpoint —los dos
 * plazos, el filtro de moderacion, la unicidad— se prueban en `reglas.test.ts`
 * y con usuarios reales contra foodhub-dev en la Etapa 6.
 *
 * La tabla importa especialmente en este modulo por
 * `/clientes/:id/reputacion`: la calificacion de un cliente "no es visible para
 * el cliente calificado ni para otros clientes" (RF081), asi que una ruta que
 * se cuele sin autenticacion filtraria la reputacion privada de cualquiera a
 * cualquiera.
 */
const app = crearApp();

interface RespuestaError {
  error: { codigo: string; mensaje: string };
}

const ID_CUALQUIERA = '3f6d1a3e-0e2a-4f5f-9f2b-2c1d5e6a7b8c';

const rutasProtegidas = [
  ['post', '/api/v1/resenas'],
  ['patch', `/api/v1/resenas/${ID_CUALQUIERA}`],
  ['get', '/api/v1/resenas/estado'],
  ['get', `/api/v1/resenas/cocineros/${ID_CUALQUIERA}`],
  ['get', `/api/v1/resenas/clientes/${ID_CUALQUIERA}/mi-calificacion`],
  ['get', `/api/v1/resenas/clientes/${ID_CUALQUIERA}/reputacion`],
  ['put', `/api/v1/resenas/clientes/${ID_CUALQUIERA}/calificacion`],
] as const;

describe('acceso al módulo de reseñas', () => {
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
      .get(`/api/v1/resenas/cocineros/${ID_CUALQUIERA}`)
      .set('Authorization', 'Bearer token-fabricado');

    expect(respuesta.status).toBe(401);
    expect((respuesta.body as RespuestaError).error.codigo).toBe(
      'TOKEN_INVALIDO',
    );
  });
});
