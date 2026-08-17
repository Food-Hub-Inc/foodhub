import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import type { SupabaseClient } from '@supabase/supabase-js';
import { create } from 'zustand';
import {
  leerEnlaceDeAcceso,
  type MotivoDelEnlace,
} from '../lib/enlaceDeAcceso';
import { crearClienteSinSesion, supabase } from '../lib/supabase';

/**
 * PAN-AUT-04.1 · Estado del enlace de acceso que llega por correo.
 *
 * Cubre los dos que terminan en esta pantalla: la recuperación de contraseña
 * (US-AUT-04) y la invitación de un CLIENTE dado de alta desde el panel
 * (US-GURP-06). Ver `lib/enlaceDeAcceso.ts` para por qué son el mismo caso.
 *
 * POR QUÉ UNA MÁQUINA DE ESTADOS Y NO UNA BANDERA
 * ---------------------------------------------------------------------------
 * El enlace del correo abre la app y desata tres cosas a la vez: expo-router
 * navegando al deep link, Supabase restaurando la sesión guardada, y este canje
 * pidiéndole a GoTrue que valide los tokens. Ninguna espera a las otras.
 *
 * Modelado como un booleano que se prende cuando el canje termina, todo lo que
 * pasa mientras tanto es ambiguo: "no hay sesión de recuperación" significa a la
 * vez "todavía no la pedimos", "la estamos pidiendo" y "el enlace no servía", y
 * cada consumidor elige mal. De ahí salían los tres síntomas: el cartel de
 * enlace inválido que parpadea, la pantalla en blanco y el ingreso directo a la
 * app sin pedir la contraseña.
 *
 * Con los estados explícitos cada instante tiene un nombre y una sola lectura
 * posible, y la pantalla es un `switch` sin condiciones compuestas.
 *
 * POR QUÉ ESTA SESIÓN NO ES LA SESIÓN DE LA APP
 * ---------------------------------------------------------------------------
 * El canje va a un cliente descartable con `persistSession: false`, el mismo
 * patrón que el registro (ver `crearClienteSinSesion` en supabase.ts). El enlace
 * sirve para definir la contraseña y para nada más:
 *
 *   · no llega al Keystore, así que un flujo abandonado no deja al usuario
 *     dentro de la app sin haber escrito nunca su contraseña —lo que además
 *     contradice la precondición de US-AUT-04, "no tiene sesión iniciada";
 *   · `useSesion` sigue en `null`, así que `usePerfil` no se dispara y el gate
 *     no vuelve a quedarse esperando a la API en mitad del flujo.
 */

/** Los seis instantes posibles del flujo. Cada uno dibuja algo distinto. */
export type PasoDelEnlace =
  /** Arranque: todavía no sabemos si la app se abrió con un enlace. */
  | 'sinResolver'
  /** No hay ningún enlace en curso. */
  | 'ocioso'
  /** Llegó un enlace con tokens y GoTrue los está validando. */
  | 'canjeando'
  /** Sesión en pie: se puede fijar la contraseña. */
  | 'activa'
  /** El enlace vino con error, o el canje falló. */
  | 'invalida'
  /** La contraseña ya se guardó; solo queda volver al login. */
  | 'cambiada';

interface EstadoDelEnlace {
  readonly paso: PasoDelEnlace;
  /**
   * Para qué vino el enlace. Solo tiene sentido a partir de `canjeando`; antes
   * de eso no se sabe, y el valor por defecto no se muestra en ningún lado.
   */
  readonly motivo: MotivoDelEnlace;
  /**
   * Se declaran como propiedades que contienen una función y no con la sintaxis
   * abreviada de método, por el mismo motivo que en `useSesion`.
   */
  readonly atenderEnlace: (url: string | null) => Promise<void>;
  readonly fijarPassword: (password: string) => Promise<void>;
}

/**
 * El cliente descartable del canje, fuera del store a propósito.
 *
 * No es estado de interfaz: ningún componente lo lee ni tiene que redibujarse
 * cuando cambia. Vive acá, al lado de las dos únicas funciones que lo tocan, y
 * el store queda con lo único que la pantalla sí mira.
 */
let clienteDelEnlace: SupabaseClient | null = null;

