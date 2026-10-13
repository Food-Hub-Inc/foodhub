import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { MENSAJES_AUTH } from '@foodhub/shared';
import { crearApp } from '../../app.js';

/**
 * US-NOT-04 - Sin sesión no se emite ningún aviso. El 403 por rol lo cubre
 * `rbac.middleware.test.ts` (mismo `soloAdministrador`).
 */
const app = crearApp();

interface RespuestaError {
  error: { codigo: string; mensaje: string };
}

describe('acceso a los avisos generales del panel', () => {
  it('POST /api/v1/avisos responde 401 SIN_TOKEN sin sesión', async () => {
    const respuesta = await request(app)
      .post('/api/v1/avisos')
      .send({ titulo: 'Aviso', mensaje: 'Texto', destinatario: 'TODOS' });

    expect(respuesta.status).toBe(401);
    const cuerpo = respuesta.body as RespuestaError;
    expect(cuerpo.error.codigo).toBe('SIN_TOKEN');
    expect(cuerpo.error.mensaje).toBe(MENSAJES_AUTH.sesionRequerida);
  });
});
