import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import {
  MENSAJES_PUBLICACION,
  type CrearPublicacionInput,
  type EditarPublicacionInput,
  type FiltrosPublicacion,
} from '@foodhub/shared';
import { AppError } from '../../middleware/error.middleware.js';

/**
 * `cambiarDisponibilidad` (US-PUB-04), `editarPublicacion` (US-PUB-02) y
 * `eliminarPublicacion` (US-PUB-03) SI tocan `db`, a diferencia de las
 * funciones puras de arriba: por eso, y solo para esos `describe`, se
 * reemplaza `db` por un doble - mismo patron `vi.hoisted` + `vi.mock` que
 * `usuarios.service.test.ts`. El resto de este archivo importa el modulo real
 * sin verse afectado: las funciones puras nunca llaman a `db`.
 *
 * `dondeUpdate` es la propia funcion `.where()` del UPDATE, expuesta con
 * nombre propio (no solo `.returning`) porque `eliminarPublicacion` NO llama
 * a `.returning()` -a diferencia de `cambiarDisponibilidad`/
 * `editarPublicacion`- asi que es el unico punto en comun desde el que se
 * puede afirmar "el UPDATE se ejecuto" o "no llego a ejecutarse" para las
 * tres funciones a la vez.
 *
 * `resolverSelect` es el `.limit()` que cierra tanto el SELECT simple de
 * ownership (`.from().where().limit()`) como el SELECT con join de pedidos
 * activos (`.from().innerJoin().where().limit()`): `eliminarPublicacion` los
 * ejecuta en secuencia estricta (nunca en paralelo), asi que encolar sus
 * resultados con `mockResolvedValueOnce` alcanza sin tener que distinguir
 * cual de los dos SELECT esta resolviendo.
 */
const { aplicarActualizacion, dondeUpdate, resolverSelect } = vi.hoisted(() => {
  const aplicarActualizacion = vi.fn();
  return {
    aplicarActualizacion,
    dondeUpdate: vi.fn(() => ({ returning: aplicarActualizacion })),
    resolverSelect: vi.fn(),
  };
});

vi.mock('../../lib/db.js', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ limit: resolverSelect })),
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => ({ limit: resolverSelect })),
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({ where: dondeUpdate })),
    })),
  },
}));

const {
  armarFiltroPublicaciones,
  cambiarDisponibilidad,
  cambiosDeEdicion,
  editarPublicacion,
  eliminarPublicacion,
  limpiezaDeImagenTrasEditar,
  valoresDeAltaPublicacion,
} = await import('./publicaciones.service.js');

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

/**
 * US-PUB-01 - `valoresDeAltaPublicacion`.
 *
 * Es tambien una funcion pura (arma el objeto del INSERT, no ejecuta nada),
 * asi que se prueba sin mockear `db`, igual que `armarFiltroPublicaciones`.
 */
describe('valoresDeAltaPublicacion', () => {
  const CATEGORIA_ID = '22222222-2222-2222-2222-222222222222';

  const datosBase: CrearPublicacionInput = {
    nombre: 'Milanesa napolitana',
    descripcion: 'Con papas fritas',
    precio: '3500.00',
    categoriaId: CATEGORIA_ID,
  };

  it('no fija estadoPublicacion: la columna nace en su default', () => {
    const valores = valoresDeAltaPublicacion(COCINERO_ID, datosBase);

    expect(valores).not.toHaveProperty('estadoPublicacion');
    expect(valores.cocineroId).toBe(COCINERO_ID);
    expect(valores.categoriaId).toBe(CATEGORIA_ID);
    expect(valores.nombre).toBe(datosBase.nombre);
    expect(valores.precio).toBe(datosBase.precio);
  });

  it('guarda los opcionales ausentes como null, no como undefined', () => {
    const valores = valoresDeAltaPublicacion(COCINERO_ID, datosBase);

    expect(valores.imagenUrl).toBeNull();
    expect(valores.tiempoEstimadoPreparacion).toBeNull();
  });

  it('conserva los opcionales cuando el cocinero los completa', () => {
    const valores = valoresDeAltaPublicacion(COCINERO_ID, {
      ...datosBase,
      imagenUrl: 'https://storage.test/publicaciones/foto.jpg',
      tiempoEstimadoPreparacion: 30,
    });

    expect(valores.imagenUrl).toBe(
      'https://storage.test/publicaciones/foto.jpg',
    );
    expect(valores.tiempoEstimadoPreparacion).toBe(30);
  });
});

