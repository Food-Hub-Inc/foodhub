import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { MENSAJES_AUTH } from '@foodhub/shared';
import { crearApp } from '../../app.js';

/** Control de acceso del módulo de catálogo (solo lectura, sin sesión no atiende). */
const app = crearApp();

interface RespuestaError {
  error: { codigo: string; mensaje: string };
}

describe('acceso al módulo de catálogo', () => {
  it('responde 401 SIN_TOKEN sin sesión', async () => {
    const respuesta = await request(app).get(
      '/api/v1/catalogo/motivos-cancelacion',
    );

    expect(respuesta.status).toBe(401);
    const cuerpo = respuesta.body as RespuestaError;
    expect(cuerpo.error.codigo).toBe('SIN_TOKEN');
    expect(cuerpo.error.mensaje).toBe(MENSAJES_AUTH.sesionRequerida);
  });
});
