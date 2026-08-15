import { describe, expect, it } from 'vitest';
import { BOM_UTF8, generarCsv } from './csv.js';

/**
 * El escapado del CSV es lo unico que separa una exportacion de auditoria
 * legible de una corrida de columnas: el `motivo` de una suspension y el
 * `datos_adicionales` de una operacion son texto libre escrito por una persona.
 */
describe('generarCsv', () => {
  const columnas = [
    { encabezado: 'a', valor: (f: { a: unknown; b: unknown }) => f.a },
    { encabezado: 'b', valor: (f: { a: unknown; b: unknown }) => f.b },
  ];

  /** El BOM inicial no se compara en cada prueba: se quita una sola vez. */
  const sinBom = (csv: string) => csv.slice(BOM_UTF8.length);

  it('escribe el encabezado y una fila por registro', () => {
    const csv = sinBom(generarCsv(columnas, [{ a: 'uno', b: 'dos' }]));
    expect(csv).toBe('a,b\r\nuno,dos\r\n');
  });

  it('encomilla los valores que contienen el separador', () => {
    const csv = sinBom(generarCsv(columnas, [{ a: 'rojo, verde', b: 'x' }]));
    expect(csv).toBe('a,b\r\n"rojo, verde",x\r\n');
  });

  it('duplica las comillas internas', () => {
    const csv = sinBom(generarCsv(columnas, [{ a: 'dijo "hola"', b: 'x' }]));
    expect(csv).toBe('a,b\r\n"dijo ""hola""",x\r\n');
  });

  it('encomilla los saltos de línea para no partir la fila', () => {
    const csv = sinBom(generarCsv(columnas, [{ a: 'una\nlínea', b: 'x' }]));
    expect(csv).toBe('a,b\r\n"una\nlínea",x\r\n');
  });

  it('serializa los objetos como JSON en una sola columna', () => {
    const csv = sinBom(
      generarCsv(columnas, [{ a: { campos: ['nombre'] }, b: null }]),
    );
    expect(csv).toBe('a,b\r\n"{""campos"":[""nombre""]}",\r\n');
  });

  it('deja la celda vacía cuando el valor es nulo', () => {
    const csv = sinBom(generarCsv(columnas, [{ a: null, b: undefined }]));
    expect(csv).toBe('a,b\r\n,\r\n');
  });

  it('antepone el BOM para que Excel respete las tildes', () => {
    expect(generarCsv(columnas, []).startsWith(BOM_UTF8)).toBe(true);
  });
});

/**
 * Inyeccion de formulas (CSV injection).
 *
 * El `motivo` de una suspension y el correo intentado de un login fallido son
 * texto libre escrito por un usuario. Si la planilla los evalua como formula,
 * el CSV de auditoria pasa de ser evidencia a ser un vector de ataque contra la
 * maquina del administrador que lo abre.
 */
describe('generarCsv · neutralización de fórmulas', () => {
  const columnas = [
    { encabezado: 'a', valor: (f: { a: unknown; b: unknown }) => f.a },
    { encabezado: 'b', valor: (f: { a: unknown; b: unknown }) => f.b },
  ];

  const primeraCelda = (valor: unknown): string => {
    const csv = generarCsv(columnas, [{ a: valor, b: 'x' }]).slice(
      BOM_UTF8.length,
    );
    return csv.split('\r\n')[1]?.slice(0, -2) ?? '';
  };

  it.each(['=SUMA(A1:A9)', '+1', '-1', '@importar'])(
    'prefija con apóstrofo el valor que empieza con %s',
    (valor) => {
      expect(primeraCelda(valor)).toBe(`'${valor}`);
    },
  );

  it('combina el apóstrofo con el encomillado sin pisarse', () => {
    // El apóstrofo queda DENTRO de las comillas y las comillas internas siguen
    // duplicándose: si el prefijo quedara afuera, el campo dejaría de ser CSV
    // válido y correría todas las columnas siguientes.
    expect(primeraCelda('=1+1,"x"')).toBe('"\'=1+1,""x"""');
  });

  it('no toca un valor que no empieza con un carácter de fórmula', () => {
    expect(primeraCelda('incumplió las normas')).toBe('incumplió las normas');
  });

  it('no prefija un número negativo: no viene de una persona', () => {
    expect(primeraCelda(-5)).toBe('-5');
  });

  it('no prefija el JSON de datos_adicionales', () => {
    expect(primeraCelda({ campos: ['nombre'] })).toBe(
      '"{""campos"":[""nombre""]}"',
    );
  });
});
