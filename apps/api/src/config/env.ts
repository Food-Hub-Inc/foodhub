import { config } from 'dotenv';
import { z } from 'zod';

/**
 * dotenv resuelve las rutas contra el CWD, y `pnpm --filter @foodhub/api` corre
 * el proceso parado en apps/api, donde no hay .env. El unico .env del monorepo
 * vive en la raiz. Se listan las dos rutas para que la API arranque tanto desde
 * el filtro de pnpm como ejecutada a mano desde la raiz.
 *
 * El orden importa: dotenv no pisa una variable ya definida, asi que un .env
 * propio de apps/api (util para correr las pruebas contra otra base) gana sobre
 * el de la raiz.
 */
config({ path: ['.env', '../../.env'] });

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

  /**
   * Destino del enlace del correo cuando quien lo recibe usa la app movil:
   * recuperacion de contrasena de un CLIENTE o un COCINERO (US-AUT-04,
   * PAN-AUT-04.1) e invitacion de un CLIENTE dada de alta desde el panel.
   *
   * Es un deep link al scheme de la app y no una URL http porque esos dos roles
   * no tienen interfaz web: el formulario de contrasena vive dentro de la app.
   * En consecuencia, ABIERTO EN UNA COMPUTADORA ESTE ENLACE NO HACE NADA —
   * ningun navegador de escritorio tiene registrado el esquema `foodhub://`— y
   * eso es esperado, no un defecto. El correo tiene que decirlo (ver
   * `docs/CORREOS-AUTH.md`).
   *
   * GoTrue exige que el valor este declarado en la lista blanca de Redirect
   * URLs del proyecto de Supabase. Si no lo esta, lo descarta EN SILENCIO y
   * usa la Site URL: el correo se envia igual y el enlace no abre la app, que
   * es el modo de falla mas dificil de diagnosticar de todo este flujo.
   */
  URL_RECUPERACION_PASSWORD: z
    .string()
    .min(1)
    .default('foodhub://nueva-password'),

  /**
   * Destino del enlace del correo cuando quien lo recibe es un ADMINISTRADOR:
   * su invitacion (US-GURP-06) y tambien su recuperacion de contrasena
   * (ver `DESTINO_RECUPERACION` en auth.service.ts).
   *
   * Es una URL http y no un deep link porque el administrador trabaja en el
   * panel web: mandarlo a la app movil lo obligaria a instalarla solo para
   * definir su contrasena. Las dos rutas terminan en la misma pantalla del
   * panel, `/nueva-password`, porque el caso es el mismo: llega con sesion
   * abierta por GoTrue y sin contrasena propia.
   *
   * Vale la misma advertencia de la lista blanca de Redirect URLs. En
   * produccion tiene que apuntar al dominio del panel desplegado, no a
   * localhost.
   */
  URL_INVITACION_PANEL: z
    .string()
    .min(1)
    .default('http://localhost:5173/nueva-password'),

  // --- Almacenamiento -------------------------------------------------------
  STORAGE_BUCKET_PERFILES: z.string().default('perfiles'),
  STORAGE_BUCKET_PUBLICACIONES: z.string().default('publicaciones'),
  STORAGE_BUCKET_CONFIGURACION: z.string().default('configuracion'),
  STORAGE_MAX_FILE_SIZE_MB: z.coerce.number().positive().default(5),

  /**
   * US-MSG-03 - Bucket de las imagenes del chat.
   *
   * Separado de `publicaciones` a proposito: ahi viven las fotos de platos, que
   * son contenido publico del catalogo, y aca imagenes de una conversacion
   * privada entre dos personas. Mezclarlas en un bucket haria que cualquier
   * cambio de politica sobre uno alcanzara al otro.
   *
   * El tope es propio y no `STORAGE_MAX_FILE_SIZE_MB`: US-MSG-03 fija 8 MB para
   * el chat, mientras que la foto de perfil (US-AUT-01) y la del plato
   * (US-PUB-01) fijan 5 MB. Son tres criterios distintos y cada uno se ajusta
   * por su lado.
   */
  STORAGE_BUCKET_MENSAJES: z.string().default('mensajes'),
  STORAGE_MAX_IMAGEN_CHAT_MB: z.coerce.number().positive().default(8),

  // --- Correo transaccional (US-AYU-03) -------------------------------------
  /**
   * API key de Resend, el servicio que envia el correo de acuse de recibo del
   * formulario de contacto al soporte (US-AYU-03). Es OBLIGATORIA en
   * produccion: sin un canal de salida, la consulta queda registrada pero el
   * usuario no recibe el acuse, y eso rompe el criterio de aceptacion.
   *
   * En desarrollo es opcional para no bloquear a quien levanta la API sin
   * todavia tener una cuenta en Resend: si falta, `lib/email.ts` loguea con
   * `info` y simula un envio exitoso. La idea es que la consulta se cree
   * normalmente y la falla del correo se vea en los logs, no en pantalla.
   */
  RESEND_API_KEY: z.string().optional(),
  /**
   * Remitente del correo (`From:`). El formato es el de Resend:
   * `"FoodHub <soporte@foodhub.com>"`. Tambien opcional en dev.
   */
  RESEND_REMITENTE: z.string().default('FoodHub <soporte@foodhub.com>'),
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
