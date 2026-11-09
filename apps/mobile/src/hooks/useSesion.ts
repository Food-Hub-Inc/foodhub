import { useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
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
 *
 * ES ADEMÁS DONDE SE TIRA LA CACHÉ DE REACT QUERY AL CAMBIAR DE USUARIO
 * ---------------------------------------------------------------------------
 * El `QueryClient` es un singleton de módulo y NINGUNA clave lleva el id del
 * usuario (`['perfil','yo']`, `['carrito']`, `['pedidos']`…). Como `GateDeSesion`
 * nunca se desmonta, sus observers siguen vivos después del `signOut` y el
 * `gcTime` no llega a correr: al entrar con otra cuenta, `usePerfil` devolvía el
 * perfil del usuario anterior ya resuelto y el gate elegía la barra de pestañas
 * con el rol equivocado. Reiniciar la app lo tapaba porque moría el proceso.
 *
 * Va colgado del CAMBIO DE `user.id` y no de `cerrarSesion()` a propósito: hay
 * cuatro llamadas a esa función más el cierre automático de `api.ts`, y así
 * quedan cubiertas todas de una sola vez, incluido el caso de entrar con otra
 * cuenta sin haber cerrado la anterior. Un `TOKEN_REFRESHED` no cambia el id, y
 * por lo tanto no tira nada.
 *
 * NO se toca `aviso`: el gate lo escribe justo ANTES de cerrar la sesión (la
 * expulsión del administrador, la cuenta suspendida) y limpiarlo acá borraría
 * el cartel que el login tiene que mostrar.
 */
export function useEscucharSesion(): void {
  const clienteDeConsultas = useQueryClient();

  useEffect(() => {
    const fijarSesion = useSesion.getState().fijarSesion;
    let usuarioAnterior = useSesion.getState().sesion?.user.id ?? null;

    /**
     * UN SOLO ESCRITOR. `onAuthStateChange` emite `INITIAL_SESSION` apenas se
     * suscribe —con la sesión restaurada del Keystore, o con `null` si no había
     * ninguna—, así que llamar además a `getSession()` no aporta nada y sí abre
     * una carrera: su promesa puede resolver DESPUÉS de un `SIGNED_IN` posterior
     * y pisar la sesión buena con el valor viejo. Dos fuentes escribiendo el
     * mismo estado es lo que hacía que el arranque fallara a veces sí y a veces
     * no.
     */
    const { data } = supabase.auth.onAuthStateChange((_evento, sesion) => {
      const usuarioNuevo = sesion?.user.id ?? null;
      if (usuarioNuevo !== usuarioAnterior) {
        usuarioAnterior = usuarioNuevo;
        clienteDeConsultas.clear();
      }
      fijarSesion(sesion);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [clienteDeConsultas]);
}
