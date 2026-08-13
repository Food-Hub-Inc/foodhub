import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

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
   */
  schemaFilter: ['public'],

  // El schema declara la columna `geography`/`geometry` de PostGIS. La
  // extension se instala una sola vez desde el panel de Supabase; drizzle no
  // la crea (ver documento de configuraciones manuales).
  extensionsFilters: ['postgis'],

  verbose: true,
  strict: true,
});
