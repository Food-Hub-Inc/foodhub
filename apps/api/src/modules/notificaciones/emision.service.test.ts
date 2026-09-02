import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * US-NOT (emision) - La regla que decide si una notificacion se escribe:
 *
 *   tipo ESENCIAL                       -> siempre, sin mirar preferencias.
 *   tipo CONFIGURABLE + preferencia off -> nada: ni fila ni push.
 *   tipo CONFIGURABLE + sin preferencia -> se emite (el default es recibir).
 *
 * Se cubre con dobles: el entorno de test apunta a un puerto cerrado, igual que
 * en el resto de los modulos.
 */

const { selectWhere, insertValues, programarDespachoInmediato } = vi.hoisted(
  () => ({
    selectWhere: vi.fn(),
    insertValues: vi.fn(),
    programarDespachoInmediato: vi.fn(),
  }),
);

vi.mock('../../lib/db.js', () => ({
  db: {
    select: () => ({ from: () => ({ where: selectWhere }) }),
    insert: () => ({ values: insertValues }),
  },
}));

vi.mock('./despacho.service.js', () => ({ programarDespachoInmediato }));

const { emitirNotificacion, emitirNotificacionEnLote } =
  await import('./emision.service.js');

const CLIENTE_A = '11111111-1111-4111-8111-111111111111';
const CLIENTE_B = '22222222-2222-4222-8222-222222222222';
const PEDIDO = '33333333-3333-4333-8333-333333333333';

beforeEach(() => {
  vi.clearAllMocks();
  selectWhere.mockResolvedValue([]); // nadie tiene la preferencia apagada
  insertValues.mockReturnValue({
    returning: () => Promise.resolve([{ id: 'notif-1' }]),
  });
});

describe('emitirNotificacion', () => {
  it('emite un tipo configurable cuando no hay preferencia apagada', async () => {
    const resultado = await emitirNotificacion({
      usuarioDestinoId: CLIENTE_A,
      tipo: 'PEDIDO_ACEPTADO',
      titulo: 'Pedido aceptado',
      cuerpo: '¡Tu pedido fue aceptado!',
      objetoAfectadoId: PEDIDO,
    });

    expect(resultado).toEqual({ id: 'notif-1' });
    expect(insertValues).toHaveBeenCalledOnce();
    expect(programarDespachoInmediato).toHaveBeenCalledOnce();
  });

  it('NO escribe fila ni programa push si el tipo configurable está apagado', async () => {
    selectWhere.mockResolvedValue([{ usuarioId: CLIENTE_A }]);

    const resultado = await emitirNotificacion({
      usuarioDestinoId: CLIENTE_A,
      tipo: 'MENSAJE_NUEVO',
      titulo: 'Mensaje nuevo',
      cuerpo: 'Ana: hola',
      objetoAfectadoId: null,
    });

    expect(resultado).toBeNull();
    expect(insertValues).not.toHaveBeenCalled();
    expect(programarDespachoInmediato).not.toHaveBeenCalled();
  });

  it('un tipo esencial se emite aunque haya una preferencia apagada (no la consulta)', async () => {
    selectWhere.mockResolvedValue([{ usuarioId: CLIENTE_A }]);

    const resultado = await emitirNotificacion({
      usuarioDestinoId: CLIENTE_A,
      tipo: 'AVISO_SISTEMA',
      titulo: 'Aviso',
      cuerpo: 'Actualizamos los términos.',
      objetoAfectadoId: null,
    });

    expect(resultado).toEqual({ id: 'notif-1' });
    expect(selectWhere).not.toHaveBeenCalled();
    expect(insertValues).toHaveBeenCalledOnce();
  });
});

describe('emitirNotificacionEnLote', () => {
  beforeEach(() => {
    insertValues.mockResolvedValue(undefined); // el lote no usa .returning()
  });

  it('escribe una fila por destinatario y devuelve la cantidad', async () => {
    const cantidad = await emitirNotificacionEnLote({
      usuarioDestinoIds: [CLIENTE_A, CLIENTE_B],
      tipo: 'PUBLICACION_COCINERO_FAVORITO',
      titulo: 'Nueva publicación',
      cuerpo: "Juan publicó un nuevo plato: 'Milanesa' — $1.500,00.",
      objetoAfectadoId: PEDIDO,
    });

    expect(cantidad).toBe(2);
    expect(insertValues).toHaveBeenCalledOnce();
    const filas = insertValues.mock.calls[0]![0] as unknown[];
    expect(filas).toHaveLength(2);
    expect(programarDespachoInmediato).toHaveBeenCalledOnce();
  });

  it('excluye a los que tienen la preferencia apagada', async () => {
    selectWhere.mockResolvedValue([{ usuarioId: CLIENTE_B }]);

    const cantidad = await emitirNotificacionEnLote({
      usuarioDestinoIds: [CLIENTE_A, CLIENTE_B],
      tipo: 'PUBLICACION_COCINERO_FAVORITO',
      titulo: 'Nueva publicación',
      cuerpo: 'texto',
      objetoAfectadoId: null,
    });

    expect(cantidad).toBe(1);
    const filas = insertValues.mock.calls[0]![0] as {
      usuarioDestinoId: string;
    }[];
    expect(filas.map((f) => f.usuarioDestinoId)).toEqual([CLIENTE_A]);
  });

  it('si todos tienen la preferencia apagada no escribe nada', async () => {
    selectWhere.mockResolvedValue([
      { usuarioId: CLIENTE_A },
      { usuarioId: CLIENTE_B },
    ]);

    const cantidad = await emitirNotificacionEnLote({
      usuarioDestinoIds: [CLIENTE_A, CLIENTE_B],
      tipo: 'PUBLICACION_COCINERO_FAVORITO',
      titulo: 't',
      cuerpo: 'c',
      objetoAfectadoId: null,
    });

    expect(cantidad).toBe(0);
    expect(insertValues).not.toHaveBeenCalled();
    expect(programarDespachoInmediato).not.toHaveBeenCalled();
  });

  it('deduplica destinatarios repetidos', async () => {
    const cantidad = await emitirNotificacionEnLote({
      usuarioDestinoIds: [CLIENTE_A, CLIENTE_A, CLIENTE_B],
      tipo: 'PUBLICACION_COCINERO_FAVORITO',
      titulo: 't',
      cuerpo: 'c',
      objetoAfectadoId: null,
    });

    expect(cantidad).toBe(2);
  });
});
