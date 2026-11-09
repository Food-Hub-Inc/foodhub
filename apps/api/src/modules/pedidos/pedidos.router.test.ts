import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { MENSAJES_AUTH } from '@foodhub/shared';
import { crearApp } from '../../app.js';

/**
 * Control de acceso del modulo de Pedidos.
 *
 * Verifica lo unico que se puede comprobar sin base ni Supabase: que ninguna
 * ruta atienda sin sesion. Mismo alcance y mismo criterio que
 * `exploracion.router.test.ts`; el rol insuficiente (un cliente aceptando un
 * pedido) y el comportamiento de cada transicion se prueban con usuarios reales
 * contra foodhub-dev en la Etapa 6.
 *
 * La tabla vale doble en este modulo: el pedido es el unico recurso que dos
 * roles distintos leen y escriben, y una ruta que se cuele sin
 * `requiereAutenticacion` expondria el historial de compras de cualquiera.
 */
const app = crearApp();

interface RespuestaError {
  error: { codigo: string; mensaje: string };
}

const ID_CUALQUIERA = '3f6d1a3e-0e2a-4f5f-9f2b-2c1d5e6a7b8c';

const rutasProtegidas = [
  ['post', '/api/v1/pedidos'],
  ['get', '/api/v1/pedidos'],
  ['get', '/api/v1/pedidos/recibidos'],
  ['get', `/api/v1/pedidos/${ID_CUALQUIERA}`],
  ['post', `/api/v1/pedidos/${ID_CUALQUIERA}/aceptar`],
  ['post', `/api/v1/pedidos/${ID_CUALQUIERA}/rechazar`],
  ['post', `/api/v1/pedidos/${ID_CUALQUIERA}/listo`],
  ['post', `/api/v1/pedidos/${ID_CUALQUIERA}/completar`],
  ['post', `/api/v1/pedidos/${ID_CUALQUIERA}/cancelar`],
] as const;

describe('acceso al módulo de pedidos', () => {
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
      .get('/api/v1/pedidos')
      .set('Authorization', 'Bearer token-fabricado');

    expect(respuesta.status).toBe(401);
    expect((respuesta.body as RespuestaError).error.codigo).toBe(
      'TOKEN_INVALIDO',
    );
  });

  /**
   * NO SE PUEDE PROBAR ACA EL ORDEN DE `/recibidos` ANTES DE `/:id`.
   *
   * `pedidosRouter.use(requiereAutenticacion)` corre para cualquier ruta del
   * prefijo, incluso una inexistente, asi que sin sesion TODO responde 401 y el
   * 404 de `rutaNoEncontrada` nunca llega. El orden de esas dos declaraciones se
   * verifica con un token real en la Etapa 6, junto con el resto del modulo.
   */
});
