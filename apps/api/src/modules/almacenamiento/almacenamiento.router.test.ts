import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { MENSAJES_AUTH } from '@foodhub/shared';
import { crearApp } from '../../app.js';

/**
 * Control de acceso del modulo de almacenamiento.
 *
 * Lo que se puede verificar sin Supabase real: que la emision de URLs de carga
 * NUNCA atienda sin sesion. Es la propiedad que sostiene todo el diseno del
 * modulo —la ruta del archivo se deriva de `req.usuario.id`— y la que
 * distingue esta solucion de un endpoint publico de subida.
 *
 * La firma en si y la limpieza de fotos anteriores exigen un bucket real y se
 * prueban en la Etapa 6 contra el ambiente `foodhub-dev`.
 */
const app = crearApp();

interface RespuestaError {
  error: { codigo: string; mensaje: string };
}

describe('acceso al módulo de almacenamiento', () => {
  it('responde 401 SIN_TOKEN sin sesión', async () => {
    const respuesta = await request(app)
      .post('/api/v1/almacenamiento/foto-perfil')
      .send({ mimeType: 'image/jpeg', tamano: 1024 });

    expect(respuesta.status).toBe(401);
    const cuerpo = respuesta.body as RespuestaError;
    expect(cuerpo.error.codigo).toBe('SIN_TOKEN');
    expect(cuerpo.error.mensaje).toBe(MENSAJES_AUTH.sesionRequerida);
  });

  it('rechaza un token que no verifica contra el JWKS', async () => {
    const respuesta = await request(app)
      .post('/api/v1/almacenamiento/foto-perfil')
      .set('Authorization', 'Bearer token-fabricado')
      .send({ mimeType: 'image/jpeg', tamano: 1024 });

    expect(respuesta.status).toBe(401);
    expect((respuesta.body as RespuestaError).error.codigo).toBe(
      'TOKEN_INVALIDO',
    );
  });

  /**
   * El rechazo por sesión ocurre ANTES de mirar el cuerpo. Importa: si el
   * orden fuera el inverso, un anónimo podría sondear el bucket por la forma
   * de los errores de validación.
   */
  it('rechaza por sesión antes que por un cuerpo inválido', async () => {
    const respuesta = await request(app)
      .post('/api/v1/almacenamiento/foto-perfil')
      .send({ mimeType: 'image/gif', tamano: -1 });

    expect(respuesta.status).toBe(401);
    expect((respuesta.body as RespuestaError).error.codigo).toBe('SIN_TOKEN');
  });

  /**
   * Mismas verificaciones que `/foto-perfil`, para la foto de plato
   * (US-PUB-01). El rechazo por rol COCINERO exige un usuario real y se prueba
   * en la Etapa 6; acá solo se cubre lo que no depende de datos.
   */
  it('responde 401 SIN_TOKEN sin sesión en /foto-plato', async () => {
    const respuesta = await request(app)
      .post('/api/v1/almacenamiento/foto-plato')
      .send({ mimeType: 'image/jpeg', tamano: 1024 });

    expect(respuesta.status).toBe(401);
    const cuerpo = respuesta.body as RespuestaError;
    expect(cuerpo.error.codigo).toBe('SIN_TOKEN');
    expect(cuerpo.error.mensaje).toBe(MENSAJES_AUTH.sesionRequerida);
  });

  it('rechaza en /foto-plato un token que no verifica contra el JWKS', async () => {
    const respuesta = await request(app)
      .post('/api/v1/almacenamiento/foto-plato')
      .set('Authorization', 'Bearer token-fabricado')
      .send({ mimeType: 'image/jpeg', tamano: 1024 });

    expect(respuesta.status).toBe(401);
    expect((respuesta.body as RespuestaError).error.codigo).toBe(
      'TOKEN_INVALIDO',
    );
  });

  /**
   * Lo mismo para la foto de una resena (US-RES-01). Es la unica subida del
   * sistema que hace un CLIENTE sobre contenido publico, asi que importa
   * verificar que tampoco esta abierta: el rol se comprueba en la Etapa 6 con
   * un usuario real, pero la puerta de sesion se cubre aca.
   */
  it('responde 401 SIN_TOKEN sin sesión en /foto-resena', async () => {
    const respuesta = await request(app)
      .post('/api/v1/almacenamiento/foto-resena')
      .send({ mimeType: 'image/jpeg', tamano: 1024 });

    expect(respuesta.status).toBe(401);
    const cuerpo = respuesta.body as RespuestaError;
    expect(cuerpo.error.codigo).toBe('SIN_TOKEN');
    expect(cuerpo.error.mensaje).toBe(MENSAJES_AUTH.sesionRequerida);
  });

  it('rechaza en /foto-resena un token que no verifica contra el JWKS', async () => {
    const respuesta = await request(app)
      .post('/api/v1/almacenamiento/foto-resena')
      .set('Authorization', 'Bearer token-fabricado')
      .send({ mimeType: 'image/jpeg', tamano: 1024 });

    expect(respuesta.status).toBe(401);
    expect((respuesta.body as RespuestaError).error.codigo).toBe(
      'TOKEN_INVALIDO',
    );
  });
});
