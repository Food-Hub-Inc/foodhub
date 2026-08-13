# Servidores MCP y herramientas de línea de comandos

Dos formas distintas de darle capacidades al agente:

- **MCP (Model Context Protocol):** servidores que exponen herramientas tipadas
  al agente. Útiles cuando hace falta consultar o modificar un servicio externo
  con un contrato claro (leer el esquema de la base, abrir un PR).
- **CLI:** el agente ejecuta el mismo comando que ejecutaría una persona. Más
  simple y más auditable: queda en el historial de la terminal.

**Criterio del proyecto: si un CLI resuelve la tarea, se usa el CLI.** Cada
servidor MCP consume contexto del agente aun sin usarse, así que se instalan solo
los que aportan algo que el CLI no da.

---

## Servidores MCP

### 1. Supabase — obligatorio

Es el único MCP imprescindible: le permite al agente **leer el esquema real de
la base** en lugar de suponerlo, lo que evita que escriba consultas contra
columnas que no existen.

```bash
claude mcp add --transport http supabase \
  "https://mcp.supabase.com/mcp?project_ref=<REF_DEV>&read_only=true"
```

Después: abrir Claude Code, escribir `/mcp` y completar el inicio de sesión con
OAuth. Desde 2026 ya no hace falta un token de acceso personal.

**Los dos parámetros de la URL no son opcionales:**

| Parámetro           | Por qué                                                                                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `read_only=true`    | ejecuta todo como usuario de solo lectura de Postgres: `INSERT`, `UPDATE`, `DELETE` y `DROP` se rechazan **a nivel del motor**, no por buena voluntad del agente |
| `project_ref=<ref>` | acota el servidor a un proyecto: sin esto, alcanza a **todos** los proyectos de la cuenta                                                                        |

> **Apuntar siempre al proyecto de desarrollo (`foodhub-dev`).** Nunca a
> producción. El `project_ref` está en el panel de Supabase, en Project Settings.

Las migraciones **no** se aplican por MCP: se generan con `pnpm db:generate`, se
revisan en el pull request y se aplican con `pnpm db:migrate`. Así queda
historial versionado.

### 2. GitHub — ya instalado

Permite crear ramas, abrir pull requests, leer issues y revisar código sin salir
de la sesión.

> ⚠️ **Pendiente de tu parte.** La organización `Food-Hub-Inc` tiene una política
> de acceso condicional que bloquea el token actual. Hay que aprobar el acceso
> desde la configuración de la organización. El detalle está en el documento de
> configuraciones manuales.

### 3. Notion — opcional, ya conectado

El tablero Kanban y las actas del proyecto viven en Notion. Con este MCP el
agente puede leer una tarjeta para entender el contexto de una tarea, o
actualizar el estado de una tarea al terminarla.

### 4. Chrome DevTools — opcional, para depurar el panel

```bash
claude mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest
```

Permite abrir el panel de administración, navegarlo, leer la consola y sacar
capturas. Sirve para verificar una pantalla sin describirla a mano.

**No aplica a la app móvil**: para eso se usa la build de desarrollo en el
emulador.

---

## No recomendados para este proyecto

| Servidor                   | Por qué no                                                   |
| -------------------------- | ------------------------------------------------------------ |
| Filesystem MCP             | Claude Code ya lee y escribe archivos de forma nativa        |
| Git MCP                    | el CLI de `git` es más directo y deja rastro en el historial |
| PostgreSQL genérico        | el MCP de Supabase ya cubre la base, con permisos acotados   |
| Fetch / navegador genérico | duplica capacidades que el agente ya tiene                   |

---

## Herramientas de línea de comandos

### Supabase CLI — obligatorio

```bash
npm install -g supabase
supabase --version
supabase login
supabase link --project-ref <REF_DEV>
```

| Para qué sirve             | Comando                             |
| -------------------------- | ----------------------------------- |
| Vincular el proyecto local | `supabase link --project-ref <ref>` |
| Ver el estado              | `supabase status`                   |
| Volcar el esquema          | `supabase db dump --schema public`  |
| Gestionar buckets          | `supabase storage ls`               |
| Emular en local            | `supabase start` (requiere Docker)  |

Las migraciones del esquema las gestiona **drizzle-kit**, no el CLI de Supabase:
el schema TypeScript de `packages/db` es la fuente de verdad. El CLI se usa para
todo lo demás (Storage, Auth Hooks, volcados, emulación local).

### EAS CLI — obligatorio para la app móvil

```bash
npm install -g eas-cli
eas login
eas init          # una sola vez: crea el proyecto y devuelve el EAS_PROJECT_ID
```

| Para qué sirve      | Comando                                      |
| ------------------- | -------------------------------------------- |
| Build de desarrollo | `eas build --profile development -p android` |
| Build de producción | `eas build --profile production -p android`  |
| Cargar un secreto   | `eas secret:create --scope project ...`      |
| Ver builds          | `eas build:list`                             |

El equipo **no usa Expo Go**: toda ejecución es sobre una build de EAS. Ver
`apps/mobile/EAS.md`.

### Railway CLI — despliegue de la API

```bash
npm install -g @railway/cli
railway login
railway link
```

| Para qué sirve   | Comando             |
| ---------------- | ------------------- |
| Ver logs en vivo | `railway logs`      |
| Desplegar a mano | `railway up`        |
| Ver variables    | `railway variables` |

En condiciones normales el despliegue es automático al mergear a `main`. El CLI
se usa sobre todo para diagnosticar.

### Vercel CLI — despliegue del panel admin

```bash
npm install -g vercel
vercel login
```

| Para qué sirve | Comando         |
| -------------- | --------------- |
| Vista previa   | `vercel`        |
| Producción     | `vercel --prod` |
| Ver logs       | `vercel logs`   |

### GitHub CLI — flujo de pull requests

```bash
# https://cli.github.com
gh auth login
```

| Para qué sirve       | Comando                       |
| -------------------- | ----------------------------- |
| Abrir un PR          | `gh pr create --base develop` |
| Ver el estado del CI | `gh pr checks`                |
| Revisar un PR        | `gh pr view <n> --comments`   |

---

## Resumen

| Herramienta     | Tipo | Estado          | Para qué                        |
| --------------- | ---- | --------------- | ------------------------------- |
| Supabase MCP    | MCP  | **obligatorio** | leer el esquema real de la base |
| GitHub MCP      | MCP  | instalado ⚠️    | PRs, issues, revisión de código |
| Notion MCP      | MCP  | opcional        | tablero Kanban y actas          |
| Chrome DevTools | MCP  | opcional        | depurar el panel admin          |
| Supabase CLI    | CLI  | **obligatorio** | Storage, Auth Hooks, volcados   |
| EAS CLI         | CLI  | **obligatorio** | builds de la app móvil          |
| Railway CLI     | CLI  | recomendado     | logs y despliegue de la API     |
| Vercel CLI      | CLI  | recomendado     | despliegue del panel            |
| GitHub CLI      | CLI  | recomendado     | pull requests desde la terminal |

⚠️ El MCP de GitHub necesita que se apruebe el acceso de la organización
`Food-Hub-Inc`.

---

## Regla de seguridad

**Ninguna herramienta apunta a producción durante el desarrollo.**

- Supabase MCP → `foodhub-dev`, siempre con `read_only=true`
- Supabase CLI → vinculado a `foodhub-dev`
- Railway CLI → servicio `foodhub-api-dev`

El acceso a producción se hace de forma consciente y manual, nunca desde una
sesión de trabajo con un agente.
