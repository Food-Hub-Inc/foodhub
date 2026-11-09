import { ErrorApi } from '../../../lib/api.js';

/**
 * Errores por campo de los formularios de US-AYU-05 — mismo patrón que
 * `configuracion/motivos/dialogos/errores.ts`.
 */
export type ErroresPorCampo<C extends string> = Partial<Record<C, string>>;

interface ProblemaDeValidacion {
  path: PropertyKey[];
  message: string;
}

export function erroresDeZod<C extends string>(
  problemas: readonly ProblemaDeValidacion[],
  campos: readonly C[],
): ErroresPorCampo<C> {
  const errores: ErroresPorCampo<C> = {};
  for (const problema of problemas) {
    const campo = problema.path[0];
    if (esCampo(campo, campos)) errores[campo] ??= problema.message;
  }
  return errores;
}

export function conErroresDeApi<C extends string>(
  locales: ErroresPorCampo<C>,
  error: unknown,
  campos: readonly C[],
): ErroresPorCampo<C> {
  if (!(error instanceof ErrorApi)) return locales;

  const combinados: ErroresPorCampo<C> = { ...locales };
  for (const invalido of error.campos) {
    if (esCampo(invalido.campo, campos)) {
      combinados[invalido.campo] = invalido.mensaje;
    }
  }
  return combinados;
}

function esCampo<C extends string>(
  valor: unknown,
  campos: readonly C[],
): valor is C {
  return (
    typeof valor === 'string' && (campos as readonly string[]).includes(valor)
  );
}
