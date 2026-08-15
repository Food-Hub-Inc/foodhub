import { defineConfig } from 'vitest/config';

/**
 * Configuracion de las pruebas de la API.
 *
 * POR QUE SE FIJAN LAS VARIABLES DE ENTORNO ACA
 *
 * `config/env.ts` aborta el proceso si falta una variable, y el modulo se
 * evalua al importar la app. Vitest escribe estas claves en `process.env` antes
 * de cargar cada archivo de prueba y dotenv no pisa lo que ya esta definido,
 * asi que la suite corre igual en una maquina sin `.env` y, sobre todo, nunca
 * apunta por accidente al proyecto real de Supabase.
 *
 * Los valores son deliberadamente inutilizables: la base apunta a un puerto
 * cerrado y Supabase a una URL que rechaza la conexion de inmediato. Una prueba
 * que necesite datos reales falla rapido en lugar de escribir en un ambiente.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./src/__tests__/setup.ts'],
    env: {
      // 'production' evita que el logger levante el transport de pino-pretty,
      // que corre en un worker aparte y sobrevive al final de la suite.
      APP_ENV: 'production',
      DATABASE_URL: 'postgresql://prueba:prueba@127.0.0.1:1/foodhub_test',
      SUPABASE_URL: 'http://127.0.0.1:1',
      SUPABASE_ANON_KEY: 'clave-anonima-de-prueba',
      SUPABASE_SERVICE_ROLE_KEY: 'clave-service-role-de-prueba',
      CORS_ORIGINS: 'http://localhost:5173',
    },
  },
});
