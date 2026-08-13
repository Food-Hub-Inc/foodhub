import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

export * from './schema/index.js';
export { schema };

/**
 * Cliente de base de datos de FoodHub.
 *
 * Se usa el driver `postgres` (postgres.js) porque el pooler de Supabase habla
 * el protocolo nativo de PostgreSQL y admite prepared statements, a diferencia
 * de las alternativas sobre HTTP.
 */

let cliente: ReturnType<typeof postgres> | undefined;

export type Database = ReturnType<typeof crearConexion>;

export function crearConexion(url: string) {
  cliente ??= postgres(url, {
    /**
     * Supabase ofrece dos puertos de conexion:
     *   6543  transaction pooler (PgBouncer) - para la API, que abre y cierra
     *         conexiones cortas en cada request
     *   5432  conexion directa - para migraciones, que necesitan sesion propia
     *
     * En modo transaction el pooler no conserva el estado entre sentencias, y
     * los prepared statements dependen de ese estado: hay que desactivarlos o
     * la segunda ejecucion de una consulta falla.
     */
    prepare: false,

    // Tope conservador: el plan gratuito de Supabase limita las conexiones
    // concurrentes, y agotarlas deja al resto de la aplicacion sin acceso.
    max: 10,

    // Cierra las conexiones ociosas para no retener cupo del pooler.
    idle_timeout: 20,

    // Si la base no responde en 10 s, la request falla rapido en lugar de
    // acumular conexiones colgadas.
    connect_timeout: 10,
  });

  return drizzle(cliente, { schema, casing: 'snake_case' });
}

/** Cierra el pool. Se invoca en el apagado ordenado del servidor. */
export async function cerrarConexion(): Promise<void> {
  if (cliente) {
    await cliente.end();
    cliente = undefined;
  }
}
