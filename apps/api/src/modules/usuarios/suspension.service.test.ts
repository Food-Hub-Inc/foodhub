import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * US-GURP-08 - Suspender y rehabilitar dejan la cuenta coherente en los DOS
 * lados.
 *
 * El estado vive en `usuario.estado_cuenta`, pero las credenciales las emite
 * GoTrue: con la cuenta suspendida solo en la base, `signInWithPassword` seguia
 * funcionando y el criterio "bloquee nuevos inicios de sesion" no se cumplia.
 * Estas pruebas fijan que la escritura en la base y el bloqueo en GoTrue van
 * siempre juntos, y que el bloqueo ocurre DESPUES de la transaccion: si el
 * UPDATE se cae, la cuenta no puede quedar baneada.
 */
const { filaActual, aplicarUpdate, bloquear, desbloquear, auditar } =
  vi.hoisted(() => ({
    filaActual: { valor: { tipo: 'CLIENTE', estadoCuenta: 'ACTIVA' } },
    aplicarUpdate: vi.fn(),
    bloquear: vi.fn(),
    desbloquear: vi.fn(),
    auditar: vi.fn(),
  }));

vi.mock('../../lib/db.js', () => ({
  db: {
    transaction: (ejecutar: (tx: unknown) => Promise<unknown>) =>
      ejecutar({
        select: () => ({
          from: () => ({
            where: () => ({ limit: () => Promise.resolve([filaActual.valor]) }),
          }),
        }),
        update: () => ({ set: () => ({ where: aplicarUpdate }) }),
      }),
  },
}));

vi.mock('../../lib/supabase.js', () => ({
  bloquearCuenta: bloquear,
  desbloquearCuenta: desbloquear,
  conCompensacionDeCuenta: vi.fn(),
  crearClienteAnonimo: vi.fn(),
  esCorreoYaRegistrado: vi.fn(),
  revocarSesiones: vi.fn(),
  supabaseAdmin: { auth: { admin: {} } },
}));

vi.mock('../auditoria/auditoria.service.js', () => ({
  registrarOperacion: auditar,
}));

const { suspenderUsuario, rehabilitarUsuario } =
  await import('./usuarios.service.js');

const ENTRADA = {
  usuarioId: '11111111-1111-1111-1111-111111111111',
  administradorId: '22222222-2222-2222-2222-222222222222',
  ipOrigen: '190.192.0.7',
};

describe('suspenderUsuario', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    filaActual.valor = { tipo: 'CLIENTE', estadoCuenta: 'ACTIVA' };
    aplicarUpdate.mockResolvedValue(undefined);
    bloquear.mockResolvedValue(undefined);
    desbloquear.mockResolvedValue(undefined);
  });

  it('bloquea la cuenta en GoTrue ademas de escribir el estado', async () => {
    await suspenderUsuario({ ...ENTRADA, motivo: 'Incumple las condiciones' });

    expect(aplicarUpdate).toHaveBeenCalledTimes(1);
    expect(bloquear).toHaveBeenCalledWith(ENTRADA.usuarioId);
  });

  it('no banea la cuenta si la transaccion falla', async () => {
    aplicarUpdate.mockRejectedValue(new Error('conexion perdida'));

    await expect(
      suspenderUsuario({ ...ENTRADA, motivo: 'Incumple las condiciones' }),
    ).rejects.toThrow();

    expect(bloquear).not.toHaveBeenCalled();
  });
});

describe('rehabilitarUsuario', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    filaActual.valor = { tipo: 'CLIENTE', estadoCuenta: 'SUSPENDIDA' };
    aplicarUpdate.mockResolvedValue(undefined);
    desbloquear.mockResolvedValue(undefined);
  });

  it('levanta el bloqueo de GoTrue ademas de reactivar la cuenta', async () => {
    await rehabilitarUsuario(ENTRADA);

    expect(aplicarUpdate).toHaveBeenCalledTimes(1);
    expect(desbloquear).toHaveBeenCalledWith(ENTRADA.usuarioId);
  });

  it('no levanta el bloqueo si la transaccion falla', async () => {
    aplicarUpdate.mockRejectedValue(new Error('conexion perdida'));

    await expect(rehabilitarUsuario(ENTRADA)).rejects.toThrow();
    expect(desbloquear).not.toHaveBeenCalled();
  });
});
