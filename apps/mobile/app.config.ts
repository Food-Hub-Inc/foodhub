import type { ExpoConfig } from 'expo/config';

/**
 * Configuración de la aplicación Expo.
 *
 * Se usa app.config.ts (y no app.json) porque el identificador del paquete, el
 * nombre visible y las claves de servicios cambian según el ambiente, y un
 * archivo JSON estático no puede leer variables de entorno.
 *
 * Instalar la build de desarrollo y la de producción en el mismo teléfono
 * requiere que tengan applicationId distinto; de lo contrario una reemplaza a
 * la otra y no se pueden comparar lado a lado.
 */

const esProduccion = process.env.APP_ENV === 'production';

const config: ExpoConfig = {
  name: esProduccion ? 'FoodHub' : 'FoodHub (dev)',
  slug: 'foodhub',

  // Cuenta de Expo dueña del proyecto. `eas init` no la puede escribir solo
  // porque este es un config dinámico (.ts), así que va a mano.
  owner: 'food-hub-inc',

  version: '0.1.0',
  orientation: 'portrait',
  scheme: 'foodhub',
  userInterfaceStyle: 'light',
  // No se declara `newArchEnabled`: desde Expo SDK 55 la New Architecture es la
  // única soportada y la opción dejó de existir en el tipo ExpoConfig.

  // La pantalla de carga se configura en el plugin `expo-splash-screen`
  // (ver el arreglo `plugins`): desde SDK 55 dejó de ser una clave de
  // primer nivel de ExpoConfig.

  /**
   * EAS Update. El canal (`development`, `preview`, `production`) lo fija cada
   * perfil de eas.json; esta URL es la misma para los tres.
   *
   * `eas build` exige estas claves porque los perfiles declaran `channel`, y no
   * las puede escribir solo: este config es dinámico (.ts), no un app.json.
   */
  updates: {
    url: 'https://u.expo.dev/ffc82f93-7f6f-4631-b82e-48c4a4a849d5',
  },

  /**
   * Una actualización OTA solo se entrega a las builds con el mismo
   * runtimeVersion. Con la política `appVersion` ese valor sale de `version`,
   * así que subir la versión corta el flujo de updates hacia las builds viejas
   * — que es justo lo que se quiere cuando cambia el código nativo.
   */
  runtimeVersion: {
    policy: 'appVersion',
  },

  android: {
    package: esProduccion ? 'ar.edu.utn.foodhub' : 'ar.edu.utn.foodhub.dev',
    // Sin `versionCode`: eas.json declara `appVersionSource: 'remote'`, asi que
    // el numero lo lleva el servidor de EAS y lo autoincrementa el perfil de
    // produccion. Un valor fijo aca lo ignora el build y solo confunde.
    adaptiveIcon: {
      // El isotipo ya es un pin naranja: si el fondo también fuera naranja,
      // se fundiría con la forma. El fondo va en --color-surface para que se
      // vea igual que en el resto de la app (pin naranja sobre blanco).
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#FFFFFF', // --color-surface
    },
    permissions: [
      // Búsqueda de cocineros por proximidad (alcance 2.2.2.2.2).
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
      // Foto de perfil y foto de plato (US-AUT-01, US-PUB-01).
      'CAMERA',
      'READ_MEDIA_IMAGES',
      // Notificaciones push (alcance 2.2.2.2.2).
      'POST_NOTIFICATIONS',
    ],
    config: {
      googleMaps: {
        // Restringida por SHA-1 del paquete antes de pasar a producción
        // (punto 1.3.1.11 del análisis de factibilidad técnica).
        apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY ?? '',
      },
    },
    // Archivo de configuración de Firebase Cloud Messaging. Fuera del
    // repositorio: se inyecta como secreto de EAS (ver eas.json).
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
  },

  // Android es la plataforma principal del proyecto (punto 1.3.1.7). El bloque
  // de iOS se agrega si el alcance se amplía.

  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-splash-screen',
      {
        image: './assets/splash.png',
        resizeMode: 'contain',
        backgroundColor: '#FAFAF7', // --color-background de la guía visual
      },
    ],
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'FoodHub usa tu ubicación para mostrarte cocineros cercanos.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'FoodHub necesita acceso a tus fotos para que puedas subir la imagen de tu perfil y de tus platos.',
        cameraPermission:
          'FoodHub necesita acceso a la cámara para que puedas tomar la foto de tus platos.',
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#EC6829',
      },
    ],
  ],

  experiments: {
    typedRoutes: true, // expo-router genera tipos de las rutas: un enlace a una
    // pantalla inexistente falla al compilar y no en ejecución.
  },

  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    appEnv: process.env.APP_ENV ?? 'development',
    eas: {
      // Lo completa `eas init` con el ID del proyecto en la cuenta de Expo.
      projectId: 'ffc82f93-7f6f-4631-b82e-48c4a4a849d5',
    },
  },
};

export default config;
