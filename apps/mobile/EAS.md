# Perfiles de EAS Build — FoodHub

El equipo **no usa Expo Go**. Toda ejecución de la app, incluida la del día a día,
se hace sobre una build generada con EAS.

## Por qué no Expo Go

Expo Go es un contenedor genérico que solo incluye los módulos nativos que Expo
decidió empaquetar. FoodHub depende de módulos que **no están** en ese
contenedor:

| Módulo                    | Motivo                                              |
| ------------------------- | --------------------------------------------------- |
| `react-native-maps`       | mapa de cocineros cercanos con SDK de Google Maps   |
| `expo-notifications`      | push por FCM con `google-services.json` propio      |
| `react-native-reanimated` | animaciones que exige HeroUI Native (v4 + worklets) |

Con Expo Go esas pantallas fallan en ejecución. La build de desarrollo incluye
los módulos nativos reales y conserva la recarga en caliente, así que se
programa igual de cómodo pero contra el binario que efectivamente se va a
publicar.

## Los tres perfiles

| Perfil        | Para qué sirve                              | Formato | applicationId            |
| ------------- | ------------------------------------------- | ------- | ------------------------ |
| `development` | trabajo diario, con dev client y hot reload | APK     | `ar.edu.utn.foodhub.dev` |
| `preview`     | demos y pruebas de QA sin dev client        | APK     | `ar.edu.utn.foodhub.dev` |
| `production`  | entrega final / Play Store                  | AAB     | `ar.edu.utn.foodhub`     |

`development` y `production` tienen **applicationId distinto** a propósito: así
conviven las dos apps instaladas en el mismo teléfono y se pueden comparar sin
desinstalar nada.

## Uso

```bash
# 1. Una sola vez por integrante: generar la build de desarrollo e instalarla
pnpm --filter @foodhub/mobile run build:dev

# 2. Todos los días: levantar el servidor de Metro y abrir la app instalada
pnpm --filter @foodhub/mobile run start
```

El paso 1 se repite solo cuando se agrega o actualiza una dependencia con
código nativo. Los cambios de JavaScript y de estilos llegan por Metro sin
reconstruir.

## Secretos

`GOOGLE_MAPS_ANDROID_API_KEY` y `google-services.json` **no se versionan**. Se
cargan como secretos del proyecto en EAS:

```bash
eas secret:create --scope project --name GOOGLE_MAPS_ANDROID_API_KEY --value "..."
eas secret:create --scope project --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json
```

El detalle de cómo obtener cada credencial está en el documento
_FoodHub — Configuraciones manuales del entorno de desarrollo_.
