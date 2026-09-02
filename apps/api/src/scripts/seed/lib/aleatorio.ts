/**
 * Generador pseudoaleatorio DETERMINISTA para la seed.
 *
 * POR QUE NO `Math.random()`
 *
 * La seed tiene que producir exactamente la misma base cada vez que se corre.
 * Si no, dos personas del equipo miran pantallas distintas con los mismos
 * datos "de prueba", una captura de la Etapa 6 deja de reproducirse y un bug
 * que aparece con ciertos datos no se puede volver a provocar. Con una
 * semilla fija, `pnpm seed` es idempotente: mismo estado final, siempre.
 *
 * El algoritmo es mulberry32: 32 bits de estado, una linea de aritmetica
 * entera y distribucion uniforme mas que suficiente para elegir platos y
 * precios. No es criptografico y no tiene por que serlo.
 */

/** Semilla fija. Cambiarla regenera TODO el dataset con otros valores. */
export const SEMILLA_BASE = 0xf00d5eed;

export interface Aleatorio {
  /** Flotante en [0, 1). */
  flotante: () => number;
  /** Entero en [minimo, maximo], ambos incluidos. */
  entero: (minimo: number, maximo: number) => number;
  /** Un elemento cualquiera del arreglo. */
  elegir: <T>(opciones: readonly T[]) => T;
  /** `cantidad` elementos distintos del arreglo, en orden aleatorio. */
  elegirVarios: <T>(opciones: readonly T[], cantidad: number) => T[];
  /** Copia mezclada del arreglo (Fisher-Yates). No muta el original. */
  mezclar: <T>(opciones: readonly T[]) => T[];
  /** `true` con la probabilidad indicada (0 a 1). */
  probabilidad: (p: number) => boolean;
  /**
   * Elige una clave segun su peso relativo. Los pesos no necesitan sumar 1:
   * se normalizan solos, asi que agregar una opcion no obliga a recalcular
   * las demas.
   */
  pesado: <T extends string>(pesos: Record<T, number>) => T;
}

export function crearAleatorio(semilla: number): Aleatorio {
  let estado = semilla >>> 0;

  const flotante = (): number => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const entero = (minimo: number, maximo: number): number =>
    minimo + Math.floor(flotante() * (maximo - minimo + 1));

  const mezclar = <T>(opciones: readonly T[]): T[] => {
    const copia = [...opciones];
    for (let i = copia.length - 1; i > 0; i -= 1) {
      const j = entero(0, i);
      [copia[i], copia[j]] = [copia[j] as T, copia[i] as T];
    }
    return copia;
  };

  const elegir = <T>(opciones: readonly T[]): T => {
    if (opciones.length === 0) {
      throw new Error('crearAleatorio.elegir recibió un arreglo vacío');
    }
    return opciones[entero(0, opciones.length - 1)] as T;
  };

  const pesado = <T extends string>(pesos: Record<T, number>): T => {
    const entradas = Object.entries(pesos) as [T, number][];
    const total = entradas.reduce((suma, [, peso]) => suma + peso, 0);
    let umbral = flotante() * total;
    for (const [clave, peso] of entradas) {
      umbral -= peso;
      if (umbral <= 0) return clave;
    }
    // Solo alcanzable por error de redondeo en el ultimo tramo.
    return entradas[entradas.length - 1]![0];
  };

  return {
    flotante,
    entero,
    elegir,
    elegirVarios: (opciones, cantidad) => mezclar(opciones).slice(0, cantidad),
    mezclar,
    probabilidad: (p) => flotante() < p,
    pesado,
  };
}
