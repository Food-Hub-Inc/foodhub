import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

/**
 * US-AUD-01, segundo criterio - Reporte de intentos de login fallidos.
 *
 * La base se reemplaza por un doble: lo que se verifica es el contrato del
 * endpoint (que responda 204, que la IP y la fecha las ponga el servidor y que
 * un fallo de escritura no se le traslade al cliente), no el SQL.
 */
const { valoresInsertados } = vi.hoisted(() => ({
  valoresInsertados: vi.fn(),
}));

vi.mock('../../lib/db.js', () => ({
  db: { insert: vi.fn(() => ({ values: valoresInsertados })) },
}));

const { crearApp } = await import('../../app.js');
const app = crearApp();

interface EventoRegistrado {
  tipoEvento: string;
  emailIntentado: string;
  ipOrigen: string | null;
}

interface RespuestaError {
  error: { codigo: string };
}

describe('POST /api/v1/seguridad/login-fallido', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    valoresInsertados.mockResolvedValue(undefined);
  });

  it('registra el intento y responde 204', async () => {
    const respuesta = await request(app)
      .post('/api/v1/seguridad/login-fallido')
      .send({ email: 'Ana@Example.com' });

    expect(respuesta.status).toBe(204);

    const evento = valoresInsertados.mock.calls[0]?.[0] as EventoRegistrado;
    expect(evento.tipoEvento).toBe('LOGIN_FALLIDO');
    // El schema normaliza el correo a minúsculas antes de guardarlo.
    expect(evento.emailIntentado).toBe('ana@example.com');
    // La IP la pone el servidor: el cuerpo no la informa ni podría hacerlo.
    expect(evento.ipOrigen).toBeTruthy();
  });

  it('ignora una IP informada por el cliente en el cuerpo', async () => {
    await request(app)
      .post('/api/v1/seguridad/login-fallido')
      .send({ email: 'ana@example.com', ipOrigen: '1.2.3.4' });

    const evento = valoresInsertados.mock.calls[0]?.[0] as EventoRegistrado;
    expect(evento.ipOrigen).not.toBe('1.2.3.4');
  });

  it('responde 204 aunque la escritura falle', async () => {
    valoresInsertados.mockRejectedValue(new Error('base caída'));

    const respuesta = await request(app)
      .post('/api/v1/seguridad/login-fallido')
      .send({ email: 'ana@example.com' });

    expect(respuesta.status).toBe(204);
  });

  it('rechaza un cuerpo sin correo', async () => {
    const respuesta = await request(app)
      .post('/api/v1/seguridad/login-fallido')
      .send({});

    expect(respuesta.status).toBe(400);
    expect((respuesta.body as RespuestaError).error.codigo).toBe('VALIDACION');
    expect(valoresInsertados).not.toHaveBeenCalled();
  });
});
