import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MENSAJES_NOTIFICACION } from '@foodhub/shared';

/**
 * RF086 - A quién se avisa al resolver los reportes de una reseña. Las dos
 * ramas van como AVISO_SISTEMA (decisión del equipo del 13/10/2026).
 */
const { emitir, emitirEnLote } = vi.hoisted(() => ({
  emitir: vi.fn(),
  emitirEnLote: vi.fn(),
}));

vi.mock('./emision.service.js', () => ({
  emitirNotificacion: emitir,
  emitirNotificacionEnLote: emitirEnLote,
}));

const { notificarResolucionDeReporte } =
  await import('./disparadores.service.js');

const DATOS = {
  resenaId: 'resena-id',
  autorId: 'autor-id',
  reportantesIds: ['reportante-1', 'reportante-2'],
};

describe('notificarResolucionDeReporte', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reporte aprobado -> solo al autor, avisando que la reseña fue removida', async () => {
    await notificarResolucionDeReporte({ ...DATOS, aprobado: true });

    expect(emitir).toHaveBeenCalledWith({
      usuarioDestinoId: 'autor-id',
      tipo: 'AVISO_SISTEMA',
      ...MENSAJES_NOTIFICACION.resenaRemovida,
      objetoAfectadoId: null,
    });
    expect(emitirEnLote).not.toHaveBeenCalled();
  });

  it('reporte rechazado -> a todos los que reportaron, con el literal del RF', async () => {
    await notificarResolucionDeReporte({ ...DATOS, aprobado: false });

    expect(emitirEnLote).toHaveBeenCalledWith({
      usuarioDestinoIds: ['reportante-1', 'reportante-2'],
      tipo: 'AVISO_SISTEMA',
      ...MENSAJES_NOTIFICACION.reporteRevisado,
      objetoAfectadoId: null,
    });
    expect(emitir).not.toHaveBeenCalled();
  });

  it('un fallo al emitir no se propaga a la moderación', async () => {
    emitirEnLote.mockRejectedValueOnce(new Error('sin base'));

    await expect(
      notificarResolucionDeReporte({ ...DATOS, aprobado: false }),
    ).resolves.toBeUndefined();
  });
});
