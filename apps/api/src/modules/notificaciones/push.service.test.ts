import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enviarPush, type MensajePush } from './push.service.js';

/**
 * Cliente de la Expo Push API: traduccion de la respuesta de `exp.host` a un
 * resultado por token, y troceado en lotes de 100.
 */

function mensaje(to: string): MensajePush {
  return {
    to,
    titulo: 'Hola',
    cuerpo: 'Mundo',
    data: { tipo: 'MENSAJE_NUEVO' },
  };
}

function respuestaExpo(tickets: unknown[]): Response {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve({ data: tickets }),
  } as unknown as Response;
}

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('enviarPush', () => {
  it('no llama a la red si no hay mensajes', async () => {
    expect(await enviarPush([])).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('mapea cada ticket de Expo a su resultado, en orden', async () => {
    fetchMock.mockResolvedValue(
      respuestaExpo([
        { status: 'ok', id: 'x' },
        { status: 'error', details: { error: 'DeviceNotRegistered' } },
        { status: 'error', details: { error: 'MessageTooBig' } },
      ]),
    );

    const resultado = await enviarPush([
      mensaje('ExponentPushToken[a]'),
      mensaje('ExponentPushToken[b]'),
      mensaje('ExponentPushToken[c]'),
    ]);

    expect(resultado).toEqual(['ok', 'token_muerto', 'error']);
  });

  it('un ticket ausente cuenta como error (se reintenta)', async () => {
    fetchMock.mockResolvedValue(respuestaExpo([{ status: 'ok' }]));

    const resultado = await enviarPush([
      mensaje('ExponentPushToken[a]'),
      mensaje('ExponentPushToken[b]'),
    ]);

    expect(resultado).toEqual(['ok', 'error']);
  });

  it('si la Expo Push API responde con error HTTP, todo es error transitorio', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503 });

    expect(await enviarPush([mensaje('ExponentPushToken[a]')])).toEqual([
      'error',
    ]);
  });

  it('si no hay conexión con exp.host, todo es error transitorio', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));

    expect(
      await enviarPush([
        mensaje('ExponentPushToken[a]'),
        mensaje('ExponentPushToken[b]'),
      ]),
    ).toEqual(['error', 'error']);
  });

  it('trocea en lotes de 100', async () => {
    fetchMock.mockImplementation((_url: string, init: { body: string }) => {
      const enviados = JSON.parse(init.body) as unknown[];
      return Promise.resolve(
        respuestaExpo(enviados.map(() => ({ status: 'ok' }))),
      );
    });

    const mensajes = Array.from({ length: 150 }, (_, i) =>
      mensaje(`ExponentPushToken[${String(i)}]`),
    );
    const resultado = await enviarPush(mensajes);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(resultado).toHaveLength(150);
    expect(resultado.every((r) => r === 'ok')).toBe(true);
  });
});
