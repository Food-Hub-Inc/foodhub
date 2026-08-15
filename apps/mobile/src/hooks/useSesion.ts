import { useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from '../lib/supabase';

/**
 * Estado de sesión compartido por toda la app.
 *
 * POR QUÉ ESTO NO ES UNA CONSULTA DE REACT QUERY
 * ---------------------------------------------------------------------------
 * La sesión no se pide: llega. Supabase la restaura del Keystore al arrancar,
 * la renueva sola cada hora y la borra cuando el usuario cierra sesión, y cada
 * uno de esos eventos tiene que verse al instante en el gate de navegación.
 * Modelarlo como cache de servidor obligaría a invalidar a mano en cada uno.
 *
 * `resuelta` es la diferencia entre "no hay sesión" y "todavía no sabemos si
 * hay sesión". Sin ese tercer estado el arranque manda al login por un frame y
 * después corrige, que es exactamente el parpadeo que el splash evita.
 */
interface EstadoSesion {
  /** `false` hasta que Supabase responde la primera vez. */
  readonly resuelta: boolean;
  readonly sesion: Session | null;
  /**
   * Aviso pendiente de mostrar en la pantalla de login. Hoy lo usa un solo
   * caso: el administrador al que se le cerró la sesión por entrar a la app.
   */
  readonly aviso: string | null;
  /**
   * Se declaran como propiedades que contienen una funcion y no con la sintaxis
   * abreviada de metodo. Es lo que son: zustand las guarda como campos del
   * objeto del store y ninguna usa `this`. Declararlas como metodos hace que
   * typescript-eslint marque cada lectura del store como el desprendimiento de
   * un metodo de su objeto.
   */
  readonly fijarSesion: (sesion: Session | null) => void;
  readonly fijarAviso: (aviso: string | null) => void;
}

export const useSesion = create<EstadoSesion>((set) => ({
  resuelta: false,
  sesion: null,
  aviso: null,
  fijarSesion: (sesion) => {
    set({ sesion, resuelta: true });
  },
  fijarAviso: (aviso) => {
    set({ aviso });
  },
}));

/**
 * Conecta el store con Supabase. Se monta UNA sola vez, en el layout raíz.
 *
 * `onAuthStateChange` cubre también el refresh silencioso del token y el cierre
 * de sesión que dispara `api.ts` cuando el servidor responde 401: la interfaz
 * reacciona sin que nadie tenga que avisarle.
 */
export function useEscucharSesion(): void {
  useEffect(() => {
    const fijarSesion = useSesion.getState().fijarSesion;

    void supabase.auth.getSession().then(({ data }) => {
      fijarSesion(data.session);
    });

    const { data } = supabase.auth.onAuthStateChange((_evento, sesion) => {
      fijarSesion(sesion);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);
}
