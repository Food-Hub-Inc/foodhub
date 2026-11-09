import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * US-CFG-05 - Cobertura con dobles del agrupamiento de switches (varias
 * filas de `preferencia_notificacion` bajo un mismo grupo, con semántica "Y":
 * el grupo se muestra activo solo si TODAS sus filas lo están) y de las dos
 * reglas de rechazo de `actualizarPreferencia`: grupo que no le corresponde
 * al rol, y grupo no modificable (notificación esencial).
 */
const { aplicarSelectWhere, insertValues, onConflictDoUpdate } = vi.hoisted(
  () => ({
    aplicarSelectWhere: vi.fn(),
    insertValues: vi.fn(),
    onConflictDoUpdate: vi.fn(),
  }),
);

vi.mock('../../lib/db.js', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({ where: aplicarSelectWhere })),
    })),
    // `actualizarPreferencia` hace UPSERT: insert().values().onConflictDoUpdate().
    insert: vi.fn(() => ({ values: insertValues })),
  },
}));

const { actualizarPreferencia, obtenerPreferencias } =
  await import('./preferenciasNotificacion.service.js');

const USUARIO_ID = '11111111-1111-1111-1111-111111111111';

describe('obtenerPreferencias', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('agrupa las filas del cliente y apaga el grupo si alguna de sus filas está inactiva', async () => {
    aplicarSelectWhere.mockResolvedValue([
      { tipoNotificacion: 'PEDIDO_ACEPTADO', activa: true, modificable: true },
      { tipoNotificacion: 'PEDIDO_LISTO', activa: true, modificable: true },
      {
        tipoNotificacion: 'PEDIDO_RECHAZADO',
        activa: false,
        modificable: true,
      },
      {
        tipoNotificacion: 'PEDIDO_COMPLETADO',
        activa: true,
        modificable: true,
      },
      { tipoNotificacion: 'MENSAJE_NUEVO', activa: true, modificable: true },
      {
        tipoNotificacion: 'PUBLICACION_COCINERO_FAVORITO',
        activa: true,
        modificable: true,
      },
      { tipoNotificacion: 'AVISO_SISTEMA', activa: true, modificable: false },
    ]);

    const preferencias = await obtenerPreferencias({
      usuarioId: USUARIO_ID,
      tipoUsuario: 'CLIENTE',
    });

    expect(preferencias).toEqual([
      { grupo: 'CAMBIO_ESTADO_PEDIDO', activa: false, modificable: true },
      { grupo: 'MENSAJE_NUEVO', activa: true, modificable: true },
      {
        grupo: 'PUBLICACION_COCINERO_FAVORITO',
        activa: true,
        modificable: true,
      },
      { grupo: 'AVISO_SISTEMA', activa: true, modificable: false },
    ]);
  });

  it('el cocinero ve además "Nuevos pedidos recibidos" y las reseñas', async () => {
    aplicarSelectWhere.mockResolvedValue([
      { tipoNotificacion: 'PEDIDO_CREADO', activa: true, modificable: true },
      { tipoNotificacion: 'RESENA_RECIBIDA', activa: true, modificable: true },
      {
        tipoNotificacion: 'PUBLICACION_ELIMINADA_ADMIN',
        activa: true,
        modificable: false,
      },
    ]);

    const preferencias = await obtenerPreferencias({
      usuarioId: USUARIO_ID,
      tipoUsuario: 'COCINERO',
    });

    expect(preferencias.map((p) => p.grupo)).toEqual([
      'PEDIDO_CREADO',
      'CAMBIO_ESTADO_PEDIDO',
      'MENSAJE_NUEVO',
      'RESENA_RECIBIDA',
      'PUBLICACION_ELIMINADA_ADMIN',
      'AVISO_SISTEMA',
    ]);
  });
});

describe('actualizarPreferencia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertValues.mockReturnValue({ onConflictDoUpdate });
    onConflictDoUpdate.mockResolvedValue(undefined);
  });

  it('persiste el cambio (upsert) y devuelve el grupo actualizado', async () => {
    aplicarSelectWhere.mockResolvedValue([
      { tipoNotificacion: 'PEDIDO_CREADO', modificable: true },
    ]);

    const resultado = await actualizarPreferencia({
      usuarioId: USUARIO_ID,
      tipoUsuario: 'COCINERO',
      grupo: 'PEDIDO_CREADO',
      activa: false,
    });

    expect(resultado).toEqual({
      grupo: 'PEDIDO_CREADO',
      activa: false,
      modificable: true,
    });
    expect(insertValues).toHaveBeenCalledTimes(1);
    expect(onConflictDoUpdate).toHaveBeenCalledTimes(1);
  });

  it('crea la fila con upsert cuando el cliente todavía no la tenía (US-NOT-06)', async () => {
    aplicarSelectWhere.mockResolvedValue([]); // sin fila previa

    const resultado = await actualizarPreferencia({
      usuarioId: USUARIO_ID,
      tipoUsuario: 'CLIENTE',
      grupo: 'PUBLICACION_COCINERO_FAVORITO',
      activa: false,
    });

    expect(resultado).toEqual({
      grupo: 'PUBLICACION_COCINERO_FAVORITO',
      activa: false,
      modificable: true,
    });
    const filas = insertValues.mock.calls[0]![0] as {
      tipoNotificacion: string;
      activa: boolean;
      modificable: boolean;
    }[];
    expect(filas).toEqual([
      {
        usuarioId: USUARIO_ID,
        tipoNotificacion: 'PUBLICACION_COCINERO_FAVORITO',
        activa: false,
        modificable: true,
      },
    ]);
  });

  it('rechaza un grupo que no le corresponde al rol', async () => {
    await expect(
      actualizarPreferencia({
        usuarioId: USUARIO_ID,
        tipoUsuario: 'CLIENTE',
        grupo: 'PEDIDO_CREADO',
        activa: false,
      }),
    ).rejects.toMatchObject({ status: 404 });

    expect(insertValues).not.toHaveBeenCalled();
  });

  it('rechaza apagar una notificación esencial', async () => {
    aplicarSelectWhere.mockResolvedValue([
      { tipoNotificacion: 'AVISO_SISTEMA', modificable: false },
    ]);

    await expect(
      actualizarPreferencia({
        usuarioId: USUARIO_ID,
        tipoUsuario: 'COCINERO',
        grupo: 'AVISO_SISTEMA',
        activa: false,
      }),
    ).rejects.toMatchObject({ status: 403 });

    expect(insertValues).not.toHaveBeenCalled();
  });
});
