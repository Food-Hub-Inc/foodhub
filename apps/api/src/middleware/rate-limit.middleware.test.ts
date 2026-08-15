import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';

/**
 * El rate limit estricto es la mitigacion acordada para los dos endpoints
 * publicos del alcance: el de recuperacion, que revela si un correo tiene
 * cuenta (decision consciente de US-AUT-04), y el de reporte de login fallido,
 * que escribe en `evento_seguridad` sin sesion.
 *
 * Este archivo agota el cupo a proposito, asi que vive separado del resto: el
 * limitador guarda su contador en memoria del modulo y compartirlo con otras
 * pruebas las volveria dependientes del orden de ejecucion.
 */
const { valoresInsertados } = vi.hoisted(() => ({
  valoresInsertados: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../lib/db.js', () => ({
  db: { insert: vi.fn(() => ({ values: valoresInsertados })) },
}));

const { crearApp } = await import('../app.js');
const app = crearApp();

/** Tiene que coincidir con MAXIMO_POR_VENTANA de rate-limit.middleware.ts. */
const MAXIMO_POR_VENTANA = 10;

interface RespuestaError {
  error: { codigo: string };
}

describe('limitadorEstricto', () => {
  it('corta el reporte de login fallido al superar el cupo por IP', async () => {
    for (let intento = 0; intento < MAXIMO_POR_VENTANA; intento += 1) {
      const respuesta = await request(app)
        .post('/api/v1/seguridad/login-fallido')
        .send({ email: `intento${String(intento)}@example.com` });
      expect(respuesta.status).toBe(204);
    }

    const excedida = await request(app)
      .post('/api/v1/seguridad/login-fallido')
      .send({ email: 'uno-de-mas@example.com' });

    expect(excedida.status).toBe(429);
    expect((excedida.body as RespuestaError).error.codigo).toBe(
      'DEMASIADAS_SOLICITUDES',
    );
  });
});
