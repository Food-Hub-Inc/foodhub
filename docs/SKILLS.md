# Repertorio de skills

Las **skills** son paquetes de instrucciones que el agente de IA carga solo
cuando la tarea las necesita. Se instalan con el CLI
[`skills`](https://github.com/vercel-labs/skills) (`npx skills`), que es
compatible con Claude Code, Cursor, Codex, Copilot y otros 70 agentes.

El repertorio de FoodHub tiene **16 skills**: 12 de la comunidad (todas de
autores oficiales del stack) y 4 escritas para este proyecto.

Todo queda versionado en el repositorio:

- `.claude/skills/` — el contenido de cada skill
- `skills-lock.json` — origen y hash de cada una de las importadas, para que
  todo el equipo tenga exactamente la misma versión

---

## Instalación en un clon nuevo

```bash
npx skills experimental_install
```

Restaura todas las skills desde `skills-lock.json`. Las cuatro propias ya vienen
en el repositorio, así que no hace falta hacer nada con ellas.

Comandos útiles:

```bash
npx skills list              # ver qué hay instalado
npx skills find "postgres"   # buscar en el registro
npx skills update            # actualizar a la última versión
```

---

## Skills propias

Escritas para este proyecto. Viven en `.claude/skills/` y se versionan con el
código.

### `foodhub` — conocimiento del proyecto

El agente sabe **qué pide la documentación** antes de escribir código. Organizada
por capítulos en `resources/`, que se leen bajo demanda:

| Capítulo | Contenido                                                                            |
| -------- | ------------------------------------------------------------------------------------ |
| 00       | índice de las 81 historias de usuario por módulo                                     |
| 01       | visión, objetivos, los 13 módulos y qué queda fuera de alcance                       |
| 02       | modelo de datos: 45 entidades y criterio de traducción a tablas                      |
| 03       | módulos transversales: auth, usuarios, seguridad, auditoría                          |
| 04       | módulos funcionales: publicaciones, búsqueda, pedidos, reseñas, chat, notificaciones |
| 05       | información y control: dashboard, panel admin, configuración, ayuda                  |
| 06       | inventario de las 30+ pantallas y navegación                                         |
| 07       | arquitectura, tecnologías por componente y entornos                                  |
| 08       | glosario, nomenclatura de códigos y reglas del proyecto                              |

El `SKILL.md` funciona como índice: dice qué capítulo abrir según la tarea, y
resume las ocho reglas de negocio que más errores de implementación generan.

### `codigo-limpio` — Clean Code, SOLID y patrones

Traduce los principios a decisiones concretas sobre **este** stack, con los
umbrales que ESLint verifica de verdad (`complexity: 12`, `max-depth: 4`,
`max-lines-per-function: 80`, `max-params: 4`). Incluye la arquitectura por
capas de la API, un catálogo de code smells con su antídoto y la lista de
verificación previa a un pull request.

### `ux-ui-foodhub` — sistema de diseño

Los tokens exactos de la guía visual aprobada en la Etapa 5: la paleta completa
con sus doce colores, la escala tipográfica de Plus Jakarta Sans y los radios.
Incluye los principios de UX aplicados al caso, las reglas específicas de móvil,
accesibilidad y los mensajes de error literales que exigen los criterios de
aceptación.

Complementa a `heroui-native` y `heroui-react`: aquéllas explican **cómo se usa
la librería**, ésta define **qué construimos con ella**.

### `flujo-de-trabajo` — método de trabajo

Los cinco pasos obligatorios (entender → planificar → implementar → verificar →
entregar), cuándo hay que preguntar en vez de decidir solo, la definición de
terminado y los antipatrones. Existe para que ninguna tarea se declare completa
sin haberla ejecutado.

---

## Skills de la comunidad

Todas provienen de los autores oficiales de cada tecnología del stack.

### Expo — `expo/skills`

Repositorio oficial de Expo.

| Skill                    | Para qué                                                   |
| ------------------------ | ---------------------------------------------------------- |
| `expo-router`            | ruteo basado en archivos, el que usa `apps/mobile`         |
| `expo-dev-client`        | builds de desarrollo — **clave**: el equipo no usa Expo Go |
| `expo-project-structure` | organización de carpetas de un proyecto Expo               |
| `expo-data-fetching`     | fetch, React Query, caché, offline y manejo de errores     |
| `expo-tailwind-setup`    | Tailwind v4 en React Native (Uniwind)                      |
| `eas-app-stores`         | perfiles de `eas.json`, versiones y publicación            |
| `expo-upgrade`           | subir de versión de SDK sin romper nada                    |

### Supabase — `supabase/agent-skills`

Repositorio oficial de Supabase.

| Skill                              | Para qué                                             |
| ---------------------------------- | ---------------------------------------------------- |
| `supabase`                         | Auth, Storage, RLS, migraciones y el CLI             |
| `supabase-postgres-best-practices` | diseño de esquema, índices y consultas en PostgreSQL |

### HeroUI — `heroui-inc/heroui`

Repositorio oficial de HeroUI.

| Skill           | Para qué                                               |
| --------------- | ------------------------------------------------------ |
| `heroui-native` | componentes de la app móvil (`apps/mobile`)            |
| `heroui-react`  | componentes del panel de administración (`apps/admin`) |

### React Native — `callstackincubator/agent-skills`

Callstack es uno de los principales contribuyentes del ecosistema React Native.

| Skill                         | Para qué                                             |
| ----------------------------- | ---------------------------------------------------- |
| `react-native-best-practices` | rendimiento, arquitectura y errores frecuentes en RN |

---

## Criterio de selección

Una skill entra al repertorio si cumple **las cuatro** condiciones:

1. **Autor oficial o referente reconocido** de la tecnología. Nada de skills
   anónimas: sus instrucciones influyen en el código que se escribe.
2. **Corresponde a una tecnología que el proyecto usa de verdad.** No se instalan
   skills "por si acaso": cada una consume contexto del agente.
3. **Adopción verificable** en el registro público (skills.sh).
4. **Se mantiene al día** con la versión del stack que usamos.

Por eso quedaron **fuera** skills de Next.js, Prisma o Tailwind para web pura:
son buenas, pero este proyecto no usa esas tecnologías y solo agregarían ruido.

---

## Cómo agregar una skill nueva

```bash
npx skills find "<lo que necesito>"
npx skills add <owner>/<repo> -s <nombre-skill> -a claude-code -y
```

Después: commitear `.claude/skills/` y `skills-lock.json` juntos, y documentar
acá por qué se agregó.

> **Ojo con el nombre del agente:** es `claude-code`, no `claude`. Y `-s` acepta
> un solo nombre por bandera: para varias, repetí la bandera.