/**
 * US-PUB-04 - `cambiarDisponibilidad`. A diferencia de las dos funciones de
 * arriba, SI ejecuta contra `db` (un UPDATE con ownership), asi que se prueba
 * con el doble definido al principio del archivo, igual patron que
 * `usuarios.service.test.ts` con `eliminarCuentaPropia`: lo importante es que
 * una publicacion ajena o inexistente rechace con 404 sin que el llamador
 * pueda distinguir un caso del otro.
 */
describe('cambiarDisponibilidad', () => {
  const PUBLICACION_ID = '44444444-4444-4444-4444-444444444444';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve el id y el nuevo estado cuando el UPDATE afecta una fila', async () => {
    aplicarActualizacion.mockResolvedValue([
      { id: PUBLICACION_ID, estadoPublicacion: 'ULTIMAS_UNIDADES' },
    ]);

    const resultado = await cambiarDisponibilidad({
      cocineroId: COCINERO_ID,
      publicacionId: PUBLICACION_ID,
      estadoPublicacion: 'ULTIMAS_UNIDADES',
    });

    expect(resultado).toEqual({
      id: PUBLICACION_ID,
      estadoPublicacion: 'ULTIMAS_UNIDADES',
    });
  });

  it('rechaza con 404 cuando el UPDATE no afecta ninguna fila (ajena, inexistente o ya eliminada)', async () => {
    aplicarActualizacion.mockResolvedValue([]);

    const cambio = cambiarDisponibilidad({
      cocineroId: COCINERO_ID,
      publicacionId: PUBLICACION_ID,
      estadoPublicacion: 'NO_DISPONIBLE',
    });

    await expect(cambio).rejects.toBeInstanceOf(AppError);
    await expect(cambio).rejects.toMatchObject({
      status: 404,
      codigo: 'NO_ENCONTRADO',
    });
  });
});

/**
 * US-PUB-02 - `cambiosDeEdicion`.
 *
 * Funcion pura (arma el objeto del UPDATE, no ejecuta nada), asi que se
 * prueba sin mockear `db`, igual criterio que `valoresDeAltaPublicacion`.
 */
describe('cambiosDeEdicion', () => {
  it('no incluye los campos que el cocinero no mando', () => {
    const cambios = cambiosDeEdicion({ nombre: 'Milanesa napolitana' });

    expect(cambios).toEqual({ nombre: 'Milanesa napolitana' });
    expect(cambios).not.toHaveProperty('descripcion');
    expect(cambios).not.toHaveProperty('imagenUrl');
    expect(cambios).not.toHaveProperty('tiempoEstimadoPreparacion');
  });

  it('incluye imagenUrl en null cuando el cocinero pide "Quitar imagen"', () => {
    const cambios = cambiosDeEdicion({ imagenUrl: null });

    expect(cambios).toHaveProperty('imagenUrl', null);
  });

  it('incluye todos los campos presentes a la vez', () => {
    const CATEGORIA_ID = '22222222-2222-2222-2222-222222222222';
    const datos: EditarPublicacionInput = {
      nombre: 'Milanesa napolitana',
      descripcion: 'Con papas fritas',
      precio: '4200.00',
      categoriaId: CATEGORIA_ID,
      imagenUrl: 'https://storage.test/publicaciones/foto-nueva.jpg',
      tiempoEstimadoPreparacion: 40,
    };

    expect(cambiosDeEdicion(datos)).toEqual(datos);
  });
});

/**
 * US-PUB-02 - `limpiezaDeImagenTrasEditar`.
 *
 * Tambien pura -no toca `db` ni Storage-, asi que se prueba sin mocks.
 */
describe('limpiezaDeImagenTrasEditar', () => {
  const COCINERO_ID = '11111111-1111-1111-1111-111111111111';

  it('no limpia nada cuando la imagen no participo de la edición', () => {
    const resultado = limpiezaDeImagenTrasEditar({
      cocineroId: COCINERO_ID,
      imagenUrlEnPayload: undefined,
      imagenUrlAnterior: 'https://storage.test/publicaciones/vieja.jpg',
    });

    expect(resultado).toBeNull();
  });

  it('arma la limpieza con la URL anterior y la nueva cuando se reemplaza la foto', () => {
    const resultado = limpiezaDeImagenTrasEditar({
      cocineroId: COCINERO_ID,
      imagenUrlEnPayload: 'https://storage.test/publicaciones/nueva.jpg',
      imagenUrlAnterior: 'https://storage.test/publicaciones/vieja.jpg',
    });

    expect(resultado).toEqual({
      cocineroId: COCINERO_ID,
      urlAnterior: 'https://storage.test/publicaciones/vieja.jpg',
      urlNueva: 'https://storage.test/publicaciones/nueva.jpg',
    });
  });

  it('arma la limpieza con urlNueva null cuando el cocinero quita la imagen', () => {
    const resultado = limpiezaDeImagenTrasEditar({
      cocineroId: COCINERO_ID,
      imagenUrlEnPayload: null,
      imagenUrlAnterior: 'https://storage.test/publicaciones/vieja.jpg',
    });

    expect(resultado).toEqual({
      cocineroId: COCINERO_ID,
      urlAnterior: 'https://storage.test/publicaciones/vieja.jpg',
      urlNueva: null,
    });
  });
});

