import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MENSAJES_USUARIO } from '@foodhub/shared';
import { AppError } from '../../middleware/error.middleware.js';

/**
 * US-GURP-04 - La baja de la cuenta propia no esta habilitada para el
 * administrador.
 *
 * La historia lista como actores unicamente a Cliente y Cocinero; la baja de
 * una cuenta administradora se gestiona desde el panel por US-GURP-09, que si
 * aplica la salvaguarda del ultimo administrador.
 *
 * La base se reemplaza por un doble para poder afirmar lo que importa: que el
 * rechazo ocurre ANTES de escribir. Un 403 despues del UPDATE dejaria la cuenta
 * dada de baja igual.
 */
const { aplicarUpdate } = vi.hoisted(() => ({ aplicarUpdate: vi.fn() }));

vi.mock('../../lib/db.js', () => ({
  db: {
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: aplicarUpdate })) })),
  },
}));

const { eliminarCuentaPropia } = await import('./usuarios.service.js');

describe('eliminarCuentaPropia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    aplicarUpdate.mockResolvedValue(undefined);
  });

  it('rechaza con 403 la baja propia de un administrador', async () => {
    const baja = eliminarCuentaPropia({
      usuarioId: '11111111-1111-1111-1111-111111111111',
      tipo: 'ADMINISTRADOR',
      accessToken: 'token-de-la-sesión',
      ipOrigen: '190.192.0.7',
    });

    await expect(baja).rejects.toBeInstanceOf(AppError);
    await expect(baja).rejects.toMatchObject({
      status: 403,
      codigo: 'BAJA_NO_PERMITIDA',
      message: MENSAJES_USUARIO.accesoNoAutorizado,
    });
  });

  it('no llega a escribir el estado de cuenta cuando rechaza', async () => {
    await expect(
      eliminarCuentaPropia({
        usuarioId: '11111111-1111-1111-1111-111111111111',
        tipo: 'ADMINISTRADOR',
        accessToken: 'token-de-la-sesión',
        ipOrigen: null,
      }),
    ).rejects.toThrow();

    expect(aplicarUpdate).not.toHaveBeenCalled();
  });
});
