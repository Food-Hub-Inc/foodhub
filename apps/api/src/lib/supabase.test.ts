import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * US-GURP-08 - Bloqueo de la cuenta en GoTrue al suspenderla.
 *
 * Lo que se verifica es el CONTRATO con GoTrue, no el estado en la base: que
 * suspender manda un baneo indefinido, que rehabilitar lo levanta y -sobre
 * todo- que un fallo del servicio de autenticacion NO se propaga. Esa ultima
 * parte es la que impide que una suspension ya aplicada en la base termine
 * respondiendole un 500 al administrador, haciendole creer que no se aplico.
 */
const { actualizarUsuario, errorLogueado } = vi.hoisted(() => ({
  actualizarUsuario: vi.fn(),
  errorLogueado: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { admin: { updateUserById: actualizarUsuario } },
  }),
}));

vi.mock('./logger.js', () => ({ logger: { error: errorLogueado } }));

const { bloquearCuenta, desbloquearCuenta } = await import('./supabase.js');

const ID_USUARIO = '11111111-1111-1111-1111-111111111111';

describe('bloquearCuenta / desbloquearCuenta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    actualizarUsuario.mockResolvedValue({ data: null, error: null });
  });

  it('banea la cuenta con una duracion no vencida al suspender', async () => {
    await bloquearCuenta(ID_USUARIO);

    expect(actualizarUsuario).toHaveBeenCalledTimes(1);
    const [id, atributos] = actualizarUsuario.mock.calls[0] as [
      string,
      { ban_duration: string },
    ];
    expect(id).toBe(ID_USUARIO);
    expect(atributos.ban_duration).not.toBe('none');
    // Un baneo "indefinido" en GoTrue es una duracion muy larga, no un flag:
    // lo que importa es que no sea cero ni 'none'.
    expect(Number.parseInt(atributos.ban_duration, 10)).toBeGreaterThan(0);
  });

  it("levanta el baneo con 'none' al rehabilitar", async () => {
    await desbloquearCuenta(ID_USUARIO);

    expect(actualizarUsuario).toHaveBeenCalledWith(ID_USUARIO, {
      ban_duration: 'none',
    });
  });

  it('no propaga el error que devuelve GoTrue, pero lo deja en el log', async () => {
    actualizarUsuario.mockResolvedValue({
      data: null,
      error: new Error('gotrue caido'),
    });

    await expect(bloquearCuenta(ID_USUARIO)).resolves.toBeUndefined();
    expect(errorLogueado).toHaveBeenCalledTimes(1);
  });

  it('no propaga tampoco un fallo de red al llamar a GoTrue', async () => {
    actualizarUsuario.mockRejectedValue(new Error('sin conexion'));

    await expect(desbloquearCuenta(ID_USUARIO)).resolves.toBeUndefined();
    expect(errorLogueado).toHaveBeenCalledTimes(1);
  });
});