export const useEnlaceDeAcceso = create<EstadoDelEnlace>((set, get) => ({
  paso: 'sinResolver',
  motivo: 'recuperacion',

  /**
   * Punto de entrada único de cualquier deep link. Nunca lanza: siempre deja la
   * máquina en un paso que la pantalla sabe dibujar. Un `throw` acá dejaría el
   * arranque colgado en `sinResolver`, y con el splash arriba eso es una app que
   * no abre nunca.
   */
  atenderEnlace: async (url) => {
    const enlace = leerEnlaceDeAcceso(url);

    if (enlace === null) {
      // El deep link no era de esta pantalla. Solo importa durante el arranque,
      // para destrabar al gate; si ya hay un enlace en curso no se lo pisa,
      // porque una URL ajena no tiene por qué cancelarlo.
      if (get().paso === 'sinResolver') set({ paso: 'ocioso' });
      return;
    }

    if (enlace.tipo === 'error') {
      set({ paso: 'invalida' });
      return;
    }

    set({ paso: 'canjeando', motivo: enlace.motivo });

    try {
      const cliente = crearClienteSinSesion();
      const { error } = await cliente.auth.setSession({
        access_token: enlace.accessToken,
        refresh_token: enlace.refreshToken,
      });

      if (error) {
        set({ paso: 'invalida' });
        return;
      }

      clienteDelEnlace = cliente;
      set({ paso: 'activa' });
    } catch {
      // Sin red, `setSession` sale por excepción. Se trata como enlace inválido
      // porque la salida que se le ofrece al usuario es la misma —pedir uno
      // nuevo— y el reintento va a fallar igual mientras no haya conexión.
      set({ paso: 'invalida' });
    }
  },

  /**
   * US-AUT-04, último criterio: "actualice las credenciales de acceso e invalide
   * la contraseña anterior".
   *
   * Cerrar la sesión del enlace después del cambio no es cosmético: revoca el
   * refresh token del lado de GoTrue, así que el enlace del correo deja de valer
   * aunque alguien conserve la URL.
   */
  fijarPassword: async (password) => {
    const cliente = clienteDelEnlace;
    if (cliente === null) {
      throw new Error('No hay una sesión de enlace activa.');
    }

    const { error } = await cliente.auth.updateUser({ password });
    if (error) throw error;

    await cliente.auth.signOut();
    clienteDelEnlace = null;

    /**
     * Si el usuario ya estaba dentro de la app cuando abrió el enlace, esa
     * sesión sigue viva con la credencial vieja. El criterio de aceptación pide
     * invalidar la anterior, así que se la cierra y vuelve a entrar con la
     * nueva. Sin sesión abierta esto no hace nada y no falla.
     */
    await supabase.auth.signOut();

    set({ paso: 'cambiada' });
  },
}));

/**
 * `true` mientras el enlace manda sobre la navegación y el gate tiene que
 * mantener las manos quietas.
 *
 * Vive acá, junto a la máquina, para que agregar un paso obligue a decidir de
 * qué lado cae. `sinResolver` queda afuera porque en ese momento el gate no
 * decide nada todavía: está esperando. `cambiada` también, porque el flujo ya
 * terminó y las reglas normales de navegación vuelven a valer.
 */
export function mandaElEnlace(paso: PasoDelEnlace): boolean {
  return paso === 'canjeando' || paso === 'activa' || paso === 'invalida';
}

/**
 * Conecta la máquina con los deep links del sistema. Se monta UNA sola vez, en
 * el gate del layout raíz.
 *
 * Cubre los dos caminos por los que puede llegar el enlace: con la app cerrada
 * (`getInitialURL`) y con la app ya abierta (el evento `url`).
 */
export function useEscucharEnlaceDeAcceso(): void {
  useEffect(() => {
    const atenderEnlace = useEnlaceDeAcceso.getState().atenderEnlace;

    // El `catch` destraba el arranque si la plataforma no puede entregar la URL
    // inicial: sin él la app se quedaría en el splash para siempre.
    void Linking.getInitialURL()
      .then(atenderEnlace)
      .catch(() => atenderEnlace(null));

    const suscripcion = Linking.addEventListener('url', ({ url }) => {
      void atenderEnlace(url);
    });

    return () => {
      suscripcion.remove();
    };
  }, []);
}
