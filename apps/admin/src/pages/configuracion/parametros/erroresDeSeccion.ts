/**
 * Extrae el primer error de zod por campo. Las cuatro secciones de PAN-ADM-04
 * (US-CFG-03) validan el objeto completo en cada cambio —no recién al
 * enviar—, así que comparten esta misma extracción en lugar de repetirla.
 */
interface ProblemaDeValidacion {
  path: PropertyKey[];
  message: string;
}

export function erroresDeSeccion<C extends string>(
  problemas: readonly ProblemaDeValidacion[],
): Partial<Record<C, string>> {
  const errores: Partial<Record<C, string>> = {};
  for (const problema of problemas) {
    const campo = problema.path[0];
    if (typeof campo === 'string') {
      errores[campo as C] ??= problema.message;
    }
  }
  return errores;
}
