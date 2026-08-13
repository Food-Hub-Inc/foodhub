/// <reference types="vite/client" />

/**
 * Tipado de las variables de entorno del panel.
 *
 * Vite solo expone al bundle las variables con prefijo VITE_. Declararlas acá
 * hace que `import.meta.env.VITE_API_URL` esté tipado y que un typo en el
 * nombre falle al compilar en vez de llegar como `undefined` en tiempo de
 * ejecución.
 */
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
