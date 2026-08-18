import { describe, expect, it } from 'vitest';
import { tieneCodigoSql } from './errores-postgres.js';

/**
 * `drizzle-orm/postgres-js` envuelve el `PostgresError` real (el que trae
 * `.code`) dentro de un `DrizzleQueryError` propio, en `.cause`. Un error
 * simulado como `{ code: '23505' }` a secas —sin envolver— no reproduce lo
 * que la base tira en producción, y ya causó un bug real: la detección de
 * nombre duplicado y de FK bloqueada nunca disparaba contra la base
 * verdadera aunque los tests (mal simulados) pasaran en verde.
 */
describe('tieneCodigoSql', () => {
  it('detecta el código cuando viene envuelto en cause (forma real de Drizzle)', () => {
    const error = Object.assign(new Error('drizzle'), {
      cause: Object.assign(new Error('postgres'), { code: '23505' }),
    });
    expect(tieneCodigoSql(error, '23505')).toBe(true);
  });

  it('detecta el código cuando viene directo en el error (compatibilidad)', () => {
    const error = Object.assign(new Error('postgres'), { code: '23503' });
    expect(tieneCodigoSql(error, '23503')).toBe(true);
  });

  it('no confunde un código distinto', () => {
    const error = Object.assign(new Error('drizzle'), {
      cause: Object.assign(new Error('postgres'), { code: '23514' }),
    });
    expect(tieneCodigoSql(error, '23505')).toBe(false);
  });

  it('no falla con errores sin código ni cause', () => {
    expect(tieneCodigoSql(new Error('cualquier cosa'), '23505')).toBe(false);
    expect(tieneCodigoSql('no es ni un error', '23505')).toBe(false);
    expect(tieneCodigoSql(null, '23505')).toBe(false);
  });
});
