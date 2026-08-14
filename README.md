# FoodHub

Plataforma que conecta cocineros caseros con consumidores locales.

Proyecto Final 2026 · Ingeniería en Sistemas de Información · UTN FRM · Grupo 21

---

## Estructura

```
foodhub/
├── apps/
│   ├── mobile/      App Android · Expo SDK 57 + React Native 0.86 + HeroUI Native
│   ├── admin/       Panel web  · React 19 + Vite 8 + HeroUI v3
│   └── api/         API REST   · Node 22 + Express 5 + Drizzle ORM
├── packages/
│   ├── shared/      Contratos zod y enums del dominio
│   ├── db/          Schema Drizzle + migraciones (PostgreSQL + PostGIS)
│   └── config/      Presets de tsconfig
├── .github/         CI y plantilla de pull request
├── eslint.config.mjs
├── prettier.config.mjs
└── turbo.json
```

## Requisitos

| Herramienta | Versión | Cómo instalarla                        |
| ----------- | ------- | -------------------------------------- |
| Node.js     | ≥ 22    | https://nodejs.org                     |
| pnpm        | ≥ 11    | `npm install -g pnpm`                  |
| Git         | ≥ 2.40  | https://git-scm.com                    |
| EAS CLI     | ≥ 21    | `npm install -g eas-cli` (solo mobile) |

## Puesta en marcha

```bash
git clone https://github.com/Food-Hub-Inc/foodhub.git
cd foodhub
pnpm install

cp .env.example .env
# Completar el .env siguiendo el documento
# "FoodHub — Configuraciones manuales del entorno de desarrollo"

pnpm db:migrate      # crear el esquema en el proyecto de Supabase de desarrollo
pnpm dev             # levantar API + panel admin
```

Para la app móvil, ver [`apps/mobile/EAS.md`](apps/mobile/EAS.md).
**El equipo no usa Expo Go**: se trabaja siempre sobre una build de EAS.

## Comandos

| Comando            | Qué hace                                 |
| ------------------ | ---------------------------------------- |
| `pnpm dev`         | Levanta todas las aplicaciones           |
| `pnpm lint`        | ESLint sobre todo el monorepo            |
| `pnpm lint:fix`    | ESLint con autofix                       |
| `pnpm format`      | Formatea con Prettier                    |
| `pnpm typecheck`   | `tsc --noEmit` en los cinco workspaces   |
| `pnpm test`        | Pruebas                                  |
| `pnpm db:generate` | Genera una migración a partir del schema |
| `pnpm db:migrate`  | Aplica las migraciones pendientes        |
| `pnpm db:studio`   | Explorador visual de la base             |

## Ambientes

| Componente     | Desarrollo                     | Producción                    |
| -------------- | ------------------------------ | ----------------------------- |
| App móvil      | EAS Build perfil `development` | EAS Build perfil `production` |
| Panel admin    | Vite en `localhost:5173`       | Vercel                        |
| API            | `localhost:3000`               | Railway                       |
| Base + Storage | Supabase `foodhub-dev`         | Supabase `foodhub-prod`       |

## Flujo de trabajo

Ramas: `main` (producción) ← `develop` (integración) ← `feature/*` y `fix/*`.

Todo merge a `develop` requiere pull request aprobado por alguien distinto del
autor. Commits en formato `tipo(modulo): descripción breve en minúsculas`; los
hooks de husky validan el formato y corren el linter antes de dejar commitear.

Detalle completo en el punto 1.2.4 del documento de proyecto.

## Documentación

La documentación funcional vive fuera del repositorio, en `../Docs/`:

- `FoodHub - Documentación de Proyecto.md` — requisitos, historias de usuario, alcances
- `FoodHub - DG12082026_V5.drawio` — diagrama de clases vigente
- `FoodHub - Pantallas Mockup FoodHub.pdf` — maquetación y guía visual

## Equipo

| Integrante         | Rol                            |
| ------------------ | ------------------------------ |
| Aguilar, Ezequiel  | DBA · Backend                  |
| Blangetti, Facundo | UX/UI · Frontend               |
| Cáceres, Felipe    | PM · Analista funcional        |
| Ocampo, Nicolás    | Líder de desarrollo · Frontend |
| Pacci, Facundo     | QA · Backend                   |
| Telo, Matías       | Analista funcional · QA        |
