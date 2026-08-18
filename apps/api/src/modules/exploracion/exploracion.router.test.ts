import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { MENSAJES_AUTH } from '@foodhub/shared';
import { crearApp } from '../../app.js';

/**
 * Control de acceso del modulo de Exploracion y busqueda, y de su carrito.
 *
 * Verifica lo unico que se puede comprobar sin base ni Supabase: que NINGUNA
 * ruta de los dos routers atienda sin sesion. Mismo alcance y mismo criterio
 * que `publicaciones.router.test.ts`; el rol insuficiente (un cocinero pidiendo
 * el feed) y los datos en si se prueban con usuarios reales en la Etapa 6.
 *
 * La tabla incluye las DOS familias de rutas a proposito: `/exploracion` y
 * `/carrito` son routers separados, y montarlos por separado en `app.ts` abre la
 * posibilidad de que uno quede sin el middleware de autenticacion. Esta prueba
 * es lo que lo detectaria.
 */
const app = crearApp();

interface RespuestaError {
  error: { codigo: string; mensaje: string };
}

const ID_CUALQUIERA = '3f6d1a3e-0e2a-4f5f-9f2b-2c1d5e6a7b8c';

const rutasProtegidas = [
  ['get', '/api/v1/exploracion/feed'],
  ['get', '/api/v1/exploracion/cocineros/mapa'],
  ['get', `/api/v1/exploracion/cocineros/${ID_CUALQUIERA}`],
  ['get', `/api/v1/exploracion/publicaciones/${ID_CUALQUIERA}`],
  ['get', '/api/v1/exploracion/favoritos'],
  ['put', `/api/v1/exploracion/favoritos/cocineros/${ID_CUALQUIERA}`],
  ['delete', `/api/v1/exploracion/favoritos/cocineros/${ID_CUALQUIERA}`],
  ['put', `/api/v1/exploracion/favoritos/publicaciones/${ID_CUALQUIERA}`],
  ['delete', `/api/v1/exploracion/favoritos/publicaciones/${ID_CUALQUIERA}`],
  ['get', '/api/v1/carrito'],
  ['post', '/api/v1/carrito/items'],
  ['patch', `/api/v1/carrito/items/${ID_CUALQUIERA}`],
  ['delete', `/api/v1/carrito/items/${ID_CUALQUIERA}`],
  ['delete', '/api/v1/carrito'],
] as const;

describe('acceso al módulo de exploración y búsqueda', () => {
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
      .get('/api/v1/exploracion/feed')
      .set('Authorization', 'Bearer token-fabricado');

    expect(respuesta.status).toBe(401);
    expect((respuesta.body as RespuestaError).error.codigo).toBe(
      'TOKEN_INVALIDO',
    );
  });

  /**
   * `/cocineros/mapa` esta declarada ANTES de `/cocineros/:id` justamente para
   * que "mapa" no entre como valor del parametro. Si alguien invierte el orden,
   * la ruta del mapa dejaria de existir y el 401 seguiria llegando -el
   * middleware corre igual-, asi que la prueba de arriba no lo detectaria. Esta
   * si: sin sesion no se puede llegar al handler, pero el 404 de ruta
   * inexistente lo emite `rutaNoEncontrada`, que corre DESPUES de los routers.
   */
  it('tiene la ruta del mapa declarada antes de la del perfil', async () => {
    const respuesta = await request(app).get(
      '/api/v1/exploracion/cocineros/mapa',
    );

    expect(respuesta.status).not.toBe(404);
    expect((respuesta.body as RespuestaError).error.codigo).not.toBe(
      'RUTA_NO_ENCONTRADA',
    );
  });
});
