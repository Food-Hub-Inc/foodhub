# Despliegue en planes gratuitos

La API corre en **Render** y el panel de administración en **Cloudflare Pages**.
Las dos plataformas despliegan desde la rama `main` del repositorio en GitHub.
La base, Auth y Storage siguen en el proyecto `foodhub-prod` de Supabase.

| Componente  | Plataforma       | Configuración                                  |
| ----------- | ---------------- | ---------------------------------------------- |
| API         | Render (free)    | `render.yaml` en la raíz (Blueprint)           |
| Panel admin | Cloudflare Pages | dashboard de Cloudflare (ver paso 2)           |
| App móvil   | EAS Build        | sin cambios; solo cambia `EXPO_PUBLIC_API_URL` |

El orden importa: la API necesita la URL del panel para CORS, y el panel
necesita la URL de la API al compilar. Se despliega la API, después el panel, y
se vuelve a la API a completar las dos variables que faltaban.

---

## 0 · Antes de empezar

- Las migraciones de `foodhub-prod` tienen que estar al día. Con la
  `DATABASE_URL` de producción en el `.env`: `pnpm db:migrate`.
- Una API key de Resend con permiso de envío. Con `APP_ENV=production` la API
  no arranca sin `RESEND_API_KEY`.

## 1 · API en Render

1. Dashboard → **New → Blueprint** → elegir el repositorio. Render lee
   `render.yaml` y propone el servicio `foodhub-api`.
2. Completar los secretos que pide (los marcados `sync: false`), con las
   credenciales de `foodhub-prod`:

   | Variable                    | De dónde sale                                              |
   | --------------------------- | ---------------------------------------------------------- |
   | `DATABASE_URL`              | Supabase → Connect → ORMs. **El pooler, puerto 6543.**     |
   | `SUPABASE_URL`              | Supabase → Project Settings → Data API                     |
   | `SUPABASE_ANON_KEY`         | ídem, clave publishable                                    |
   | `SUPABASE_SERVICE_ROLE_KEY` | ídem, clave secreta                                        |
   | `RESEND_API_KEY`            | Resend → API Keys                                          |
   | `RESEND_REMITENTE`          | `FoodHub <casilla@dominio-verificado>`                     |
   | `EXPO_ACCESS_TOKEN`         | Expo → Access tokens (vacío si no hay Enhanced Security)   |
   | `CORS_ORIGINS`              | por ahora `http://localhost:5173`; se corrige en el paso 3 |
   | `URL_INVITACION_PANEL`      | por ahora `http://localhost:5173/nueva-password`; ídem     |

3. Esperar el primer deploy y verificar `https://foodhub-api.onrender.com/salud`
   (el subdominio exacto lo muestra Render).

**El pooler es obligatorio.** Render solo sale por IPv4 y la conexión directa de
Supabase (puerto 5432, `db.<ref>.supabase.co`) es solo IPv6.

## 2 · Panel en Cloudflare Pages

Workers & Pages → **Create → Pages → Connect to Git** → elegir el repositorio.

| Campo                  | Valor                                                                                               |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| Production branch      | `main`                                                                                              |
| Framework preset       | None                                                                                                |
| Build command          | `corepack enable && pnpm install --frozen-lockfile && pnpm turbo run build --filter=@foodhub/admin` |
| Build output directory | `apps/admin/dist`                                                                                   |
| Root directory         | vacío (la raíz del monorepo)                                                                        |

Variables de entorno (Settings → Variables and Secrets, ambiente Production):

| Variable                          | Valor                                      |
| --------------------------------- | ------------------------------------------ |
| `NODE_VERSION`                    | `22`                                       |
| `SKIP_DEPENDENCY_INSTALL`         | `1`                                        |
| `COREPACK_ENABLE_DOWNLOAD_PROMPT` | `0`                                        |
| `VITE_API_URL`                    | la URL de Render del paso 1, sin `/` final |
| `VITE_SUPABASE_URL`               | la de `foodhub-prod`                       |
| `VITE_SUPABASE_ANON_KEY`          | la publishable de `foodhub-prod`           |

