import { describe, expect, it } from 'vitest';
import {
  aClienteRecurrente,
  aDistribucion,
  aPlatoMasPedido,
  aResumen,
  type FilaClienteRecurrente,
  type FilaDistribucion,
  type FilaPlato,
} from './consultas.js';

/**
 * El mapeo de fila cruda a contrato publico del modulo de Dashboard.
 *
 * Es donde vive la interpretacion de tres criterios que no se pueden verificar
 * mirando el SQL: la traduccion de dos estados internos a los cuatro rotulos de
 * US-DASH-04, la baja logica que se muestra como "(eliminado)" (US-DASH-02) y el
 * borrado de la identidad de una cuenta eliminada (US-DASH-03).
 */

const platoBase: FilaPlato = {
  publicacionId: '11111111-1111-4111-8111-111111111111',
  nombre: 'Milanesa napolitana',
  imagenUrl: 'https://ejemplo/mila.jpg',
  precioActual: '3100.00',
  activo: true,
  categoriaId: '22222222-2222-4222-8222-222222222222',
  categoriaNombre: 'Platos principales',
  categoriaImagenUrl: null,
  vecesPedido: '12',
};

const clienteBase: FilaClienteRecurrente = {
  clienteId: '33333333-3333-4333-8333-333333333333',
  nombre: 'Ana',
  apellido: 'Batalla',
  fotoPerfilUrl: 'https://ejemplo/ana.jpg',
  cuentaEliminada: false,
  cantidadPedidos: 4,
  montoTotal: '12400.00',
};

describe('aResumen (US-DASH-01)', () => {
  it('distingue "sin resenas" de "promedio cero"', () => {
    const resumen = aResumen({
      pedidosTotales: 3,
      ventasAcumuladas: '0',
      promedioValoracion: null,
      cantidadResenas: 0,
    });

    expect(resumen.valoracionPromedio).toBeNull();
    expect(resumen.cantidadResenas).toBe(0);
  });

  it('convierte el promedio a numero cuando hay resenas', () => {
    const resumen = aResumen({
      pedidosTotales: 12,
      ventasAcumuladas: '48200.00',
      promedioValoracion: '4.6000000000000000',
      cantidadResenas: 5,
    });

    expect(resumen.valoracionPromedio).toBeCloseTo(4.6);
    expect(resumen.ventasAcumuladas).toBe('48200.00');
  });

  it('no toca el importe: se mantiene como texto', () => {
    const resumen = aResumen({
      pedidosTotales: 1,
      ventasAcumuladas: '10.10',
      promedioValoracion: null,
      cantidadResenas: 0,
    });

    expect(resumen.ventasAcumuladas).toBe('10.10');
  });
});

describe('aPlatoMasPedido (US-DASH-02)', () => {
  it('convierte las unidades, que Postgres devuelve como texto', () => {
    expect(aPlatoMasPedido(platoBase).vecesPedido).toBe(12);
  });

  it('marca como eliminado el plato dado de baja, sin sacarlo del ranking', () => {
    const plato = aPlatoMasPedido({ ...platoBase, activo: false });

    expect(plato.eliminado).toBe(true);
    expect(plato.nombre).toBe('Milanesa napolitana');
    expect(plato.vecesPedido).toBe(12);
  });

  it('lleva la categoria completa, con su imagen de reemplazo', () => {
    const plato = aPlatoMasPedido({
      ...platoBase,
      imagenUrl: null,
      categoriaImagenUrl: 'https://ejemplo/categoria.jpg',
    });

    expect(plato.imagenUrl).toBeNull();
    expect(plato.categoria).toEqual({
      id: platoBase.categoriaId,
      nombre: 'Platos principales',
      imagenPredeterminadaUrl: 'https://ejemplo/categoria.jpg',
    });
  });
});

describe('aClienteRecurrente (US-DASH-03)', () => {
  it('conserva la identidad de una cuenta activa', () => {
    const cliente = aClienteRecurrente(clienteBase);

    expect(cliente.nombre).toBe('Ana');
    expect(cliente.apellido).toBe('Batalla');
    expect(cliente.fotoPerfilUrl).toBe('https://ejemplo/ana.jpg');
    expect(cliente.eliminado).toBe(false);
  });

  it('borra la identidad de una cuenta eliminada pero conserva la metrica', () => {
    const cliente = aClienteRecurrente({
      ...clienteBase,
      cuentaEliminada: true,
    });

    expect(cliente.nombre).toBeNull();
    expect(cliente.apellido).toBeNull();
    expect(cliente.fotoPerfilUrl).toBeNull();
    expect(cliente.eliminado).toBe(true);
    expect(cliente.cantidadPedidos).toBe(4);
    expect(cliente.montoTotal).toBe('12400.00');
  });
});

describe('aDistribucion (US-DASH-04)', () => {
  it('abre RECHAZADO en los tres rotulos que pide el criterio', () => {
    const filas: FilaDistribucion[] = [
      { estado: 'COMPLETADO', origenRechazo: null, cantidad: 5 },
      { estado: 'RECHAZADO', origenRechazo: 'COCINERO', cantidad: 2 },
      { estado: 'RECHAZADO', origenRechazo: 'CLIENTE', cantidad: 3 },
      { estado: 'RECHAZADO', origenRechazo: 'SISTEMA', cantidad: 1 },
    ];

    expect(aDistribucion(filas)).toEqual({
      completados: 5,
      rechazadosCocinero: 2,
      canceladosCliente: 3,
      expirados: 1,
      total: 11,
    });
  });

  it('deja fuera los pedidos todavia abiertos, tambien del total', () => {
    const filas: FilaDistribucion[] = [
      { estado: 'CREADO', origenRechazo: null, cantidad: 4 },
      { estado: 'ACEPTADO', origenRechazo: null, cantidad: 2 },
      { estado: 'LISTO', origenRechazo: null, cantidad: 1 },
      { estado: 'COMPLETADO', origenRechazo: null, cantidad: 3 },
    ];

    expect(aDistribucion(filas)).toEqual({
      completados: 3,
      rechazadosCocinero: 0,
      canceladosCliente: 0,
      expirados: 0,
      total: 3,
    });
  });

  it('descarta un RECHAZADO sin origen en vez de asumirle uno', () => {
    const filas: FilaDistribucion[] = [
      { estado: 'RECHAZADO', origenRechazo: null, cantidad: 9 },
      { estado: 'COMPLETADO', origenRechazo: null, cantidad: 1 },
    ];

    expect(aDistribucion(filas)).toEqual({
      completados: 1,
      rechazadosCocinero: 0,
      canceladosCliente: 0,
      expirados: 0,
      total: 1,
    });
  });

  it('sin filas devuelve todo en cero', () => {
    expect(aDistribucion([])).toEqual({
      completados: 0,
      rechazadosCocinero: 0,
      canceladosCliente: 0,
      expirados: 0,
      total: 0,
    });
  });
});
