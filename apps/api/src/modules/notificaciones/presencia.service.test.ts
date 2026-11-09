import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  _reiniciarPresencia,
  estaViendoConversacion,
  registrarPresencia,
} from './presencia.service.js';

/**
 * US-NOT-02 - Presencia efimera en el chat: no notificar si el destinatario
 * tiene esa conversacion abierta. Todo el estado vive en memoria del proceso.
 */

const USUARIO = '11111111-1111-4111-8111-111111111111';
const CONV_A = '22222222-2222-4222-8222-222222222222';
const CONV_B = '33333333-3333-4333-8333-333333333333';

beforeEach(() => {
  _reiniciarPresencia();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('estaViendoConversacion', () => {
  it('es false si el usuario nunca declaró presencia', () => {
    expect(estaViendoConversacion(USUARIO, CONV_A)).toBe(false);
  });

  it('es true para la conversación declarada y false para cualquier otra', () => {
    registrarPresencia(USUARIO, { conversacionId: CONV_A });

    expect(estaViendoConversacion(USUARIO, CONV_A)).toBe(true);
    expect(estaViendoConversacion(USUARIO, CONV_B)).toBe(false);
  });

  it('null limpia la presencia: el usuario salió de la pantalla', () => {
    registrarPresencia(USUARIO, { conversacionId: CONV_A });
    registrarPresencia(USUARIO, { conversacionId: null });

    expect(estaViendoConversacion(USUARIO, CONV_A)).toBe(false);
  });

  it('una declaración nueva reemplaza a la anterior', () => {
    registrarPresencia(USUARIO, { conversacionId: CONV_A });
    registrarPresencia(USUARIO, { conversacionId: CONV_B });

    expect(estaViendoConversacion(USUARIO, CONV_A)).toBe(false);
    expect(estaViendoConversacion(USUARIO, CONV_B)).toBe(true);
  });

  it('la presencia vence sola pasado el TTL sin renovarse', () => {
    registrarPresencia(USUARIO, { conversacionId: CONV_A });

    vi.advanceTimersByTime(39_000);
    expect(estaViendoConversacion(USUARIO, CONV_A)).toBe(true);

    vi.advanceTimersByTime(2_000); // > 40 s en total
    expect(estaViendoConversacion(USUARIO, CONV_A)).toBe(false);
  });

  it('renovar la presencia extiende el TTL', () => {
    registrarPresencia(USUARIO, { conversacionId: CONV_A });
    vi.advanceTimersByTime(30_000);
    registrarPresencia(USUARIO, { conversacionId: CONV_A });
    vi.advanceTimersByTime(30_000); // 60 s desde el primer ping, 30 desde el segundo

    expect(estaViendoConversacion(USUARIO, CONV_A)).toBe(true);
  });
});