`SKIP_DEPENDENCY_INSTALL` evita que Pages instale con su propia versión de pnpm
antes del build command: el lockfile es de pnpm 11 y la instalación se hace con
corepack, que respeta el `packageManager` del `package.json`.

Las `VITE_*` se embeben en el bundle **al compilar**. Si cambia alguna, hay que
volver a desplegar (Deployments → Retry deployment); no alcanza con guardarla.

**No hace falta `_redirects`.** El panel usa `BrowserRouter`, y Pages trata como
SPA a todo proyecto sin `404.html` en la raíz del build: cualquier ruta
desconocida devuelve `index.html`. Una regla `/* /index.html 200` además la
marca como bucle infinito y la ignora.

Opcional: en Settings → Builds → Build watch paths, incluir solo `apps/admin/*`
y `packages/*`, para que un commit de la app móvil o de la API no dispare un
build del panel.

## 3 · Cerrar el circuito

1. **Render**: con la URL del panel (`https://<proyecto>.pages.dev`), actualizar
   - `CORS_ORIGINS=https://<proyecto>.pages.dev`
   - `URL_INVITACION_PANEL=https://<proyecto>.pages.dev/nueva-password`

   y guardar; Render redespliega solo.

2. **Supabase** (`foodhub-prod`) → Authentication → URL Configuration →
   Redirect URLs: agregar `https://<proyecto>.pages.dev/nueva-password`. GoTrue
   descarta **en silencio** cualquier `redirectTo` que no esté en esa lista, y la
   invitación de administradores (US-GURP-06) llega con un enlace que no abre el
   panel.

3. **App móvil**: `EXPO_PUBLIC_API_URL` se embebe en el APK. Actualizarla en las
   variables de EAS del ambiente que corresponda y generar una build nueva; las
   builds anteriores siguen apuntando a la URL vieja de Railway.

## 4 · Verificación

- [ ] `GET /salud` responde 200.
- [ ] Login en el panel con un administrador: si falla con un error de red en
      la consola del navegador, revisar `CORS_ORIGINS`.
- [ ] Recargar el navegador estando en una ruta interna (`/usuarios`): tiene que
      volver a cargar el panel, no un 404.
- [ ] Invitar un administrador de prueba y abrir el enlace del correo.
- [ ] **IP real del cliente.** `app.set('trust proxy', 1)` asume un único proxy
      delante de la API. Provocar un acceso denegado por rol (un token de
      cliente contra un endpoint del panel): la IP que `requiereRol` registra
      en `evento_seguridad` tiene que ser la propia y no una de Render. Si
      siempre aparece la misma IP para todos, el rate limiting está contando a
      todos los usuarios juntos y hay que revisar ese valor. (El login fallido
      no sirve para esta prueba: lo registra el Auth Hook de Supabase, no la
      API.)

---

## Limitaciones del plan gratuito de Render

- **Se duerme a los 15 minutos sin tráfico** y tarda entre 30 y 60 segundos en
  responder la primera request al despertar.
- **Mientras duerme no salen notificaciones push.** El planificador
  (`modules/notificaciones/planificador.ts`) es un `setInterval` dentro del
  proceso: lo pendiente se despacha recién al despertar. La expiración de
  pedidos no se ve afectada porque la resuelve `pg_cron` dentro de PostgreSQL.
- **750 horas de instancia por mes, compartidas por todo el workspace.** Un
  servicio despierto todo el mes consume ~744. Mantener la API despierta con un
  ping externo a `/salud` (cron-job.org, UptimeRobot) agota la cuota si en el
  mismo workspace hay otro servicio gratuito, y al agotarse Render suspende
  **todos** los servicios gratuitos del workspace hasta el mes siguiente.
- **Una sola instancia.** La presencia del módulo de notificaciones vive en
  memoria; el plan gratuito no escala horizontalmente, así que no hay conflicto.
