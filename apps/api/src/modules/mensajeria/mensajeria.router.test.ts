import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { MENSAJES_AUTH } from '@foodhub/shared';
import { crearApp } from '../../app.js';

/**
 * Control de acceso al modulo de Mensajeria directa.
 *
 * El chat es contenido privado entre dos personas: la puerta importa tanto como
 * lo que hay adentro. Ninguna ruta del modulo puede responder sin sesion, ni
 * siquiera las de solo lectura.
 *
 * El 403 de un ADMINISTRADOR -que el router rechaza con
 * `requiereRol('CLIENTE', 'COCINERO')`- no se prueba aca: exige un JWT que
 * verifique contra el JWKS de Supabase, y el entorno de test apunta a un puerto
 * cerrado a proposito (`vitest.config.ts`). Ese caso se verifica a mano contra
 * foodhub-dev, mismo alcance que el resto de los modulos.
 */

const app = crearApp();

interface RespuestaError {
  error: { codigo: string; mensaje: string };
}

const CONVERSACION = '22222222-2222-4222-8222-222222222222';

/** Las rutas del modulo, con el metodo con el que se acceden. */
const RUTAS = [
  ['get', '/api/v1/mensajeria/conversaciones'],
  ['get', `/api/v1/mensajeria/conversaciones/con/${CONVERSACION}`],
  ['get', `/api/v1/mensajeria/conversaciones/${CONVERSACION}`],
  ['get', `/api/v1/mensajeria/conversaciones/${CONVERSACION}/mensajes`],
  ['post', '/api/v1/mensajeria/conversaciones'],
  ['post', `/api/v1/mensajeria/conversaciones/${CONVERSACION}/mensajes`],
  ['post', `/api/v1/mensajeria/conversaciones/${CONVERSACION}/leidos`],
  ['post', '/api/v1/mensajeria/acuses'],
  ['patch', `/api/v1/mensajeria/conversaciones/${CONVERSACION}/archivado`],
] as const;

describe('acceso al modulo de mensajería', () => {
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
      .get('/api/v1/mensajeria/conversaciones')
      .set('Authorization', 'Bearer token-fabricado');

    expect(respuesta.status).toBe(401);
    expect((respuesta.body as RespuestaError).error.codigo).toBe(
      'TOKEN_INVALIDO',
    );
  });

  /**
   * US-MSG-03 - La URL de carga de una imagen del chat vive en el router de
   * almacenamiento, pero pertenece a este modulo: se comprueba aca para que la
   * ruta no quede sin cobertura de acceso si alguien reordena ese archivo.
   */
  it('la URL de carga de una imagen del chat también exige sesión', async () => {
    const respuesta = await request(app).post(
      `/api/v1/almacenamiento/imagen-chat/${CONVERSACION}`,
    );

    expect(respuesta.status).toBe(401);
    expect((respuesta.body as RespuestaError).error.codigo).toBe('SIN_TOKEN');
  });
});

/**
 * `con/:usuarioId` es un literal que convive con `:conversacionId` en el mismo
 * nivel de la ruta. Express resuelve por orden de declaracion, asi que basta con
 * que alguien mueva una linea para que `con` empiece a interpretarse como un id
 * y el boton "Mensajes del pedido" (US-MSG-06) reciba un 400 de validacion en
 * lugar de la conversacion. La prueba fija ese orden.
 */
describe('orden de las rutas literales', () => {
  it('con/:usuarioId no se confunde con un id de conversación', async () => {
    const respuesta = await request(app)
      .get(`/api/v1/mensajeria/conversaciones/con/${CONVERSACION}`)
      .set('Authorization', 'Bearer token-fabricado');

    // Llega al middleware de autenticacion, no al parseo del UUID: si la ruta
    // se resolviera como `/:conversacionId` el codigo seria de validacion.
    expect((respuesta.body as RespuestaError).error.codigo).toBe(
      'TOKEN_INVALIDO',
    );
  });
});
