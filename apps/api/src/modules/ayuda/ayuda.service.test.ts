import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * US-AYU-05 - Reglas del servicio de gestion de ayuda que no dependen de la
 * base: la traduccion del rol destinatario y la baja logica.
 *
 * La base se reemplaza por un doble para simular el catalogo sin sembrar y la
 * ausencia de filas al deshabilitar. El resto (persistencia real, fechas) se
 * verifica contra `foodhub-dev`.
 */
const { buscarRol, actualizar } = vi.hoisted(() => ({
  buscarRol: vi.fn(),
  actualizar: vi.fn(),
}));

vi.mock('../../lib/db.js', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ limit: buscarRol })),
        // `obtenerCapitulo` une con `rol_destino` antes de filtrar.
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => ({ limit: buscarRol })),
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({ returning: actualizar })),
      })),
    })),
  },
}));

const {
  crearCapitulo,
  establecerHabilitacionCapitulo,
  establecerHabilitacionFaq,
  obtenerCapitulo,
} = await import('./ayuda.service.js');

const ADMIN_ID = '11111111-1111-1111-1111-111111111111';
const CAPITULO_ID = '22222222-2222-2222-2222-222222222222';
const FAQ_ID = '33333333-3333-3333-3333-333333333333';

describe('crearCapitulo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('falla con un error de entorno si `rol_destino` no está sembrado', async () => {
    buscarRol.mockResolvedValue([]);

    await expect(
      crearCapitulo({
        datos: {
          titulo: 'Primeros pasos',
          rolDestino: 'AMBOS',
          secciones: [{ titulo: 'Crear cuenta', contenidoHtml: '<p>Hola</p>' }],
        },
        administradorId: ADMIN_ID,
        ipOrigen: null,
      }),
    ).rejects.toThrow(/Falta sembrar rol_destino/);
  });
});

describe('establecerHabilitacionCapitulo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('responde 404 cuando el capítulo no existe', async () => {
    actualizar.mockResolvedValue([]);

    await expect(
      establecerHabilitacionCapitulo({
        capituloId: CAPITULO_ID,
        activo: false,
        administradorId: ADMIN_ID,
        ipOrigen: null,
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe('establecerHabilitacionFaq', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('responde 404 cuando la pregunta no existe', async () => {
    actualizar.mockResolvedValue([]);

    await expect(
      establecerHabilitacionFaq({
        faqId: FAQ_ID,
        activo: false,
        administradorId: ADMIN_ID,
        ipOrigen: null,
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe('obtenerCapitulo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('responde 404 cuando el capítulo no existe', async () => {
    buscarRol.mockResolvedValue([]);

    await expect(obtenerCapitulo(CAPITULO_ID)).rejects.toMatchObject({
      status: 404,
    });
  });
});
