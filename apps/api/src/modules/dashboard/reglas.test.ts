import { describe, expect, it } from 'vitest';
import {
  detalleDeDiasDeSemana,
  detalleDeFranjasHorarias,
  ESTADOS_DISTRIBUCION,
  granularidadDeEvolucion,
  MENSAJES_DASHBOARD,
  PERIODO_POR_DEFECTO,
  porcentajesDeDistribucion,
  porcentajesQueSumanCien,
  rangoDashboardSchema,
  rangoDePeriodo,
  serieDeEvolucion,
  type DistribucionPedidos,
} from '@foodhub/shared';

/**
 * Las reglas del modulo de Dashboard que NO tocan la base.
 *
 * Son las dos que concentran la interpretacion de los criterios -como se traduce
 * cada opcion del selector a un rango concreto (US-DASH-05) y como se reparten
 * los porcentajes del grafico (US-DASH-04)-, asi que se fijan con pruebas para
 * que cambiarlas sea una decision y no un descuido.
 *
 * `rangoDePeriodo` trabaja en la zona horaria LOCAL, que es la del cocinero. Por
 * eso los relojes de estas pruebas se construyen con `new Date(anio, mes, dia)`
 * y nunca con una cadena ISO: asi el resultado no depende de la zona horaria de
 * la maquina que corre el test.
 */

describe('rangoDePeriodo (US-DASH-05)', () => {
  // Miercoles 13 de mayo de 2026, el dia del ejemplo del propio criterio
  // ("1 may - 13 may").
  const miercoles = new Date(2026, 4, 13, 15, 30);

  it('"Este mes" va del primero del mes hasta ahora, no hasta fin de mes', () => {
    const { desde, hasta } = rangoDePeriodo('MES', miercoles);

    expect(desde).toEqual(new Date(2026, 4, 1));
    expect(hasta).toEqual(miercoles);
  });

  it('"Este mes" es el periodo por defecto', () => {
    expect(PERIODO_POR_DEFECTO).toBe('MES');
  });

  it('"Esta semana" arranca el lunes anterior', () => {
    const { desde } = rangoDePeriodo('SEMANA', miercoles);

    expect(desde).toEqual(new Date(2026, 4, 11));
    expect(desde.getDay()).toBe(1);
  });

  it('un domingo sigue perteneciendo a la semana que empezo el lunes', () => {
    // El domingo es el dia 0 de getDay(): sin corregirlo, la semana arrancaria
    // al dia siguiente y el rango quedaria en el futuro.
    const domingo = new Date(2026, 4, 31, 9, 0);
    const { desde } = rangoDePeriodo('SEMANA', domingo);

    expect(desde).toEqual(new Date(2026, 4, 25));
    expect(desde.getTime()).toBeLessThan(domingo.getTime());
  });

  it('"Ultimos 3 meses" es una ventana movil de tres meses', () => {
    const { desde } = rangoDePeriodo('TRIMESTRE', miercoles);

    expect(desde).toEqual(new Date(2026, 1, 13));
  });

  it('recorta el dia cuando el mes destino es mas corto', () => {
    // 31 de mayo menos tres meses cae en un "31 de febrero" que JavaScript
    // desbordaria al 3 de marzo.
    const treintaYUno = new Date(2026, 4, 31, 12, 0);
    const { desde } = rangoDePeriodo('TRIMESTRE', treintaYUno);

    expect(desde).toEqual(new Date(2026, 1, 28));
  });

  it('"Este ano" arranca el primero de enero', () => {
    const { desde } = rangoDePeriodo('ANIO', miercoles);

    expect(desde).toEqual(new Date(2026, 0, 1));
  });

  it('los cuatro periodos empiezan a medianoche y terminan ahora', () => {
    for (const periodo of ['SEMANA', 'MES', 'TRIMESTRE', 'ANIO'] as const) {
      const { desde, hasta } = rangoDePeriodo(periodo, miercoles);

      expect(desde.getHours()).toBe(0);
      expect(desde.getMinutes()).toBe(0);
      expect(desde.getSeconds()).toBe(0);
      expect(desde.getMilliseconds()).toBe(0);
      expect(hasta).toEqual(miercoles);
      expect(desde.getTime()).toBeLessThanOrEqual(hasta.getTime());
    }
  });
});

