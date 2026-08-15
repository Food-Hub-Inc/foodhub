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

## El `.env` va en `apps/mobile`, no en la raíz

Expo carga los archivos `.env` **únicamente desde la raíz del proyecto de la
app**, y no admite configurar otra ubicación. El `.env` compartido del monorepo
no le llega: `apps/api` y `apps/admin` sí lo alcanzan (la API lista las dos
rutas en `dotenv`, Vite usa `envDir`), pero la app móvil necesita su propio
`apps/mobile/.env`.

Sin ese archivo Metro arranca igual, pero la app muere en el primer import con
`Faltan EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY`.

`EXPO_PUBLIC_API_URL` **no puede ser `localhost`**: desde el teléfono eso apunta
al propio teléfono. Va la IP de la PC en la LAN (`http://192.168.x.x:3000`), o
`http://10.0.2.2:3000` si se usa el emulador de Android Studio. Como el valor se
inyecta al bundlear, después de cambiarlo hay que reiniciar Metro con `--clear`.

Para verificar qué quedó resuelto sin levantar la app:

```bash
npx expo config --type public   # el valor aparece en extra.apiUrl
```

## Secretos

`GOOGLE_MAPS_ANDROID_API_KEY` y `google-services.json` **no se versionan**. Se
cargan como secretos del proyecto en EAS:

```bash
eas secret:create --scope project --name GOOGLE_MAPS_ANDROID_API_KEY --value "..."
eas secret:create --scope project --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json
```

Ya están cargados en los tres entornos (`development`, `preview`, `production`).
Se listan con `eas env:list --environment development`; el valor no se puede
volver a leer, solo sobrescribir.

El detalle de cómo obtener cada credencial está en el documento
_FoodHub — Configuraciones manuales del entorno de desarrollo_.

### `google-services.json` en local

Las builds de EAS lo reciben del secreto, así que para el trabajo diario
(`build:dev` + Metro) **no hace falta tenerlo en la PC**. Sí hace falta para
correr `expo prebuild` o `expo run:android` localmente: sin el archivo el plugin
de `expo-notifications` corta el prebuild.

El secreto de EAS es de solo escritura y no se puede descargar. Hay que bajarlo
de la consola de Firebase:

**Firebase Console → proyecto `foodhub-dev` → ⚙ Configuración del proyecto →
Tus apps → app Android `ar.edu.utn.foodhub.dev` → `google-services.json`**

y dejarlo en `apps/mobile/google-services.json`. Está en el `.gitignore`, así que
no se commitea.

Si la app Android todavía no existe en ese proyecto de Firebase, hay que
registrarla con el nombre de paquete `ar.edu.utn.foodhub.dev` (el de desarrollo)
antes de poder descargar el archivo.

## Cómo depurar un fallo de la fase Prebuild

EAS reporta estos fallos como `Unknown error. See logs of the Prebuild build
phase`, que no dice nada. El mensaje real se consigue corriendo la misma fase en
local. Como el `google-services.json` no está en el repositorio, hay que
apuntar la variable a una copia cualquiera para que el plugin no corte antes:

```bash
cd apps/mobile
APP_ENV=development GOOGLE_SERVICES_JSON=/ruta/a/google-services.json \
  npx expo prebuild --platform android --no-install
rm -rf android   # el proyecto es CNG: el directorio nativo no se versiona
```

## Los PNG de `assets/` son provisorios

`app.config.ts` referencia `adaptive-icon.png`, `splash.png` y
`notification-icon.png`. Sin esos tres archivos el prebuild aborta con
`ENOENT ... adaptive-icon.png` y la build falla en EAS.

`adaptive-icon.png` ya es el isotipo real (`IsotipoFoodHub.png` del PDF de
maquetación), centrado en la zona segura del 66% sobre fondo
`--color-surface`. `splash.png` y `notification-icon.png` siguen siendo
**marcadores de posición** generados con los colores de la guía visual
(`#EC6829` y `#FAFAF7`), no la identidad definitiva. Hay que reemplazarlos por
el arte real **antes de armar la build de `production`**:

| Archivo                 | Tamaño    | Requisito                                                    | Estado       |
| ----------------------- | --------- | ------------------------------------------------------------ | ------------ |
| `adaptive-icon.png`     | 1024×1024 | capa frontal; Android recorta al 66% central                 | isotipo real |
| `splash.png`            | 1024×1024 | se dibuja sobre `#FAFAF7`, con `resizeMode: contain`         | placeholder  |
| `notification-icon.png` | 96×96     | silueta blanca sobre transparente; Android descarta el color | placeholder  |

Un cambio en `adaptive-icon.png` (o en `adaptiveIcon.backgroundColor` de
`app.config.ts`) no se ve con Metro/hot reload: es un recurso nativo que se
empaqueta en el `prebuild`. Para verlo en el teléfono hace falta una build
nueva (`pnpm --filter @foodhub/mobile run build:dev`) e instalarla; como
`development` conserva el mismo `applicationId`, instalar el APK nuevo
reemplaza al anterior sin desinstalar a mano.

## `userInterfaceStyle`

`app.config.ts` declara `userInterfaceStyle: 'light'`. Para que Android respete
esa declaración en vez de seguir al tema del sistema hace falta `expo-system-ui`,
que **ya está instalado** (`~57.0.2`). Si el prebuild vuelve a avisar
`userInterfaceStyle: Install expo-system-ui in your project to enable this
feature`, es que el paquete se perdió de las dependencias:

```bash
pnpm --filter @foodhub/mobile exec npx expo install expo-system-ui
```
