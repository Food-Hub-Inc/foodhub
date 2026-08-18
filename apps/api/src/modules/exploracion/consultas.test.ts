import { describe, expect, it } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import {
  aCocineroResumen,
  aDistanciaKm,
  aPublicacionResumen,
  coincideConTexto,
  cocineroVisible,
  dentroDeLaZona,
  dentroDelRadio,
  distanciaEnKm,
  publicacionVisible,
  todas,
  type FilaCocinero,
  type FilaPublicacion,
} from './consultas.js';

/**
 * Vocabulario SQL y mapeadores del modulo de Exploracion.
 *
 * Todo lo que se prueba aca es PURO -no toca `db`-, asi que no hace falta el
 * doble de base que si necesita `publicaciones.service.test.ts`. La estrategia
 * es la misma que ese archivo usa para `armarFiltroPublicaciones`: se le pide a
 * `PgDialect` que traduzca el `SQL` a texto y parametros, igual que Drizzle lo
 * hace internamente antes de mandar la consulta al driver, y se afirma sobre ese
 * resultado.
 *
 * Las dos cosas que mas caro cuesta equivocarse en este modulo son el ORDEN de
 * las coordenadas en PostGIS (lng antes que lat) y la UNIDAD de la distancia
 * (metros contra kilometros). Ninguna de las dos falla de forma visible: un
 * cocinero mal ubicado aparece en otro continente y un radio mal convertido
 * devuelve resultados plausibles pero equivocados. Por eso se prueban contra el
 * texto de la consulta y no solo por sus efectos.
 */
const dialecto = new PgDialect();

function aTextoYParametros(consulta: SQL) {
  return dialecto.sqlToQuery(consulta);
}

const CORDOBA = { lat: -32.8895, lng: -68.8458 };

describe('distanciaEnKm', () => {
  it('pasa la longitud antes que la latitud a ST_MakePoint', () => {
    const { sql, params } = aTextoYParametros(distanciaEnKm(CORDOBA));

    expect(sql).toContain('ST_MakePoint');
    // El orden de los parametros ES la prueba: (x, y) = (lng, lat).
    expect(params).toEqual([CORDOBA.lng, CORDOBA.lat]);
  });

  it('mide sobre geography y devuelve kilometros', () => {
    const { sql } = aTextoYParametros(distanciaEnKm(CORDOBA));

    // Sin el cast a geography, ST_Distance devolveria grados de arco.
    expect(sql).toContain('::geography');
    expect(sql).toContain('ST_Distance');
    // Metros a kilometros.
    expect(sql).toContain('/ 1000');
  });

  it('declara la latitud y la longitud en SRID 4326', () => {
    const { sql } = aTextoYParametros(distanciaEnKm(CORDOBA));

    expect(sql).toContain('ST_SetSRID');
    expect(sql).toContain('4326');
  });
});

describe('dentroDelRadio', () => {
  it('convierte los kilometros del filtro a los metros que espera ST_DWithin', () => {
    const { sql, params } = aTextoYParametros(dentroDelRadio(CORDOBA, 2.5));

    expect(sql).toContain('ST_DWithin');
    // 2,5 km -> 2500 m. El ultimo parametro es la distancia.
    expect(params.at(-1)).toBe(2500);
  });

  it('usa ST_DWithin y no una comparacion contra ST_Distance', () => {
    // Es lo unico que puede aprovechar el indice GiST `usuario_ubicacion_gix`.
    const { sql } = aTextoYParametros(dentroDelRadio(CORDOBA, 5));

    expect(sql).toContain('ST_DWithin');
    expect(sql).not.toContain('ST_Distance');
  });
});

describe('dentroDeLaZona', () => {
  it('pasa los limites en el orden (xmin, ymin, xmax, ymax) de ST_MakeEnvelope', () => {
    const zona = { latMin: -33, latMax: -32, lngMin: -69, lngMax: -68 };
    const { sql, params } = aTextoYParametros(dentroDeLaZona(zona));

    expect(sql).toContain('ST_MakeEnvelope');
    expect(params).toEqual([
      zona.lngMin,
      zona.latMin,
      zona.lngMax,
      zona.latMax,
      // El SRID lo agrega la propia expresion, no el llamador.
    ]);
  });

  it('usa el operador de solapamiento de cajas envolventes', () => {
    const { sql } = aTextoYParametros(
      dentroDeLaZona({ latMin: -33, latMax: -32, lngMin: -69, lngMax: -68 }),
    );

    expect(sql).toContain('&&');
  });
});

