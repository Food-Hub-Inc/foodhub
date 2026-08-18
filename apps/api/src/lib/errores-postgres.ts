/**
 * Codigo SQLSTATE de un error de Postgres (ej. '23505' unique_violation,
 * '23503' foreign_key_violation), aunque venga envuelto por Drizzle.
 *
 * `drizzle-orm/postgres-js` envuelve cualquier fallo de la consulta en un
 * `DrizzleQueryError` cuyas propiedades propias son `query`, `params` y
 * `cause` — el `PostgresError` real de postgres.js, con el `.code` que
 * importa, vive en `error.cause`, no en `error` directo. Revisar los dos
 * niveles evita que esta funcion deje de detectar el error si algun dia deja
 * de envolverse.
 */
export function tieneCodigoSql(error: unknown, codigo: string): boolean {
  if (codigoDe(error) === codigo) return true;
  const causa =
    typeof error === 'object' && error !== null
      ? (error as { cause?: unknown }).cause
      : undefined;
  return codigoDe(causa) === codigo;
}

function codigoDe(valor: unknown): string | undefined {
  if (typeof valor !== 'object' || valor === null) return undefined;
  const codigo = (valor as { code?: unknown }).code;
  return typeof codigo === 'string' ? codigo : undefined;
}
