import { describe, expect, it } from 'vitest';
import {
  agruparSerieDePedidos,
  consultaMetricasSchema,
  variacionPorcentual,
} from '@foodhub/shared';

/** Reglas puras de US-ADM-05 que viven en `@foodhub/shared`. */

describe('variacionPorcentual', () => {
  it('calcula la variación con un decimal', () => {
    expect(variacionPorcentual(110, 100)).toBe(10);
    expect(variacionPorcentual(90, 100)).toBe(-10);
    expect(variacionPorcentual(1, 3)).toBe(-66.7);
  });

  it('devuelve null sin base contra la cual comparar', () => {
    expect(variacionPorcentual(5, 0)).toBeNull();
  });
});

describe('agruparSerieDePedidos', () => {
  const serie = [
    { fecha: '2026-09-01', pedidos: 3, completados: 2 },
    { fecha: '2026-09-09', pedidos: 4, completados: 1 },
  ];

  it('el mes se agrupa por semanas de siete días desde el día 1', () => {
    const tramos = agruparSerieDePedidos(
      serie,
      'MES',
      new Date(2026, 8, 1),
      new Date(2026, 8, 29, 12),
    );

    expect(tramos.map((t) => t.etiqueta)).toEqual([
      'Sem 1',
      'Sem 2',
      'Sem 3',
      'Sem 4',
      'Sem 5',
    ]);
    expect(tramos[0]).toMatchObject({ pedidos: 3, completados: 2 });
    expect(tramos[1]).toMatchObject({ pedidos: 4, completados: 1 });
    expect(tramos[2]).toMatchObject({ pedidos: 0, completados: 0 });
  });

  it('la semana va por día y completa en cero los días sin pedidos', () => {
    const tramos = agruparSerieDePedidos(
      serie,
      'SEMANA',
      new Date(2026, 8, 7),
      new Date(2026, 8, 9, 18),
    );

    expect(tramos).toEqual([
      { etiqueta: '07/09', pedidos: 0, completados: 0 },
      { etiqueta: '08/09', pedidos: 0, completados: 0 },
      { etiqueta: '09/09', pedidos: 4, completados: 1 },
    ]);
  });

  it('el año va por mes', () => {
    const tramos = agruparSerieDePedidos(
      serie,
      'ANIO',
      new Date(2026, 0, 1),
      new Date(2026, 8, 29),
    );

    expect(tramos).toHaveLength(9);
    expect(tramos[8]).toEqual({ etiqueta: 'Sep', pedidos: 7, completados: 3 });
  });

  it('el personalizado largo pasa a meses', () => {
    const tramos = agruparSerieDePedidos(
      [],
      'PERSONALIZADO',
      new Date(2025, 9, 1),
      new Date(2026, 8, 1),
    );

    expect(tramos[0]?.etiqueta).toBe('Oct');
    expect(tramos).toHaveLength(12);
  });
});

describe('consultaMetricasSchema', () => {
  const base = {
    desde: '2026-09-01T03:00:00.000Z',
    hasta: '2026-09-29T20:00:00.000Z',
    zonaHoraria: 'America/Argentina/Mendoza',
  };

  it('acepta un rango válido', () => {
    expect(consultaMetricasSchema.safeParse(base).success).toBe(true);
  });

  it('rechaza "Desde" posterior a "Hasta"', () => {
    expect(
      consultaMetricasSchema.safeParse({
        ...base,
        desde: base.hasta,
        hasta: base.desde,
      }).success,
    ).toBe(false);
  });

  it('rechaza una zona horaria inexistente', () => {
    expect(
      consultaMetricasSchema.safeParse({ ...base, zonaHoraria: 'Marte/Olimpo' })
        .success,
    ).toBe(false);
  });
});
