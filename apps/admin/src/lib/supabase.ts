import { createClient } from '@supabase/supabase-js';

/**
 * Cliente de Supabase del panel de administracion.
 *
 * Solo se usa para AUTENTICACION (login del administrador, refresh del token y
 * cierre de sesion). Los datos del panel se leen y escriben SIEMPRE a traves
 * de la API, nunca consultando tablas directo desde el navegador: las reglas
 * de negocio y la auditoria viven en el backend, y saltearlo dejaria
 * operaciones sin registrar en `registro_auditoria`.
 */

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Copiá .env.example a .env y completalos.',
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    // El panel corre en un navegador de escritorio: se persiste la sesión en
    // localStorage y se renueva sola para no expulsar al administrador en
    // medio de una tarea de moderación.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Token de acceso vigente, para el encabezado Authorization de la API.
 * Devuelve null si no hay sesión activa.
 */
export async function obtenerToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
