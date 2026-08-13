/// <reference types="expo/types" />

/**
 * Tipado de las variables de entorno de la aplicación móvil.
 *
 * Expo solo inyecta en el bundle las variables con prefijo `EXPO_PUBLIC_`, y
 * las expone como `string` sin tipar: sin esta declaración, cada lectura de
 * `process.env.EXPO_PUBLIC_*` es `any` y se pierde el chequeo de tipos aguas
 * abajo (además de disparar las reglas `no-unsafe-*` de typescript-eslint).
 *
 * ⚠️ Todo lo declarado acá viaja DENTRO del APK y es legible por cualquiera
 * que lo descargue. Nunca agregar secretos: la service role key de Supabase,
 * las credenciales de FCM y la cadena de conexión a la base viven solo en el
 * backend.
 */
declare namespace NodeJS {
  interface ProcessEnv {
    readonly EXPO_PUBLIC_API_URL: string;
    readonly EXPO_PUBLIC_SUPABASE_URL: string;
    readonly EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
    readonly APP_ENV?: 'development' | 'production';
  }
}
