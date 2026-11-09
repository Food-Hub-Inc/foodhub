import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * US-CFG-04 - Cobertura mínima con dobles: que "Guardar borrador" reutilice
 * la fila existente en lugar de duplicarla, y que el HTML se sanitice antes
 * de escribirse. El flujo completo de publicación (archivar la vigente,
 * calcular el número siguiente, promover el borrador) se verifica contra la
 * base real: son varias sentencias encadenadas dentro de una transacción y
 * un doble no aporta la misma confianza que ejercitarlo de punta a punta.
 */
const { aplicarSelectWhere, aplicarInsertReturning, aplicarUpdateWhere } =
  vi.hoisted(() => ({
    aplicarSelectWhere: vi.fn(),
    aplicarInsertReturning: vi.fn(),
    aplicarUpdateWhere: vi.fn(),
  }));

vi.mock('../../lib/db.js', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ limit: aplicarSelectWhere })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({ returning: aplicarInsertReturning })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({ where: aplicarUpdateWhere })),
    })),
  },
}));

const { guardarBorrador } = await import('./terminos.service.js');

const ADMIN_ID = '11111111-1111-1111-1111-111111111111';
const BORRADOR_ID = '22222222-2222-2222-2222-222222222222';

describe('guardarBorrador', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('actualiza el borrador existente en lugar de crear uno nuevo', async () => {
    aplicarSelectWhere.mockResolvedValue([{ id: BORRADOR_ID }]);
    aplicarUpdateWhere.mockResolvedValue(undefined);

    const resultado = await guardarBorrador({
      tipo: 'TERMINOS',
      contenidoHtml: '<p>hola</p>',
      administradorId: ADMIN_ID,
      ipOrigen: null,
    });

    expect(resultado.id).toBe(BORRADOR_ID);
    expect(aplicarUpdateWhere).toHaveBeenCalledTimes(1);
    expect(aplicarInsertReturning).not.toHaveBeenCalled();
  });

  it('sanitiza etiquetas no permitidas del HTML antes de guardarlo', async () => {
    aplicarSelectWhere.mockResolvedValue([{ id: BORRADOR_ID }]);
    aplicarUpdateWhere.mockResolvedValue(undefined);

    const resultado = await guardarBorrador({
      tipo: 'TERMINOS',
      contenidoHtml: '<p onclick="alert(1)">hola</p><script>alert(2)</script>',
      administradorId: ADMIN_ID,
      ipOrigen: null,
    });

    expect(resultado.contenidoHtml).not.toContain('<script>');
    expect(resultado.contenidoHtml).not.toContain('onclick');
    expect(resultado.contenidoHtml).toContain('<p>hola</p>');
  });

  it('crea un borrador nuevo cuando el administrador no tiene uno para ese tipo', async () => {
    aplicarSelectWhere.mockResolvedValue([]);
    aplicarInsertReturning.mockResolvedValue([{ id: BORRADOR_ID }]);

    const resultado = await guardarBorrador({
      tipo: 'PRIVACIDAD',
      contenidoHtml: '<p>hola</p>',
      administradorId: ADMIN_ID,
      ipOrigen: null,
    });

    expect(resultado.id).toBe(BORRADOR_ID);
    expect(aplicarInsertReturning).toHaveBeenCalledTimes(1);
    expect(aplicarUpdateWhere).not.toHaveBeenCalled();
  });
});
