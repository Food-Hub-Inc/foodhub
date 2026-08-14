import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Configuracion de Vite para el panel de administracion.
 *
 * Tailwind v4 se integra como plugin de Vite y ya no necesita archivos
 * `tailwind.config.js` ni `postcss.config.js`: el tema se declara en CSS con
 * la directiva `@theme` (ver src/styles/global.css). HeroUI v3 se apoya en ese
 * mismo mecanismo, asi que sus tokens y los propios conviven en un solo lugar.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],

  /**
   * Vite busca los .env en la raiz del proyecto (apps/admin), donde no hay
   * ninguno: el unico .env del monorepo vive dos niveles mas arriba. Sin esto,
   * `import.meta.env.VITE_SUPABASE_URL` llega undefined y el panel falla al
   * crear el cliente de Supabase.
   *
   * Solo se exponen al bundle las variables con prefijo VITE_, asi que apuntar
   * al .env compartido no filtra la SERVICE_ROLE_KEY ni la DATABASE_URL.
   */
  envDir: '../../',

  server: {
    port: 5173,
    strictPort: true, // si el puerto esta ocupado, falla en vez de mover el
    // origen y quedar fuera de la lista CORS de la API.
  },

  build: {
    outDir: 'dist',
    sourcemap: true, // necesarios para leer los stack traces de produccion
    rollupOptions: {
      output: {
        /**
         * Se separan las dependencias grandes y estables en chunks propios:
         * al cambiar codigo del panel, el navegador solo vuelve a descargar el
         * chunk de la aplicacion y conserva el de React y HeroUI en cache.
         *
         * Se usa la forma de funcion y no la de objeto porque Rollup 4 tipa
         * `manualChunks` como `ManualChunksFunction` cuando hay varios outputs.
         */
        manualChunks(id) {
          if (id.includes('node_modules/@heroui')) return 'heroui';
          if (id.includes('node_modules/react-aria')) return 'heroui';
          if (
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/react-router')
          ) {
            return 'react';
          }
          return undefined;
        },
      },
    },
  },
});
