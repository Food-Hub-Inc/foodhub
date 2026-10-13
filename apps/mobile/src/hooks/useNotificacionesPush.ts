import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import type { TipoNotificacion } from '@foodhub/shared';
import { registrarDispositivo } from '../api/notificaciones';
import { deepLinkDeNotificacion } from '../lib/deepLinkNotificacion';
import { recordarTokenDePush } from '../lib/tokenDePush';
import { useSesion } from './useSesion';

/**
 * US-NOT-01 a US-NOT-06 · Notificaciones push del dispositivo.
 *
 * Se monta UNA sola vez, en el layout raíz. Hace tres cosas:
 *
 *   1. Registra el Expo Push Token cuando hay sesión (punto 1.3.1.11:
 *      "persistirse asociados al usuario, con actualización ante
 *      renovaciones o reinstalaciones"). La baja al cerrar sesión la hace
 *      `cerrarSesion()` antes del `signOut` (ver `lib/tokenDePush.ts`).
 *   2. Deja que un push recibido con la app en primer plano se muestre igual
 *      (banner del sistema); si el usuario ya está donde el push lo llevaría,
 *      la pantalla ya se lo mostró por Realtime y el aviso es redundante, pero
 *      eso lo resuelve la API omitiendo el push (US-NOT-02), no el cliente.
 *   3. Al tocar un push -en caliente o desde arranque en frío- navega al
 *      recurso relacionado (`deepLinkDeNotificacion`).
 *
 * NO SE PUEDE VERIFICAR SIN UNA BUILD DE EAS con `google-services.json`: en un
 * entorno sin FCM `getExpoPushTokenAsync` lanza. Todo va envuelto en try/catch
 * y un fallo acá nunca rompe el arranque de la app.
 */

// El handler de primer plano se registra a nivel de módulo, como pide Expo.
Notifications.setNotificationHandler({
  handleNotification: () =>
    Promise.resolve({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
});

const CANAL_ANDROID = 'default';

/** Lo que manda `despacho.service.ts` de la API en el `data` de cada push. */
interface DatosDePush {
  tipo?: TipoNotificacion;
  objetoAfectadoId?: string;
  notificacionId?: string;
}

function navegarDesde(
  respuesta: Notifications.NotificationResponse | null,
): void {
  const datos = respuesta?.notification.request.content.data as
    DatosDePush | undefined;
  if (!datos?.tipo) return;
  router.push(
    deepLinkDeNotificacion(
      datos.tipo,
      datos.objetoAfectadoId ?? null,
      datos.notificacionId ?? null,
    ),
  );
}

async function obtenerExpoPushToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CANAL_ANDROID, {
        name: 'FoodHub',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const permiso = await Notifications.getPermissionsAsync();
    const concedido =
      permiso.granted ||
      (await Notifications.requestPermissionsAsync()).granted;
    if (!concedido) return null;

    const extra = Constants.expoConfig?.extra as
      { eas?: { projectId?: string } } | undefined;
    const projectId = extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return data;
  } catch {
    // Sin FCM (Expo Go, build sin google-services.json) o permiso denegado.
    return null;
  }
}

export function useNotificacionesPush(): void {
  const sesion = useSesion((estado) => estado.sesion);
  const usuarioId = sesion?.user.id ?? null;

  // 1. Registro / baja del token según la sesión.
  useEffect(() => {
    let cancelado = false;

    if (usuarioId) {
      void obtenerExpoPushToken().then((token) => {
        if (cancelado || !token) return;
        recordarTokenDePush(token);
        void registrarDispositivo({
          expoPushToken: token,
          plataforma: Platform.OS === 'ios' ? 'ios' : 'android',
          dispositivoInfo: `${Platform.OS} ${String(Platform.Version)}`,
        }).catch(() => undefined);
      });
    } else {
      // Sin sesión. La baja del token NO va acá: con la sesión ya cerrada la
      // API la rechaza. La hace `cerrarSesion()` antes del `signOut` (ver
      // `lib/tokenDePush.ts`); acá solo se olvida el token.
      recordarTokenDePush(null);
    }

    return () => {
      cancelado = true;
    };
  }, [usuarioId]);

  // 2. Tap sobre un push (app abierta).
  useEffect(() => {
    const sub =
      Notifications.addNotificationResponseReceivedListener(navegarDesde);
    return () => {
      sub.remove();
    };
  }, []);

  // 3. Tap sobre un push que abrió la app desde cero.
  useEffect(() => {
    void Notifications.getLastNotificationResponseAsync().then(navegarDesde);
  }, []);
}
