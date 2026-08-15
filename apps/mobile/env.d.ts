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
 *
 * POR QUÉ ESTE ARCHIVO Y NO `expo-env.d.ts`
 * ---------------------------------------------------------------------------
 * `expo-env.d.ts` lo genera Expo y lo REESCRIBE completo en cada `expo start`
 * y en cada `expo export`, dejando solo su stub con la nota "This file should
 * not be edited". Cualquier declaración escrita a mano ahí se pierde en
 * silencio la próxima vez que alguien levante Metro. Este archivo no lo toca
 * nadie, así que las declaraciones sobreviven.
 */
declare namespace NodeJS {
  interface ProcessEnv {
    readonly EXPO_PUBLIC_API_URL: string;
    readonly EXPO_PUBLIC_SUPABASE_URL: string;
    readonly EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
    readonly APP_ENV?: 'development' | 'production';
  }
}

/**
 * Metro resuelve `import x from './imagen.png'` a un asset id (`number`) o,
 * con `expo-image`, a un módulo con `default`. Sin esta declaración TS no
 * conoce la extensión y el import rompe la compilación (TS2307).
 */
declare module '*.png' {
  const valor: number;
  export default valor;
}
