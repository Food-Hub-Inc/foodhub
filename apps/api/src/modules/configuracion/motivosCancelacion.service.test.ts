import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MENSAJES_CONFIGURACION } from '@foodhub/shared';
import { AppError } from '../../middleware/error.middleware.js';

/**
 * US-CFG-02 - Nombre duplicado (unique_violation, 23505, por el nuevo
 * índice `motivo_cancelacion_nombre_activo_uq`) y baja/alta sobre un motivo
 * inexistente. Mismo patrón que `categorias.service.test.ts`: la forma
 * anidada (`cause.code`) reproduce lo que realmente lanza
 * `drizzle-orm/postgres-js` (ver `lib/errores-postgres.ts`).
 */
function errorPostgres(
  code: string,
): Error & { cause: Error & { code: string } } {
  return Object.assign(new Error('error de drizzle simulado'), {
    cause: Object.assign(new Error('error de postgres simulado'), { code }),
  });
}

const { aplicarSelectTipo, aplicarInsert, aplicarUpdate } = vi.hoisted(() => ({
  aplicarSelectTipo: vi.fn(),
  aplicarInsert: vi.fn(),
  aplicarUpdate: vi.fn(),
}));

vi.mock('../../lib/db.js', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ limit: aplicarSelectTipo })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({ returning: aplicarInsert })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({ returning: aplicarUpdate })),
      })),
    })),
  },
}));

const { crearMotivoCancelacion, establecerHabilitacionMotivo } =
  await import('./motivosCancelacion.service.js');

const ADMIN_ID = '11111111-1111-1111-1111-111111111111';
const MOTIVO_ID = '22222222-2222-2222-2222-222222222222';
const TIPO_ID = '33333333-3333-3333-3333-333333333333';

describe('crearMotivoCancelacion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    aplicarSelectTipo.mockResolvedValue([{ id: TIPO_ID }]);
  });

  it('traduce el nombre duplicado (unique_violation) a un 409 con el mensaje literal', async () => {
    aplicarInsert.mockRejectedValue(errorPostgres('23505'));

    const alta = crearMotivoCancelacion({
      datos: {
        nombre: 'Sin stock del ingrediente principal',
        aplicableA: 'COCINERO',
      },
      administradorId: ADMIN_ID,
      ipOrigen: null,
    });

    await expect(alta).rejects.toBeInstanceOf(AppError);
    await expect(alta).rejects.toMatchObject({
      status: 409,
      codigo: 'NOMBRE_DUPLICADO',
      message: MENSAJES_CONFIGURACION.nombreMotivoDuplicado,
    });
  });

  it('propaga sin traducir cualquier otro error de la base', async () => {
    aplicarInsert.mockRejectedValue(errorPostgres('23514'));

    await expect(
      crearMotivoCancelacion({
        datos: { nombre: 'Demora en la preparación', aplicableA: 'AMBOS' },
        administradorId: ADMIN_ID,
        ipOrigen: null,
      }),
    ).rejects.not.toBeInstanceOf(AppError);
  });
});

describe('establecerHabilitacionMotivo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('responde 404 cuando el motivo no existe', async () => {
    aplicarUpdate.mockResolvedValue([]);

    await expect(
      establecerHabilitacionMotivo({
        motivoId: MOTIVO_ID,
        activo: false,
        administradorId: ADMIN_ID,
        ipOrigen: null,
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
});