describe('porcentajesDeDistribucion (US-DASH-04)', () => {
  const distribucion = (
    valores: Partial<DistribucionPedidos>,
  ): DistribucionPedidos => {
    const base = {
      completados: 0,
      rechazadosCocinero: 0,
      canceladosCliente: 0,
      expirados: 0,
      ...valores,
    };
    return {
      ...base,
      total:
        base.completados +
        base.rechazadosCocinero +
        base.canceladosCliente +
        base.expirados,
    };
  };

  const suma = (porcentajes: Record<string, number>) =>
    Object.values(porcentajes).reduce((total, valor) => total + valor, 0);

  it('un solo estado ocupa el 100% y los demas quedan en cero', () => {
    const porcentajes = porcentajesDeDistribucion(
      distribucion({ completados: 7 }),
    );

    expect(porcentajes.completados).toBe(100);
    expect(porcentajes.rechazadosCocinero).toBe(0);
    expect(porcentajes.canceladosCliente).toBe(0);
    expect(porcentajes.expirados).toBe(0);
  });

  it('cierra en 100 aunque los porcentajes exactos no sean enteros', () => {
    // Tres tercios redondeados por separado dan 99.
    const porcentajes = porcentajesDeDistribucion(
      distribucion({
        completados: 1,
        rechazadosCocinero: 1,
        canceladosCliente: 1,
      }),
    );

    expect(suma(porcentajes)).toBe(100);
  });

  it('cierra en 100 con medios exactos', () => {
    const porcentajes = porcentajesDeDistribucion(
      distribucion({
        completados: 5,
        rechazadosCocinero: 1,
        canceladosCliente: 1,
        expirados: 1,
      }),
    );

    expect(suma(porcentajes)).toBe(100);
    expect(porcentajes.completados).toBeGreaterThan(
      porcentajes.rechazadosCocinero,
    );
  });

  it('con el total en cero devuelve todo en cero y no divide por cero', () => {
    const porcentajes = porcentajesDeDistribucion(distribucion({}));

    for (const estado of ESTADOS_DISTRIBUCION) {
      expect(porcentajes[estado]).toBe(0);
    }
  });
});

describe('rangoDashboardSchema (US-DASH-05)', () => {
  const desde = '2026-05-01T03:00:00.000Z';
  const hasta = '2026-05-13T18:30:00.000Z';
  const zonaHoraria = 'America/Argentina/Buenos_Aires';
  const rango = { desde, hasta, zonaHoraria };

  it('acepta un rango en orden', () => {
    expect(rangoDashboardSchema.parse(rango)).toEqual(rango);
  });

  it('acepta un rango de un instante', () => {
    expect(() =>
      rangoDashboardSchema.parse({ ...rango, desde: hasta }),
    ).not.toThrow();
  });

  it('rechaza el rango invertido con el texto del criterio', () => {
    const resultado = rangoDashboardSchema.safeParse({
      ...rango,
      desde: hasta,
      hasta: desde,
    });

    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.message).toBe(
      MENSAJES_DASHBOARD.rangoInvertido,
    );
    expect(resultado.error?.issues[0]?.path).toEqual(['desde']);
  });

  it('no rechaza un "hasta" futuro: el fin del dia local siempre lo es', () => {
    const finDelDia = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();

    expect(() =>
      rangoDashboardSchema.parse({ ...rango, hasta: finDelDia }),
    ).not.toThrow();
  });

  it('exige las dos fechas', () => {
    expect(rangoDashboardSchema.safeParse({ zonaHoraria }).success).toBe(false);
    expect(rangoDashboardSchema.safeParse({ desde, zonaHoraria }).success).toBe(
      false,
    );
    expect(rangoDashboardSchema.safeParse({ hasta, zonaHoraria }).success).toBe(
      false,
    );
  });

  it('exige una zona horaria IANA que Intl reconozca', () => {
    const resultado = rangoDashboardSchema.safeParse({
      desde,
      hasta,
      zonaHoraria: 'Marte/Olimpo',
    });

    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.message).toBe(
      MENSAJES_DASHBOARD.zonaHorariaInvalida,
    );
  });
});

/**
 * Metricas de demanda ampliadas (extension del equipo, 2026-10-20).
 *
 * Las tres reglas que no se pueden verificar mirando el SQL: los cubos fijos,
 * el pico unico y los porcentajes que cierran en 100.
 */
