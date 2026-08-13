# Capítulo 07 · Arquitectura y entornos

---

## Componentes

```
┌─────────────────┐         ┌─────────────────┐
│  App Android    │         │  Panel admin    │
│  Expo SDK 57    │         │  React 19 +Vite │
│  HeroUI Native  │         │  HeroUI v3      │
└────────┬────────┘         └────────┬────────┘
         │                           │
         │   ┌───────────────────────┘
         │   │        HTTPS · JWT en Authorization
         ▼   ▼
   ┌───────────────────────────┐
   │   API REST                │
   │   Node 22 + Express 5     │──── verifica JWT contra el JWKS de Supabase
   │   Drizzle ORM             │
   └────────────┬──────────────┘
                │
     ┌──────────┴──────────┬─────────────────┐
     ▼                     ▼                 ▼
┌──────────┐      ┌─────────────────┐  ┌──────────┐
│PostgreSQL│      │ Supabase Auth   │  │ Supabase │
│+ PostGIS │      │ (GoTrue)        │  │ Storage  │
└──────────┘      └─────────────────┘  └──────────┘

Servicios externos: Firebase Cloud Messaging (push) · Google Maps (mapa)
```

### Dos flujos que no pasan por la API

Son deliberados y hay que tenerlos presentes al implementar:

1. **Login.** El cliente habla directo con Supabase Auth. Por eso el registro de
   logins fallidos (US-AUD-01) necesita un **Auth Hook** y no puede resolverse
   en un middleware.
2. **Subida de imágenes.** El archivo va del dispositivo directo a Supabase
   Storage con una URL firmada que emite el backend. La API nunca procesa
   binarios; su límite de body es 1 MB.

---

## Tecnologías por componente

| Componente     | Lenguaje   | Framework / librería            | Versión   |
| -------------- | ---------- | ------------------------------- | --------- |
| App móvil      | TypeScript | Expo SDK + React Native         | 57 / 0.86 |
| UI móvil       | —          | HeroUI Native + Uniwind         | 1.0.8     |
| Panel admin    | TypeScript | React + Vite                    | 19 / 8    |
| UI web         | —          | HeroUI + Tailwind CSS           | 3.2 / 4.3 |
| API            | TypeScript | Node.js + Express               | 22 / 5.2  |
| ORM            | TypeScript | Drizzle ORM                     | 0.45      |
| Base de datos  | SQL        | PostgreSQL + PostGIS            | 17        |
| Autenticación  | —          | Supabase Auth (GoTrue)          | —         |
| Almacenamiento | —          | Supabase Storage                | —         |
| Push           | —          | FCM + Expo Notifications        | —         |
| Mapas          | —          | react-native-maps + Google Maps | 1.29      |

**TypeScript se fija en la línea 6.0.x, no 7.x.** typescript-eslint declara
`typescript <6.1.0` como peer y TS 7 todavía no expone la API programática
estable que el linter necesita (llega en 7.1).

---

## Entornos

| Componente    | Desarrollo                     | Producción                    |
| ------------- | ------------------------------ | ----------------------------- |
| App móvil     | EAS Build perfil `development` | EAS Build perfil `production` |
| Panel admin   | Vite en `localhost:5173`       | Vercel                        |
| API           | `localhost:3000`               | Railway                       |
| Base de datos | Supabase `foodhub-dev`         | Supabase `foodhub-prod`       |
| Storage       | Supabase `foodhub-dev`         | Supabase `foodhub-prod`       |
| Push          | Firebase proyecto dev          | Firebase proyecto prod        |

**Dos proyectos de Supabase completamente separados.** Comparten la
infraestructura subyacente, así que el comportamiento es idéntico y las pruebas
de integración son válidas, pero los datos y las credenciales no se mezclan.

### El equipo no usa Expo Go

Se trabaja siempre sobre una build de EAS, incluso en el día a día. Expo Go es un
contenedor genérico que no incluye `react-native-maps`, `expo-notifications` con
`google-services.json` propio ni Reanimated 4: con él, esas pantallas fallan en
ejecución.

Los `applicationId` de desarrollo y producción son **distintos**
(`ar.edu.utn.foodhub.dev` y `ar.edu.utn.foodhub`), así conviven las dos apps
instaladas en el mismo teléfono.

Detalle en `apps/mobile/EAS.md`.

---

## Estructura del monorepo

```
foodhub/
├── apps/
│   ├── mobile/      Expo · producto principal
│   ├── admin/       Vite · panel de administración
│   └── api/         Express · API REST
├── packages/
│   ├── shared/      contratos zod, enums del dominio
│   ├── db/          schema Drizzle + migraciones
│   └── config/      presets de tsconfig
└── .github/         CI y plantilla de PR
```

Monorepo con **Turborepo + pnpm**: un solo PR puede tocar API y cliente sin que
los tipos se desincronicen, con una sola configuración de ESLint y un solo CI.

### Capas de la API

```
middleware → router → service → repository → PostgreSQL
```

- Un **router** no consulta la base.
- Un **service** no recibe `req` ni `res`.
- Un **repository** no decide reglas de negocio.

---

## Decisiones de infraestructura documentadas

**Sin cola de mensajes en el MVP** (punto 1.3.1.12). Los dos candidatos a
procesamiento en segundo plano se resuelven de otra forma: las notificaciones
tardan menos de 200 ms por FCM y se envían dentro del handler; las imágenes ni
siquiera pasan por el servidor. Incorporar Redis + BullMQ agregaría complejidad
operativa sin beneficio proporcional.

**Un solo proceso periódico:** la expiración automática de pedidos sin responder
(US-PED-10).

**Límites del plan gratuito a tener presentes:**

| Servicio         | Límite                                      |
| ---------------- | ------------------------------------------- |
| Supabase Storage | 1 GB de almacenamiento · 2 GB de egreso/mes |
| Firebase (Spark) | payload máximo 4 KB por mensaje             |
| Google Maps      | USD 200 de crédito mensual (≈28.500 cargas) |
