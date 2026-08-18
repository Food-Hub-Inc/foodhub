import { describe, expect, it } from 'vitest';
import type { ItemCarrito } from '@foodhub/shared';
import { rangoDeTiempo } from './carrito.service.js';

/**
 * `rangoDeTiempo` es la unica funcion del carrito que no toca `db`, y es la que
 * concentra la interpretacion mas discutible del modulo: el primer criterio de
 * US-EXP-07 pide mostrar "tiempo estimado de preparacion como referencia (ej.
 * 'Listo en 25-30 min')" sin decir de donde sale ese rango cuando el carrito
 * tiene varios platos. Se toma el minimo y el maximo de los platos, y estas
 * pruebas fijan esa decision para que un cambio futuro sea deliberado.
 *
 * El resto del servicio escribe en la base y se verifica a mano contra
 * foodhub-dev, siguiendo el mismo alcance de pruebas que el modulo de
 * Publicaciones.
 */

function item(
  nombre: string,
  tiempoEstimadoPreparacion: number | null,
): ItemCarrito {
  return {
    id: `00000000-0000-0000-0000-00000000000${nombre.length % 10}`,
    publicacionId: '11111111-1111-1111-1111-111111111111',
    nombre,
    precioUnitario: '1000.00',
    cantidad: 1,
    imagenUrl: null,
    tiempoEstimadoPreparacion,
  };
}

describe('rangoDeTiempo', () => {
  it('devuelve el minimo y el maximo de los platos del carrito', () => {
    const rango = rangoDeTiempo([
      item('milanesas', 30),
      item('ensalada', 25),
      item('flan', 40),
    ]);

    expect(rango).toEqual({
      tiempoEstimadoMinimo: 25,
      tiempoEstimadoMaximo: 40,
    });
  });

  it('hace coincidir minimo y maximo con un solo plato, para que la interfaz muestre un numero', () => {
    const rango = rangoDeTiempo([item('milanesas', 30)]);

    expect(rango).toEqual({
      tiempoEstimadoMinimo: 30,
      tiempoEstimadoMaximo: 30,
    });
  });

  it('ignora los platos que no declaran tiempo, que es opcional en US-PUB-01', () => {
    const rango = rangoDeTiempo([
      item('milanesas', 30),
      item('pan', null),
      item('flan', 45),
    ]);

    expect(rango).toEqual({
      tiempoEstimadoMinimo: 30,
      tiempoEstimadoMaximo: 45,
    });
  });

  it('devuelve null cuando ningun plato declara tiempo', () => {
    // `Math.min()` sin argumentos devuelve Infinity: sin el corte previo, el
    // carrito mostraria "Listo en Infinity min".
    const rango = rangoDeTiempo([item('pan', null), item('gaseosa', null)]);

    expect(rango).toEqual({
      tiempoEstimadoMinimo: null,
      tiempoEstimadoMaximo: null,
    });
  });

  it('devuelve null con el carrito vacio', () => {
    expect(rangoDeTiempo([])).toEqual({
      tiempoEstimadoMinimo: null,
      tiempoEstimadoMaximo: null,
    });
  });
});
