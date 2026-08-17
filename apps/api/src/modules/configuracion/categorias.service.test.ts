import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MENSAJES_CONFIGURACION } from '@foodhub/shared';
import { AppError } from '../../middleware/error.middleware.js';

/**
 * US-CFG-01 - Las dos restricciones de negocio que la base garantiza y el
 * servicio traduce a un mensaje literal:
 *
 *   NOMBRE_DUPLICADO              unique_violation (23505), por
 *                                 `categoria_nombre_activo_uq`.
 *   CATEGORIA_CON_PUBLICACIONES   foreign_key_violation (23503), por
 *                                 `publicacion.categoria_id` con
 *                                 `onDelete: 'restrict'`.
 *
 * La base se reemplaza por un doble para poder lanzar esos codigos SQLSTATE
 * sin una base real. La forma anidada (`cause.code`, no `code` directo)
 * reproduce lo que realmente lanza `drizzle-orm/postgres-js`: envuelve el
 * `PostgresError` de postgres.js —que es donde vive el `.code`— dentro de un
 * `DrizzleQueryError` propio. Ver `lib/errores-postgres.ts`.
 */
function errorPostgres(
  code: string,
): Error & { cause: Error & { code: string } } {
  return Object.assign(new Error('error de drizzle simulado'), {
    cause: Object.assign(new Error('error de postgres simulado'), { code }),
  });
}

const { aplicarInsert, aplicarDelete } = vi.hoisted(() => ({
  aplicarInsert: vi.fn(),
  aplicarDelete: vi.fn(),
}));

vi.mock('../../lib/db.js', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({ returning: aplicarInsert })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({ returning: aplicarDelete })),
    })),
  },
}));

const { crearCategoria, eliminarCategoria } =
  await import('./categorias.service.js');

const ADMIN_ID = '11111111-1111-1111-1111-111111111111';
const CATEGORIA_ID = '22222222-2222-2222-2222-222222222222';

describe('crearCategoria', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('traduce el nombre duplicado (unique_violation) a un 409 con el mensaje literal de US-CFG-01', async () => {
    aplicarInsert.mockRejectedValue(errorPostgres('23505'));

    const alta = crearCategoria({
      datos: { nombre: 'Postres' },
      administradorId: ADMIN_ID,
      ipOrigen: null,
    });

    await expect(alta).rejects.toBeInstanceOf(AppError);
    await expect(alta).rejects.toMatchObject({
      status: 409,
      codigo: 'NOMBRE_DUPLICADO',
      message: MENSAJES_CONFIGURACION.nombreCategoriaDuplicado,
    });
  });

  it('propaga sin traducir cualquier otro error de la base', async () => {
    aplicarInsert.mockRejectedValue(errorPostgres('23514'));

    await expect(
      crearCategoria({
        datos: { nombre: 'Postres' },
        administradorId: ADMIN_ID,
        ipOrigen: null,
      }),
    ).rejects.not.toBeInstanceOf(AppError);
  });
});

describe('eliminarCategoria', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('traduce el bloqueo por publicaciones asociadas (foreign_key_violation) a un 409 con el mensaje literal de US-CFG-01', async () => {
    aplicarDelete.mockRejectedValue(errorPostgres('23503'));

    const baja = eliminarCategoria({
      categoriaId: CATEGORIA_ID,
      administradorId: ADMIN_ID,
      ipOrigen: null,
    });

    await expect(baja).rejects.toBeInstanceOf(AppError);
    await expect(baja).rejects.toMatchObject({
      status: 409,
      codigo: 'CATEGORIA_CON_PUBLICACIONES',
      message: MENSAJES_CONFIGURACION.categoriaConPublicacionesAsociadas,
    });
  });

  it('responde 404 cuando la categoría no existe', async () => {
    aplicarDelete.mockResolvedValue([]);

    await expect(
      eliminarCategoria({
        categoriaId: CATEGORIA_ID,
        administradorId: ADMIN_ID,
        ipOrigen: null,
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
});
