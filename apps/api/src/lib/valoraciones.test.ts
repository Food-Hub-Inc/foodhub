import { describe, expect, it } from 'vitest';
import { aValoracion } from './valoraciones.js';

/**
 * `aValoracion` es una linea de codigo y tiene su propia prueba por un motivo:
 * es la que decide que "sin resenas" y "calificacion cero" no son lo mismo.
 *
 * El bug que evita es silencioso y visible para el usuario. `avg()` sobre cero
 * filas devuelve `null`, y `Number(null)` es 0: sin esta funcion, un plato que
 * nadie califico todavia mostraria una valoracion de 0 -la peor posible- en
 * lugar de "Sin calificaciones aun" (US-EXP-04). Nada en el compilador impide
 * ese error, porque los dos son `number | null`.
 */
describe('aValoracion', () => {
  it('conserva el null de una publicacion sin resenas', () => {
    expect(aValoracion(null)).toBeNull();
  });

  it('convierte el numeric de PostgreSQL a number', () => {
    // Asi lo entrega la base: `numeric` con toda su escala.
    expect(aValoracion('4.5000000000000000')).toBe(4.5);
    expect(aValoracion('5.0000000000000000')).toBe(5);
  });

  it('no confunde el promedio 0 con la ausencia de resenas', () => {
    // El CHECK `resena_calificacion_rango` hace imposible un promedio 0 con
    // datos reales, pero el tipo lo permite y la distincion tiene que valer.
    expect(aValoracion('0')).toBe(0);
    expect(aValoracion('0')).not.toBeNull();
  });
});
