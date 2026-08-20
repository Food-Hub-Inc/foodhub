import { describe, expect, it } from 'vitest';
import {
  ESTADOS_DISTRIBUCION,
  MENSAJES_DASHBOARD,
  PERIODO_POR_DEFECTO,
  porcentajesDeDistribucion,
  rangoDashboardSchema,
  rangoDePeriodo,
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

  it('acepta un rango en orden', () => {
    expect(rangoDashboardSchema.parse({ desde, hasta })).toEqual({
      desde,
      hasta,
    });
  });

  it('acepta un rango de un instante', () => {
    expect(() =>
      rangoDashboardSchema.parse({ desde: hasta, hasta }),
    ).not.toThrow();
  });

  it('rechaza el rango invertido con el texto del criterio', () => {
    const resultado = rangoDashboardSchema.safeParse({
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
      rangoDashboardSchema.parse({ desde, hasta: finDelDia }),
    ).not.toThrow();
  });

  it('exige las dos fechas', () => {
    expect(rangoDashboardSchema.safeParse({ desde }).success).toBe(false);
    expect(rangoDashboardSchema.safeParse({ hasta }).success).toBe(false);
  });
});
