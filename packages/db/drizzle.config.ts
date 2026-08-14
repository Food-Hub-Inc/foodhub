import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

/**
 * dotenv resuelve las rutas contra el CWD, y `pnpm --filter @foodhub/db` corre
 * drizzle-kit parado en packages/db, donde no hay .env. El unico .env del
 * monorepo vive en la raiz. Se listan las dos rutas para que el comando ande
 * tanto desde el filtro de pnpm como ejecutado a mano desde la raiz.
 */
config({ path: ['.env', '../../.env'] });

/**
 * Configuracion de drizzle-kit: generacion y aplicacion de migraciones.
 *
 *   pnpm db:generate  compara el schema TypeScript con la ultima migracion y
 *                     escribe el SQL de la diferencia en ./drizzle
 *   pnpm db:migrate   aplica a la base las migraciones pendientes
 *   pnpm db:studio    abre el explorador visual de datos
 *
 * Las migraciones se generan una vez, se revisan en el pull request y se
 * versionan. No se usa `db:push` contra produccion: sobrescribe el esquema sin
 * dejar historial.
 */
export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',

  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },

  /**
   * Supabase agrega al servidor los esquemas `auth`, `storage`, `realtime` y
   * `graphql_public`, que administra el propio servicio. Sin este filtro,
   * drizzle-kit los interpreta como tablas ajenas al schema y genera un DROP
   * para cada una. Solo gestionamos `public`.
   *
   * OJO: el filtro NO aplica a `generate` (drizzle-kit 0.31 lo pasa solo en
   * `push` e `introspect`). La referencia a `auth.users` que declara
   * src/schema/usuarios.ts aparece igual como CREATE TABLE en el SQL generado y
   * hay que borrarla a mano; ya se hizo en 0000. Revisalo si alguna vez
   * regeneras las migraciones desde cero.
   */
  schemaFilter: ['public'],

  // El schema declara la columna `geography`/`geometry` de PostGIS. La
  // extension se instala una sola vez desde el panel de Supabase; drizzle no
  // la crea (ver documento de configuraciones manuales).
  extensionsFilters: ['postgis'],

  verbose: true,
  strict: true,
});
