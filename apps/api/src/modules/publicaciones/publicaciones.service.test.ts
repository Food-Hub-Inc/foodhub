import { describe, expect, it } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import type { FiltrosPublicacion } from '@foodhub/shared';
import { armarFiltroPublicaciones } from './publicaciones.service.js';

/**
 * US-PUB-05 - `armarFiltroPublicaciones`.
 *
 * Es una funcion pura (arma un objeto `SQL`, no ejecuta nada), asi que se
 * prueba sin mockear `db`: se le pide a `PgDialect` que traduzca el `SQL` a
 * texto y parametros, igual que Drizzle lo hace internamente antes de mandar
 * la consulta al driver, y se afirma sobre ese resultado.
 */
const dialecto = new PgDialect();

function aTextoYParametros(filtro: SQL) {
  return dialecto.sqlToQuery(filtro);
}

const filtrosBase: FiltrosPublicacion = {
  orden: 'RECIENTES',
  pagina: 1,
};

const COCINERO_ID = '11111111-1111-1111-1111-111111111111';

describe('armarFiltroPublicaciones', () => {
  it('siempre exige el cocinero dueño y la publicación activa', () => {
    const { sql, params } = aTextoYParametros(
      armarFiltroPublicaciones(COCINERO_ID, filtrosBase),
    );

    expect(sql).toContain('"publicacion"."cocinero_id"');
    expect(sql).toContain('"publicacion"."activo"');
    expect(params).toEqual([COCINERO_ID, true]);
  });

  it('agrega la búsqueda por nombre insensible a mayúsculas', () => {
    const { sql, params } = aTextoYParametros(
      armarFiltroPublicaciones(COCINERO_ID, {
        ...filtrosBase,
        busqueda: 'Milanesa',
      }),
    );

    expect(sql.toLowerCase()).toContain('ilike');
    expect(params).toContain('%Milanesa%');
  });

  it('escapa los comodines de LIKE presentes en la búsqueda', () => {
    const { params } = aTextoYParametros(
      armarFiltroPublicaciones(COCINERO_ID, {
        ...filtrosBase,
        busqueda: '50%_off',
      }),
    );

    expect(params).toContain('%50\\%\\_off%');
  });

  it('combina categoría, estados y rango de precio', () => {
    const CATEGORIA_1 = '22222222-2222-2222-2222-222222222222';
    const CATEGORIA_2 = '33333333-3333-3333-3333-333333333333';

    const { sql, params } = aTextoYParametros(
      armarFiltroPublicaciones(COCINERO_ID, {
        ...filtrosBase,
        categoriaIds: [CATEGORIA_1, CATEGORIA_2],
        estados: ['DISPONIBLE', 'ULTIMAS_UNIDADES'],
        precioMinimo: 100,
        precioMaximo: 500,
      }),
    );

    expect(sql).toContain('"publicacion"."categoria_id"');
    expect(sql).toContain('"publicacion"."estado_publicacion"');
    expect(sql).toContain('"publicacion"."precio" >=');
    expect(sql).toContain('"publicacion"."precio" <=');
    expect(params).toEqual(
      expect.arrayContaining([
        COCINERO_ID,
        true,
        CATEGORIA_1,
        CATEGORIA_2,
        'DISPONIBLE',
        'ULTIMAS_UNIDADES',
        '100',
        '500',
      ]),
    );
  });

  it('ignora categoría y estados cuando llegan como lista vacía', () => {
    const { sql } = aTextoYParametros(
      armarFiltroPublicaciones(COCINERO_ID, {
        ...filtrosBase,
        categoriaIds: [],
        estados: [],
      }),
    );

    expect(sql).not.toContain('categoria_id');
    expect(sql).not.toContain('estado_publicacion');
  });
});