describe('metricas de demanda ampliadas', () => {
  it('completa los siete dias en orden y marca un solo pico', () => {
    const dias = detalleDeDiasDeSemana([
      { diaNumero: 6, cantidad: 5 },
      { diaNumero: 7, cantidad: 5 },
      { diaNumero: 1, cantidad: 2 },
    ]);

    expect(dias.map((dia) => dia.diaNumero)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(dias.map((dia) => dia.cantidad)).toEqual([2, 0, 0, 0, 0, 5, 5]);
    // Sabado y domingo empatan: gana el primero en el orden.
    expect(
      dias.filter((dia) => dia.esPico).map((dia) => dia.diaNumero),
    ).toEqual([6]);
    expect(dias[0]?.nombre).toBe('Lunes');
    expect(dias[0]?.corto).toBe('Lun');
  });

  it('sin pedidos no marca ningun pico', () => {
    const dias = detalleDeDiasDeSemana([]);

    expect(dias).toHaveLength(7);
    expect(dias.some((dia) => dia.esPico)).toBe(false);
    expect(dias.every((dia) => dia.cantidad === 0)).toBe(true);
  });

  it('reparte porcentajes que suman 100 aunque haya tercios', () => {
    const porcentajes = porcentajesQueSumanCien([1, 1, 1, 0]);

    expect(porcentajes.reduce((suma, valor) => suma + valor, 0)).toBe(100);
    expect(porcentajes).toEqual([34, 33, 33, 0]);
  });

  it('con el total en cero todos los porcentajes son cero', () => {
    expect(porcentajesQueSumanCien([0, 0, 0])).toEqual([0, 0, 0]);
    expect(porcentajesQueSumanCien([])).toEqual([]);
  });

  it('completa las seis franjas de cuatro horas y cierra en 100', () => {
    const franjas = detalleDeFranjasHorarias([
      { franja: 'CENA', cantidad: 2 },
      { franja: 'ALMUERZO', cantidad: 1 },
    ]);

    expect(franjas.map((franja) => franja.franja)).toEqual([
      'MANANA',
      'ALMUERZO',
      'TARDE',
      'CENA',
      'NOCHE',
      'MADRUGADA',
    ]);
    expect(franjas.reduce((suma, franja) => suma + franja.porcentaje, 0)).toBe(
      100,
    );
    expect(
      franjas.filter((franja) => franja.esPico).map((franja) => franja.franja),
    ).toEqual(['CENA']);
    expect(franjas[0]?.etiqueta).toBe('Mañana');
    expect(franjas[0]?.horario).toBe('07:00 a 11:00');
  });
});

describe('granularidadDeEvolucion', () => {
  const ahora = new Date(2026, 9, 27, 15, 30);

  it('agrupa por día "Esta semana" y "Este mes"', () => {
    const semana = rangoDePeriodo('SEMANA', ahora);
    const mes = rangoDePeriodo('MES', ahora);

    expect(granularidadDeEvolucion(semana.desde, semana.hasta)).toBe('DIA');
    expect(granularidadDeEvolucion(mes.desde, mes.hasta)).toBe('DIA');
  });

  it('agrupa por semana "Últimos 3 meses" y por mes "Este año"', () => {
    const trimestre = rangoDePeriodo('TRIMESTRE', ahora);
    const anio = rangoDePeriodo('ANIO', ahora);

    expect(granularidadDeEvolucion(trimestre.desde, trimestre.hasta)).toBe(
      'SEMANA',
    );
    expect(granularidadDeEvolucion(anio.desde, anio.hasta)).toBe('MES');
  });

  it('un mes personalizado de 31 días completos sigue siendo diario', () => {
    const desde = new Date(2026, 0, 1);
    const hasta = new Date(2026, 0, 31, 23, 59, 59, 999);

    expect(granularidadDeEvolucion(desde, hasta)).toBe('DIA');
  });
});

describe('serieDeEvolucion', () => {
  it('completa con cero los días sin pedidos y termina hoy', () => {
    const desde = new Date(2026, 9, 26); // lunes
    const hasta = new Date(2026, 9, 28, 10, 0); // miércoles

    const serie = serieDeEvolucion(
      { granularidad: 'DIA', puntos: [{ inicio: '2026-10-27', cantidad: 4 }] },
      desde,
      hasta,
    );

    expect(serie.map((p) => [p.clave, p.cantidad])).toEqual([
      ['2026-10-26', 0],
      ['2026-10-27', 4],
      ['2026-10-28', 0],
    ]);
  });

  it('las semanas arrancan el lunes, aunque el rango empiece otro día', () => {
    const desde = new Date(2026, 6, 29); // miércoles 29/07
    const hasta = new Date(2026, 7, 12, 9, 0); // miércoles 12/08

    const serie = serieDeEvolucion(
      {
        granularidad: 'SEMANA',
        puntos: [{ inicio: '2026-08-03', cantidad: 2 }],
      },
      desde,
      hasta,
    );

    expect(serie.map((p) => [p.clave, p.cantidad])).toEqual([
      ['2026-07-27', 0],
      ['2026-08-03', 2],
      ['2026-08-10', 0],
    ]);
  });

  it('agrupa por mes desde enero hasta el mes en curso', () => {
    const serie = serieDeEvolucion(
      { granularidad: 'MES', puntos: [{ inicio: '2026-02-01', cantidad: 7 }] },
      new Date(2026, 0, 1),
      new Date(2026, 2, 15),
    );

    expect(serie.map((p) => [p.clave, p.cantidad])).toEqual([
      ['2026-01-01', 0],
      ['2026-02-01', 7],
      ['2026-03-01', 0],
    ]);
  });
});
