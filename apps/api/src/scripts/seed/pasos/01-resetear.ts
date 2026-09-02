import { sql } from 'drizzle-orm';
import { db } from '../../../lib/db.js';
import { supabaseAdmin } from '../../../lib/supabase.js';
import { BUCKETS, vaciarBucket } from '../lib/almacenamiento.js';

/**
 * Paso 1 - Deja la base vacia.
 *
 * QUE BORRA Y EN QUE ORDEN
 *
 *   1. Todas las tablas del esquema `public`, con TRUNCATE ... CASCADE.
 *   2. Todas las cuentas de `auth.users` (GoTrue), una por una.
 *   3. El contenido de los cuatro buckets de Storage.
 *
 * POR QUE TRUNCATE Y NO DELETE
 *
 * TRUNCATE con CASCADE vacia la tabla y sus dependientes de una sola pasada,
 * sin evaluar las claves foraneas fila por fila. Con DELETE habria que
 * respetar el orden topologico de las 25 tablas a mano, y cada tabla nueva del
 * modelo obligaria a actualizar esa lista.
 *
 * POR QUE LA LISTA DE TABLAS SE CONSULTA Y NO SE ESCRIBE
 *
 * Se lee del catalogo de PostgreSQL en vez de enumerarla en el codigo: una
 * tabla nueva en `packages/db/src/schema` queda cubierta sin tocar este
 * archivo, que es exactamente el tipo de mantenimiento que se olvida.
 *
 * `pg_depend` con `deptype = 'e'` excluye las tablas que pertenecen a una
 * EXTENSION. Si PostGIS quedo instalado en `public`, su tabla
 * `spatial_ref_sys` esta ahi: truncarla dejaria a la base sin los sistemas de
 * referencia y toda consulta geografica empezaria a fallar.
 *
 * El historial de migraciones vive en el esquema `drizzle`, no en `public`, y
 * por eso no lo alcanza: la base queda vacia pero sigue estando migrada.
 */

interface ResultadoReset {
  tablasVaciadas: number;
  cuentasBorradas: number;
  archivosBorrados: number;
}

async function vaciarTablasDePublic(): Promise<number> {
  const filas = await db.execute<{ tabla: string }>(sql`
    select c.relname as tabla
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and not exists (
        select 1 from pg_depend d
        where d.objid = c.oid and d.deptype = 'e'
      )
    order by c.relname
  `);

  const tablas = [...filas].map((fila) => fila.tabla);
  if (tablas.length === 0) return 0;

  const lista = tablas.map((tabla) => `"public"."${tabla}"`).join(', ');
  // RESTART IDENTITY reinicia las secuencias asociadas a columnas identity.
  // `pedido_numero_seq` es una secuencia suelta (pgSequence) y no cuelga de
  // ninguna columna, asi que hay que reiniciarla aparte: sin eso, el primer
  // pedido de la segunda corrida seria FH-00751 en lugar de FH-00001.
  await db.execute(sql.raw(`truncate table ${lista} restart identity cascade`));
  await db.execute(sql`alter sequence "pedido_numero_seq" restart with 1`);

  return tablas.length;
}

/**
 * Borra todas las cuentas de GoTrue.
 *
 * No hay un borrado masivo en la API de administracion: se lista de a paginas
 * y se borra de a una. Con las 27 cuentas del dataset -o las que haya quedado
 * de pruebas anteriores- es un puñado de llamadas.
 */
async function borrarCuentasDeAuth(): Promise<number> {
  let borradas = 0;

  // Se relista desde la pagina 1 en cada vuelta porque borrar corre el resto
  // de las filas hacia atras: paginar hacia adelante saltearia cuentas.
  for (;;) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (error) throw error;
    if (data.users.length === 0) break;

    for (const cuenta of data.users) {
      const { error: errorBorrado } = await supabaseAdmin.auth.admin.deleteUser(
        cuenta.id,
      );
      if (errorBorrado) {
        throw new Error(
          `no se pudo borrar la cuenta ${cuenta.email ?? cuenta.id}: ${errorBorrado.message}`,
        );
      }
      borradas += 1;
    }
  }

  return borradas;
}

export async function resetear(): Promise<ResultadoReset> {
  const tablasVaciadas = await vaciarTablasDePublic();
  const cuentasBorradas = await borrarCuentasDeAuth();

  let archivosBorrados = 0;
  for (const bucket of BUCKETS) {
    archivosBorrados += await vaciarBucket(bucket);
  }

  return { tablasVaciadas, cuentasBorradas, archivosBorrados };
}
