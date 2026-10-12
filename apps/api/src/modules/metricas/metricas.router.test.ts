import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { MENSAJES_AUTH } from '@foodhub/shared';
import { crearApp } from '../../app.js';

/**
 * US-ADM-05, último criterio: sin sesión no se exponen métricas. El 403 por
 * rol lo cubre `rbac.middleware.test.ts` (mismo `soloAdministrador`).
 */
const app = crearApp();

interface RespuestaError {
  error: { codigo: string; mensaje: string };
}

describe('acceso a las métricas del panel', () => {
  it('GET /api/v1/metricas responde 401 SIN_TOKEN sin sesión', async () => {
    const respuesta = await request(app).get('/api/v1/metricas');

    expect(respuesta.status).toBe(401);
    const cuerpo = respuesta.body as RespuestaError;
    expect(cuerpo.error.codigo).toBe('SIN_TOKEN');
    expect(cuerpo.error.mensaje).toBe(MENSAJES_AUTH.sesionRequerida);
  });
});
