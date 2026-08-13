import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

/**
 * Cliente de Supabase de la aplicación móvil.
 *
 * Resuelve la autenticación (registro, login, refresh y recuperación de
 * contraseña) contra Supabase Auth. Los datos de negocio se piden a la API de
 * FoodHub, que valida el JWT emitido acá y aplica las reglas del dominio.
 */

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Faltan EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY en el .env de apps/mobile.',
  );
}

/**
 * Almacenamiento de la sesión en el Keystore de Android a través de
 * expo-secure-store, y no en AsyncStorage.
 *
 * AsyncStorage guarda en texto plano dentro del sandbox de la app: en un
 * dispositivo con root, o con una copia de seguridad accesible, el refresh
 * token queda expuesto y permite suplantar al usuario hasta que expire.
 *
 * SecureStore tiene un límite de 2048 bytes por entrada. Los tokens de
 * Supabase entran cómodos, pero si en el futuro el JWT crece con claims
 * personalizados hay que partir el valor en varias entradas.
 */
const almacenamientoSeguro = {
  getItem: (clave: string) => SecureStore.getItemAsync(clave),
  setItem: (clave: string, valor: string) =>
    SecureStore.setItemAsync(clave, valor),
  removeItem: (clave: string) => SecureStore.deleteItemAsync(clave),
};

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: almacenamientoSeguro,
    persistSession: true,
    autoRefreshToken: true,
    // En una app nativa no hay callback por URL con el token en el fragmento:
    // el flujo de OAuth por navegador no aplica y activarlo genera warnings.
    detectSessionInUrl: false,
  },
});

/** Token de acceso vigente para el encabezado Authorization de la API. */
export async function obtenerToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