/**
 * US-PUB-02 - `editarPublicacion`. Cubre únicamente el rechazo por ownership
 * mandando un payload SIN `imagenUrl`: así la función nunca entra a la rama
 * que lee la foto anterior por `db.select` (mockeado más abajo para
 * `eliminarPublicacion`, pero sin resultado encolado acá) y el doble de
 * `db.update` ya definido al principio alcanza, mismo patrón que
 * `cambiarDisponibilidad`. El resto de la función -el UPDATE aplicado con
 * éxito y la limpieza condicional de la foto- ya está cubierto por
 * `cambiosDeEdicion` y `limpiezaDeImagenTrasEditar` de forma aislada; probar
 * el camino feliz completo exigiría mockear además el JOIN de
 * `obtenerPublicacionPropia`, que ninguna otra función de este archivo prueba
 * por la misma razón (ver `crearPublicacion`).
 */
describe('editarPublicacion', () => {
  const PUBLICACION_ID = '44444444-4444-4444-4444-444444444444';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rechaza con 404 cuando el UPDATE no afecta ninguna fila (ajena, inexistente o ya eliminada)', async () => {
    aplicarActualizacion.mockResolvedValue([]);

    const edicion = editarPublicacion({
      cocineroId: COCINERO_ID,
      publicacionId: PUBLICACION_ID,
      datos: { nombre: 'Nuevo nombre' },
    });

    await expect(edicion).rejects.toBeInstanceOf(AppError);
    await expect(edicion).rejects.toMatchObject({
      status: 404,
      codigo: 'NO_ENCONTRADO',
    });
  });
});

/**
 * US-PUB-03 - `eliminarPublicacion`. El caso más importante es el segundo: la
 * baja tiene que rechazar con 409 cuando hay pedidos activos y, sobre todo,
 * NO llegar a ejecutar el UPDATE - `dondeUpdate` (la propia función
 * `.where()` del UPDATE) queda sin invocar, así que un futuro cambio que
 * invierta el orden de los pasos (tocar la fila antes de revisar los pedidos)
 * rompería este test antes de llegar a producción.
 */
describe('eliminarPublicacion', () => {
  const PUBLICACION_ID = '44444444-4444-4444-4444-444444444444';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rechaza con 404 cuando la publicación no existe, es ajena o ya está eliminada', async () => {
    resolverSelect.mockResolvedValueOnce([]);

    const baja = eliminarPublicacion({
      cocineroId: COCINERO_ID,
      publicacionId: PUBLICACION_ID,
    });

    await expect(baja).rejects.toBeInstanceOf(AppError);
    await expect(baja).rejects.toMatchObject({
      status: 404,
      codigo: 'NO_ENCONTRADO',
    });
    expect(dondeUpdate).not.toHaveBeenCalled();
  });

  it('rechaza con 409 PEDIDOS_ACTIVOS cuando hay pedidos activos, sin llegar a ejecutar el UPDATE', async () => {
    resolverSelect
      .mockResolvedValueOnce([{ id: PUBLICACION_ID }]) // ownership: existe y es propia
      .mockResolvedValueOnce([{ id: 'item-pedido-activo' }]); // hay un pedido CREADO/ACEPTADO/LISTO

    const baja = eliminarPublicacion({
      cocineroId: COCINERO_ID,
      publicacionId: PUBLICACION_ID,
    });

    await expect(baja).rejects.toBeInstanceOf(AppError);
    await expect(baja).rejects.toMatchObject({
      status: 409,
      codigo: 'PEDIDOS_ACTIVOS',
      message: MENSAJES_PUBLICACION.pedidosActivosNoEliminable,
    });
    expect(dondeUpdate).not.toHaveBeenCalled();
  });

  it('da de baja lógica la publicación cuando no tiene pedidos activos', async () => {
    resolverSelect
      .mockResolvedValueOnce([{ id: PUBLICACION_ID }]) // ownership: existe y es propia
      .mockResolvedValueOnce([]); // sin pedidos activos

    await expect(
      eliminarPublicacion({
        cocineroId: COCINERO_ID,
        publicacionId: PUBLICACION_ID,
      }),
    ).resolves.toBeUndefined();

    expect(dondeUpdate).toHaveBeenCalledTimes(1);
  });
});
