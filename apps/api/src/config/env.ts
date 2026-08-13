import 'dotenv/config';
import { z } from 'zod';

/**
 * Validacion de la configuracion del proceso.
 *
 * El servidor se niega a arrancar si falta o esta mal formada una variable de
 * entorno. Es deliberado: es preferible que el despliegue falle en el arranque,
 * con un mensaje que nombra la variable, a que arranque y falle en la primera
 * request de un usuario con un error opaco.
 *
 * Cumple ademas el requisito de seguridad del punto 1.3.1.3: "gestion de
 * credenciales mediante variables de entorno, sin exposicion de claves o
 * secretos en el codigo fuente del repositorio".
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  APP_ENV: z.enum(['development', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  // --- Base de datos --------------------------------------------------------
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL es obligatoria (cadena de conexión de Supabase).'),

  // --- Supabase -------------------------------------------------------------
  SUPABASE_URL: z.url('SUPABASE_URL debe ser una URL válida.'),
  SUPABASE_ANON_KEY: z.string().min(1),
  /**
   * Ignora las politicas RLS por completo. Solo puede vivir en este proceso:
   * si llega al bundle de mobile o admin, cualquiera con la app instalada
   * tiene acceso total a la base.
   */
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // --- CORS -----------------------------------------------------------------
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((v) =>
      v
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    ),

  // --- Rate limiting (modulo de seguridad, alcance 2.2.2.2.1) ---------------
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),

  // --- Reglas de negocio parametrizables ------------------------------------
  // Valor por defecto de la expiracion automatica de pedidos (US-PED-10). En
  // caliente lo sobrescribe configuracion_sistema, editable desde el panel.
  PEDIDO_EXPIRACION_MINUTOS: z.coerce.number().int().positive().default(15),

  // --- Almacenamiento -------------------------------------------------------
  STORAGE_BUCKET_PERFILES: z.string().default('perfiles'),
  STORAGE_BUCKET_PUBLICACIONES: z.string().default('publicaciones'),
  STORAGE_MAX_FILE_SIZE_MB: z.coerce.number().positive().default(5),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const detalle = parsed.error.issues
    .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n');

  // console.error esta permitido por la configuracion de ESLint: el logger aun
  // no existe en este punto y es el unico canal disponible para avisar.
  console.error(
    `\n[config] No se pudo iniciar la API. Revisá el archivo .env:\n${detalle}\n`,
  );
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;

export const esProduccion = env.APP_ENV === 'production';
