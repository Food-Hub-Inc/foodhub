import { beforeEach, describe, expect, it, vi } from 'vitest';
import { avisoGeneralSchema } from '@foodhub/shared';

/**
 * US-NOT-04 - Aviso general del administrador: a quién llega, que se escribe
 * como AVISO_SISTEMA y que queda auditado. La consulta de destinatarios se
 * prueba contra la base en la verificación manual; acá se fija el contrato.
 */
const { destinatarios, emitirEnLote, registrarOperacion } = vi.hoisted(() => ({
  destinatarios: vi.fn(),
  emitirEnLote: vi.fn(),
  registrarOperacion: vi.fn(),
}));

vi.mock('../../lib/db.js', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({ where: destinatarios })),
    })),
  },
}));

vi.mock('./emision.service.js', () => ({
  emitirNotificacionEnLote: emitirEnLote,
}));

vi.mock('../auditoria/auditoria.service.js', () => ({ registrarOperacion }));

const { emitirAvisoGeneral } = await import('./avisos.service.js');

const ADMIN_ID = '11111111-1111-1111-1111-111111111111';

describe('emitirAvisoGeneral', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('emite un AVISO_SISTEMA a cada destinatario con el texto del administrador', async () => {
    destinatarios.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);
    emitirEnLote.mockResolvedValue(2);

    const resultado = await emitirAvisoGeneral({
      aviso: {
        titulo: 'Mantenimiento',
        mensaje: 'La app no estará disponible esta noche.',
        destinatario: 'TODOS',
      },
      adminId: ADMIN_ID,
      ipOrigen: '10.0.0.1',
    });

    expect(resultado).toEqual({ destinatarios: 2 });
    expect(emitirEnLote).toHaveBeenCalledWith({
      usuarioDestinoIds: ['u1', 'u2'],
      tipo: 'AVISO_SISTEMA',
      titulo: 'Mantenimiento',
      cuerpo: 'La app no estará disponible esta noche.',
      objetoAfectadoId: null,
    });
  });

  it('deja constancia del alta en auditoría (RF097)', async () => {
    destinatarios.mockResolvedValue([{ id: 'u1' }]);
    emitirEnLote.mockResolvedValue(1);

    await emitirAvisoGeneral({
      aviso: { titulo: 'Aviso', mensaje: 'Texto', destinatario: 'COCINERO' },
      adminId: ADMIN_ID,
      ipOrigen: null,
    });

    expect(registrarOperacion).toHaveBeenCalledWith(
      expect.objectContaining({
        usuarioId: ADMIN_ID,
        operacion: 'ALTA',
        tipoObjeto: 'notificacion',
        datosAdicionales: expect.objectContaining({
          destinatario: 'COCINERO',
          destinatarios: 1,
        }) as unknown,
      }),
    );
  });
});

describe('avisoGeneralSchema', () => {
  const valido = { titulo: 'Aviso', mensaje: 'Texto', destinatario: 'TODOS' };

  it('acepta los tres destinatarios del criterio', () => {
    for (const destinatario of ['TODOS', 'CLIENTE', 'COCINERO']) {
      expect(
        avisoGeneralSchema.safeParse({ ...valido, destinatario }).success,
      ).toBe(true);
    }
  });

  it('rechaza al administrador como destinatario', () => {
    expect(
      avisoGeneralSchema.safeParse({
        ...valido,
        destinatario: 'ADMINISTRADOR',
      }).success,
    ).toBe(false);
  });

  it('rechaza título o mensaje vacíos', () => {
    expect(
      avisoGeneralSchema.safeParse({ ...valido, titulo: '  ' }).success,
    ).toBe(false);
    expect(
      avisoGeneralSchema.safeParse({ ...valido, mensaje: '' }).success,
    ).toBe(false);
  });

  it('respeta los topes de las columnas (120 y 500)', () => {
    expect(
      avisoGeneralSchema.safeParse({ ...valido, titulo: 'x'.repeat(121) })
        .success,
    ).toBe(false);
    expect(
      avisoGeneralSchema.safeParse({ ...valido, mensaje: 'x'.repeat(501) })
        .success,
    ).toBe(false);
  });
});
