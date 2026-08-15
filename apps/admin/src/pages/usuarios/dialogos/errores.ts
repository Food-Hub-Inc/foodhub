import { ErrorApi } from '../../../lib/api.js';

/**
 * Errores por campo de un formulario del panel.
 *
 * Vienen de dos lados y terminan en el mismo lugar, debajo del input que
 * falló: la validación local con el schema de zod compartido (para no ir a la
 * red por un apellido vacío) y la respuesta 400 de la API, que valida con ESE
 * MISMO schema y es la única que no se puede saltear.
 */
export type ErroresPorCampo<C extends string> = Partial<Record<C, string>>;

/** Problema de zod, con la forma mínima que hace falta acá. */
interface ProblemaDeValidacion {
  path: PropertyKey[];
  message: string;
}

/**
 * Toma los problemas de zod que corresponden a los campos del formulario.
 *
 * Se queda con el PRIMER mensaje de cada campo: mostrar tres errores apilados
 * bajo un input es peor que mostrar el que hay que arreglar primero.
 */
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

/**
 * Superpone los errores que devolvió la API sobre los locales.
 *
 * El servidor tiene prioridad: es el que efectivamente rechazó la operación, y
 * su mensaje puede ser más específico que el del schema (por ejemplo, un correo
 * ya registrado, que el cliente no tiene forma de saber).
 */
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
