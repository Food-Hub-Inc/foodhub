import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PARAMETROS_BUSQUEDA_DEFAULT,
  PARAMETROS_INSTITUCIONALES_DEFAULT,
} from '@foodhub/shared';

/**
 * US-CFG-03 - Lectura (parseo de las filas clave/valor a los tipos del
 * contrato) y escritura (serialización + "restaurar valores por defecto").
 */

const { aplicarSelect, aplicarUpdateWhere } = vi.hoisted(() => ({
  aplicarSelect: vi.fn(),
  aplicarUpdateWhere: vi.fn(),
}));

vi.mock('../../lib/db.js', () => ({
  db: {
    select: vi.fn(() => ({ from: aplicarSelect })),
    transaction: vi.fn(async (callback: (tx: unknown) => Promise<void>) => {
      const tx = {
        update: vi.fn(() => ({
          set: vi.fn(() => ({ where: aplicarUpdateWhere })),
        })),
      };
      await callback(tx);
    }),
  },
}));

const {
  obtenerParametrosSistema,
  actualizarParametrosBusqueda,
  restaurarParametrosBusqueda,
  restaurarParametrosInstitucionales,
} = await import('./parametrosSistema.service.js');

const ADMIN_ID = '11111111-1111-1111-1111-111111111111';

/** Las 11 filas que siembran las migraciones 0004 y 0011, con valores de ejemplo. */
const FILAS_SEMBRADAS = [
  { clave: 'radio_busqueda_defecto_km', valor: '5' },
  { clave: 'distancia_maxima_filtro_km', valor: '20' },
  { clave: 'feed_publicaciones_por_pagina', valor: '20' },
  { clave: 'pedido_tiempo_cancelacion_cliente_minutos', valor: '5' },
  { clave: 'pedido_expiracion_minutos', valor: '15' },
  { clave: 'resena_minimo_para_promedio', valor: '3' },
  { clave: 'resena_limite_dias_para_resenar', valor: '14' },
  { clave: 'plataforma_nombre', valor: 'FoodHub' },
  { clave: 'plataforma_logo_url', valor: '' },
  { clave: 'plataforma_correo_soporte', valor: 'soporte@foodhub.com' },
  {
    clave: 'plataforma_horario_atencion_soporte',
    valor: 'Lunes a viernes de 9 a 18 hs',
  },
];

describe('obtenerParametrosSistema', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parsea las filas clave/valor a los cuatro grupos del contrato', async () => {
    aplicarSelect.mockResolvedValue(FILAS_SEMBRADAS);

    const parametros = await obtenerParametrosSistema();

    expect(parametros).toEqual({
      busqueda: {
        radioBusquedaDefectoKm: 5,
        distanciaMaximaFiltroKm: 20,
        feedPublicacionesPorPagina: 20,
      },
      pedidos: {
        tiempoCancelacionClienteMinutos: 5,
        tiempoExpiracionCocineroMinutos: 15,
      },
      resenas: { minimoResenasParaPromedio: 3, limiteDiasParaResenar: 14 },
      institucional: {
        nombrePlataforma: 'FoodHub',
        logoPlataformaUrl: null,
        correoSoporte: 'soporte@foodhub.com',
        horarioAtencionSoporte: 'Lunes a viernes de 9 a 18 hs',
      },
    });
  });

  it('trata el logo vacío ("" en la base) como ausente (null)', async () => {
    aplicarSelect.mockResolvedValue(
      FILAS_SEMBRADAS.map((fila) =>
        fila.clave === 'plataforma_logo_url'
          ? { ...fila, valor: 'https://cdn.example.com/logo.png' }
          : fila,
      ),
    );

    const parametros = await obtenerParametrosSistema();

    expect(parametros.institucional.logoPlataformaUrl).toBe(
      'https://cdn.example.com/logo.png',
    );
  });

  it('lanza un error claro si falta sembrar una fila (ambiente sin migrar)', async () => {
    aplicarSelect.mockResolvedValue(
      FILAS_SEMBRADAS.filter((f) => f.clave !== 'plataforma_nombre'),
    );

    await expect(obtenerParametrosSistema()).rejects.toThrow(
      /plataforma_nombre.*pnpm db:migrate/,
    );
  });
});

describe('actualizarParametrosBusqueda', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    aplicarUpdateWhere.mockResolvedValue(undefined);
  });

  it('escribe las tres claves de la sección en una única transacción', async () => {
    const datos = {
      radioBusquedaDefectoKm: 10,
      distanciaMaximaFiltroKm: 30,
      feedPublicacionesPorPagina: 25,
    };

    const resultado = await actualizarParametrosBusqueda({
      datos,
      administradorId: ADMIN_ID,
      ipOrigen: null,
    });

    expect(resultado).toEqual(datos);
    expect(aplicarUpdateWhere).toHaveBeenCalledTimes(3);
  });
});

describe('restaurarParametrosBusqueda', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    aplicarUpdateWhere.mockResolvedValue(undefined);
  });

  it('devuelve exactamente los valores de fábrica', async () => {
    const restaurado = await restaurarParametrosBusqueda({
      administradorId: ADMIN_ID,
      ipOrigen: null,
    });

    expect(restaurado).toEqual(PARAMETROS_BUSQUEDA_DEFAULT);
  });
});

describe('restaurarParametrosInstitucionales', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    aplicarUpdateWhere.mockResolvedValue(undefined);
  });

  it('restaura el logo a ausente (null), no a cadena vacía', async () => {
    const restaurado = await restaurarParametrosInstitucionales({
      administradorId: ADMIN_ID,
      ipOrigen: null,
    });

    expect(restaurado).toEqual(PARAMETROS_INSTITUCIONALES_DEFAULT);
    expect(restaurado.logoPlataformaUrl).toBeNull();
  });
});
