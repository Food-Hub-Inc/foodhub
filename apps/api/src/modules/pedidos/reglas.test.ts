import { describe, expect, it } from 'vitest';
import {
  ESTADO_PEDIDO,
  ESTADOS_POR_PESTANA_CLIENTE,
  ESTADOS_POR_PESTANA_COCINERO,
  MARGEN_RANGO_ESTIMADO_MINUTOS,
  TIEMPOS_ESTIMADOS_PREPARACION,
  aceptarPedidoSchema,
  contarPalabras,
  motivoDeRechazoSuficiente,
  rangoHorarioEstimado,
  rechazarPedidoSchema,
  transicionValida,
} from '@foodhub/shared';

/**
 * Las reglas del modulo de Pedidos que NO tocan la base.
 *
 * Son las cuatro que concentran la interpretacion de los criterios de
 * aceptacion -la maquina de estados, el minimo de cinco palabras del rechazo, el
 * rango horario estimado y el reparto de estados por pestana-, asi que se fijan
 * con pruebas para que cambiarlas sea una decision y no un descuido. El resto
 * del modulo escribe en la base y se verifica a mano contra foodhub-dev, mismo
 * alcance que Exploracion y Publicaciones.
 */

describe('transicionValida (maquina de estados)', () => {
  it('permite el camino feliz completo', () => {
    expect(transicionValida('CREADO', 'ACEPTADO')).toBe(true);
    expect(transicionValida('ACEPTADO', 'LISTO')).toBe(true);
    expect(transicionValida('LISTO', 'COMPLETADO')).toBe(true);
  });

  it('permite rechazar desde CREADO y desde ACEPTADO, como el ciclo de vida del diagrama', () => {
    expect(transicionValida('CREADO', 'RECHAZADO')).toBe(true);
    expect(transicionValida('ACEPTADO', 'RECHAZADO')).toBe(true);
  });

  it('no permite saltear estados: CREADO no llega a COMPLETADO', () => {
    expect(transicionValida('CREADO', 'COMPLETADO')).toBe(false);
    expect(transicionValida('CREADO', 'LISTO')).toBe(false);
  });

  it('no permite volver atras', () => {
    expect(transicionValida('ACEPTADO', 'CREADO')).toBe(false);
    expect(transicionValida('COMPLETADO', 'LISTO')).toBe(false);
  });

  it('deja RECHAZADO y COMPLETADO como estados terminales', () => {
    for (const destino of ESTADO_PEDIDO) {
      expect(transicionValida('RECHAZADO', destino)).toBe(false);
      expect(transicionValida('COMPLETADO', destino)).toBe(false);
    }
  });
});

describe('contarPalabras', () => {
  it('cuenta palabras separadas por cualquier cantidad de espacios', () => {
    expect(contarPalabras('no  tengo   ingredientes hoy')).toBe(4);
  });

  it('no cuenta el espacio en blanco como palabra', () => {
    expect(contarPalabras('   ')).toBe(0);
    expect(contarPalabras('')).toBe(0);
  });

  it('cuenta los saltos de linea como separador', () => {
    expect(contarPalabras('se me\nrompio el horno')).toBe(5);
  });
});

describe('motivoDeRechazoSuficiente (US-PED-04)', () => {
  it('alcanza con un motivo rapido del catalogo, sin texto', () => {
    expect(
      motivoDeRechazoSuficiente({
        motivoCancelacionId: '11111111-1111-1111-1111-111111111111',
      }),
    ).toBe(true);
  });

  it('alcanza con cinco palabras de texto libre, sin motivo rapido', () => {
    expect(
      motivoDeRechazoSuficiente({
        motivoTexto: 'no me quedan mas ingredientes',
      }),
    ).toBe(true);
  });

  it('rechaza cuatro palabras: el criterio pide al menos cinco', () => {
    expect(
      motivoDeRechazoSuficiente({ motivoTexto: 'no tengo mas ingredientes' }),
    ).toBe(false);
  });

  it('rechaza el pedido sin motivo alguno', () => {
    expect(motivoDeRechazoSuficiente({})).toBe(false);
  });

  it('el schema traduce esa regla a un error de validacion', () => {
    expect(rechazarPedidoSchema.safeParse({}).success).toBe(false);
    expect(
      rechazarPedidoSchema.safeParse({ motivoTexto: 'se me rompio el horno' })
        .success,
    ).toBe(true);
  });
});

describe('aceptarPedidoSchema (US-PED-03)', () => {
  it('acepta las opciones del selector de PAN-PED-04.4', () => {
    for (const minutos of TIEMPOS_ESTIMADOS_PREPARACION) {
      expect(
        aceptarPedidoSchema.safeParse({
          tiempoEstimadoPreparacionMin: minutos,
        }).success,
      ).toBe(true);
    }
  });

  it('rechaza aceptar sin tiempo, que es el quinto criterio de la historia', () => {
    expect(aceptarPedidoSchema.safeParse({}).success).toBe(false);
  });

  it('rechaza un tiempo que no esta entre las opciones', () => {
    expect(
      aceptarPedidoSchema.safeParse({ tiempoEstimadoPreparacionMin: 17 })
        .success,
    ).toBe(false);
  });
});

describe('rangoHorarioEstimado (US-PED-02)', () => {
  it('termina en la hora prometida y empieza el margen antes', () => {
    // El ejemplo de PAN-PED-03: aceptado 13:45, 30 minutos -> 14:05 - 14:15.
    const aceptacion = new Date('2026-08-19T13:45:00.000Z');
    const rango = rangoHorarioEstimado(aceptacion, 30);

    expect(rango?.hasta.toISOString()).toBe('2026-08-19T14:15:00.000Z');
    expect(rango?.desde.toISOString()).toBe('2026-08-19T14:05:00.000Z');
  });

  it('el ancho del rango es siempre el margen configurado', () => {
    const rango = rangoHorarioEstimado(
      new Date('2026-08-19T09:00:00.000Z'),
      60,
    );
    const anchoEnMinutos =
      ((rango?.hasta.getTime() ?? 0) - (rango?.desde.getTime() ?? 0)) / 60_000;

    expect(anchoEnMinutos).toBe(MARGEN_RANGO_ESTIMADO_MINUTOS);
  });

  it('no estima nada si el pedido todavia no fue aceptado', () => {
    expect(rangoHorarioEstimado(null, 30)).toBeNull();
  });

  it('no estima nada si no hay tiempo comprometido', () => {
    expect(rangoHorarioEstimado(new Date(), null)).toBeNull();
  });
});

describe('reparto de estados por pestana', () => {
  it('la pestana del cliente "En curso" agrupa los tres estados activos', () => {
    expect(ESTADOS_POR_PESTANA_CLIENTE.EN_CURSO).toEqual([
      'CREADO',
      'ACEPTADO',
      'LISTO',
    ]);
  });

  it('cada estado del sistema cae en exactamente una pestana de cada rol', () => {
    const delCliente = Object.values(ESTADOS_POR_PESTANA_CLIENTE).flat();
    const delCocinero = Object.values(ESTADOS_POR_PESTANA_COCINERO).flat();

    for (const estado of ESTADO_PEDIDO) {
      expect(delCliente.filter((valor) => valor === estado)).toHaveLength(1);
      expect(delCocinero.filter((valor) => valor === estado)).toHaveLength(1);
    }
  });
});