describe('coincideConTexto', () => {
  it('busca en el nombre del plato y en el de la categoria', () => {
    const { sql } = aTextoYParametros(coincideConTexto('milanesa'));

    expect(sql).toContain('"publicacion"."nombre" ilike');
    expect(sql).toContain('"categoria"."nombre" ilike');
    expect(sql).toContain(' or ');
  });

  it('escapa los comodines del texto ingresado', () => {
    // Sin escapar, buscar "100%" convertiria ese signo en comodin y traeria
    // cualquier plato que empiece con "100".
    const { params } = aTextoYParametros(coincideConTexto('100%_off'));

    expect(params).toEqual(['%100\\%\\_off%', '%100\\%\\_off%']);
  });

  it('envuelve el patron en comodines para que la coincidencia sea parcial', () => {
    const { params } = aTextoYParametros(coincideConTexto('lasa'));

    expect(params[0]).toBe('%lasa%');
  });
});

describe('cocineroVisible', () => {
  it('exige rol, cuenta activa y ubicacion declarada', () => {
    const { sql, params } = aTextoYParametros(todas(cocineroVisible()));

    expect(params).toContain('COCINERO');
    expect(params).toContain('ACTIVA');
    expect(sql).toContain('is not null');
  });
});

describe('publicacionVisible', () => {
  it('agrega la baja logica de la publicacion a las condiciones del cocinero', () => {
    const { sql, params } = aTextoYParametros(todas(publicacionVisible()));

    expect(sql).toContain('"publicacion"."activo"');
    expect(params).toContain(true);
    // Y sigue arrastrando las tres del cocinero.
    expect(params).toContain('COCINERO');
    expect(params).toContain('ACTIVA');
  });
});

describe('aDistanciaKm', () => {
  it('conserva el null en lugar de convertirlo en 0', () => {
    // Un 0 afirmaria que el cocinero esta a la vuelta de la esquina.
    expect(aDistanciaKm(null)).toBeNull();
  });

  it('redondea a un decimal, porque el criterio pide "distancia aproximada"', () => {
    expect(aDistanciaKm(2.7382910473)).toBe(2.7);
    expect(aDistanciaKm(2.75)).toBe(2.8);
    expect(aDistanciaKm(0.04)).toBe(0);
  });
});

describe('mapeadores de fila', () => {
  const filaCocinero: FilaCocinero = {
    cocineroId: '11111111-1111-1111-1111-111111111111',
    cocineroNombre: 'Marta',
    cocineroApellido: 'Gómez',
    cocineroFotoPerfilUrl: null,
  };

  const filaPublicacion: FilaPublicacion = {
    id: '22222222-2222-2222-2222-222222222222',
    nombre: 'Milanesas napolitanas',
    precio: '4500.00',
    imagenUrl: null,
    estadoPublicacion: 'ULTIMAS_UNIDADES',
    categoriaId: '33333333-3333-3333-3333-333333333333',
    categoriaNombre: 'Platos principales',
    categoriaImagenPredeterminadaUrl:
      'https://cdn.foodhub.test/principales.jpg',
  };

  it('separa la identidad del cocinero de las columnas planas de la consulta', () => {
    expect(aCocineroResumen(filaCocinero)).toEqual({
      id: filaCocinero.cocineroId,
      nombre: 'Marta',
      apellido: 'Gómez',
      fotoPerfilUrl: null,
    });
  });

  it('anida la categoria completa, para que la tarjeta resuelva el fallback de imagen', () => {
    const resumen = aPublicacionResumen(filaPublicacion);

    expect(resumen.categoria).toEqual({
      id: filaPublicacion.categoriaId,
      nombre: 'Platos principales',
      imagenPredeterminadaUrl: 'https://cdn.foodhub.test/principales.jpg',
    });
  });

  it('deja el precio como string, sin convertirlo a number', () => {
    // La columna es `numeric`: convertirla reintroduce el error de punto
    // flotante que esa eleccion evita.
    const resumen = aPublicacionResumen(filaPublicacion);

    expect(resumen.precio).toBe('4500.00');
    expect(typeof resumen.precio).toBe('string');
  });
});
