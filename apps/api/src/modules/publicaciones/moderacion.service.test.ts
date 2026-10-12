import { beforeEach, describe, expect, it, vi } from 'vitest';
import { eliminarPublicacionAdminSchema } from '@foodhub/shared';
import { AppError } from '../../middleware/error.middleware.js';

/**
 * US-ADM-04 - Baja por moderación: afecta solo publicaciones vigentes, deja
 * constancia en auditoría y el motivo es obligatorio.
 */
const { aplicarUpdate, registrarOperacion } = vi.hoisted(() => ({
  aplicarUpdate: vi.fn(),
  registrarOperacion: vi.fn(),
}));

vi.mock('../../lib/db.js', () => ({
  db: {
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({ returning: aplicarUpdate })),
      })),
    })),
  },
}));

vi.mock('../auditoria/auditoria.service.js', () => ({ registrarOperacion }));

const { eliminarPublicacion } = await import('./moderacion.service.js');

const ADMIN_ID = '11111111-1111-1111-1111-111111111111';
const PUBLICACION_ID = '22222222-2222-2222-2222-222222222222';
const COCINERO_ID = '33333333-3333-3333-3333-333333333333';

describe('eliminarPublicacion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('da de baja la publicación y registra la BAJA con el motivo', async () => {
    aplicarUpdate.mockResolvedValue([
      { nombre: 'Empanadas', cocineroId: COCINERO_ID },
    ]);

    await eliminarPublicacion({
      publicacionId: PUBLICACION_ID,
      adminId: ADMIN_ID,
      motivo: 'Imagen engañosa',
      ipOrigen: '10.0.0.1',
    });

    expect(registrarOperacion).toHaveBeenCalledWith(
      expect.objectContaining({
        usuarioId: ADMIN_ID,
        operacion: 'BAJA',
        tipoObjeto: 'publicacion',
        objetoAfectadoId: PUBLICACION_ID,
        datosAdicionales: expect.objectContaining({
          motivo: 'Imagen engañosa',
        }) as unknown,
      }),
    );
  });

  it('responde 404 si la publicación no existe o ya estaba dada de baja', async () => {
    aplicarUpdate.mockResolvedValue([]);

    const baja = eliminarPublicacion({
      publicacionId: PUBLICACION_ID,
      adminId: ADMIN_ID,
      motivo: 'Contenido duplicado',
      ipOrigen: null,
    });

    await expect(baja).rejects.toBeInstanceOf(AppError);
    await expect(baja).rejects.toMatchObject({ status: 404 });
    expect(registrarOperacion).not.toHaveBeenCalled();
  });
});

describe('eliminarPublicacionAdminSchema', () => {
  it('rechaza el motivo vacío o de puros espacios', () => {
    expect(
      eliminarPublicacionAdminSchema.safeParse({ motivo: '   ' }).success,
    ).toBe(false);
  });

  it('rechaza un motivo de más de 500 caracteres', () => {
    expect(
      eliminarPublicacionAdminSchema.safeParse({ motivo: 'x'.repeat(501) })
        .success,
    ).toBe(false);
  });
});
