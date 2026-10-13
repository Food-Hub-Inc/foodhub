# CLAUDE.md — FoodHub

Guía operativa para agentes de IA que trabajen sobre este repositorio.
Si sos una persona, leé `README.md`: esto es lo mismo pero en el registro que
un agente necesita.

---

## Qué es esto

FoodHub conecta cocineros caseros con consumidores locales. Es el Proyecto
Final 2026 de Ingeniería en Sistemas de Información — UTN FRM, Grupo 21.

Monorepo con tres aplicaciones desplegables y tres paquetes compartidos:

```
apps/mobile      Expo SDK 57 + React Native 0.86 + HeroUI Native   (producto principal, Android)
apps/admin       React 19 + Vite 8 + HeroUI v3                     (panel de administración web)
apps/api         Node 22 + Express 5 + Drizzle ORM                 (API REST)
packages/shared  contratos zod, enums del dominio
packages/db      schema Drizzle + migraciones
packages/config   presets de tsconfig
```

---

## Reglas que no se negocian

**1. No inventes requerimientos.** Todo lo que se implementa tiene que estar en
la documentación del proyecto. Si un detalle no está definido, preguntá antes
de codificar; no completes el hueco con una suposición razonable.

**2. La fuente de verdad es el Drive del proyecto, en su última versión.**
Cada carpeta del Drive guarda el documento vigente y, en su subcarpeta
`Versiones …`, el historial con fecha (`DD/MM/AAAA_VN_<nombre>`). La copia de
`../Docs/` puede estar desactualizada: ante una diferencia, manda el Drive.

| Documento (Drive)                          | Para qué                                   |
| ------------------------------------------ | ------------------------------------------ |
| `FoodHub - Documentación de Proyecto.docx` | historias de usuario, requisitos, alcances |
| `DG13092026_V7.drawio`                     | diagrama de clases **vigente** (43 clases) |
| `Pantallas Mockup FoodHub.pdf`             | 30+ pantallas y la guía visual del sistema |

Los diagramas anteriores (`DG13072026_V3`, `DG12082026_V4`, `DG12082026_V5`
y el V6) quedaron reemplazados por el V7. No uses ninguno de ellos.

**3. Trazabilidad en cada cambio.** Todo trabajo se ancla a una US o CU. El
mensaje de commit lleva el módulo; el PR lleva la US y la pantalla.

**4. Los mensajes de error al usuario son literales.** Los criterios de
aceptación fijan textos exactos ("Las contraseñas no coinciden.", "Tu cuenta se
encuentra suspendida. Contactá al soporte."). Cambiarlos rompe las pruebas
funcionales de la Etapa 6. Están centralizados en `packages/shared`.

**5. Los tokens de diseño se copian, no se eligen.** Los colores, tipografías y
radios salen de la guía visual (sección 00 del PDF de maquetación) y viven en
`apps/admin/src/styles/global.css` y `apps/mobile/global.css`. Nunca escribas un
color literal en un componente.

---

## Decisiones de arquitectura ya tomadas

No las revierta sin consultarlo con el equipo.

| Decisión               | Detalle                                                                                                                                   |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Autenticación**      | Supabase Auth (GoTrue). La API **solo verifica** el JWT contra el JWKS.                                                                   |
| **Base de datos**      | PostgreSQL + PostGIS en Supabase. Drizzle ORM para schema y migraciones.                                                                  |
| **Almacenamiento**     | Supabase Storage. La imagen va del dispositivo al bucket por URL firmada; nunca pasa por la API.                                          |
| **Hosting de la API**  | Railway (dos servicios: dev y prod).                                                                                                      |
| **Ambientes**          | Dos proyectos de Supabase separados: `foodhub-dev` y `foodhub-prod`.                                                                      |
| **Distribución móvil** | EAS Build en **los tres perfiles**. **Expo Go está descartado** (ver `apps/mobile/EAS.md`).                                               |
| **TypeScript**         | Línea **6.0.x**, no 7.x. typescript-eslint declara `typescript <6.1.0` y TS 7 todavía no expone la API programática estable que necesita. |
| **Análisis estático**  | ESLint 10 (flat config) + Prettier 3. Config única en la raíz.                                                                            |

### Por qué el diagrama vigente no tiene Sesion ni SolicitudRecuperacionContrasena

Porque las gestiona GoTrue. `IntentoLoginFallido` se fusionó en
**`EventoSeguridad`**, que cubre los dos criterios de US-AUD-01: login fallido
(vía Auth Hook de Supabase) y acceso denegado por rol (vía el middleware
`requiereRol` de la API).

---

## Comandos

```bash
pnpm install              # instalar todo el monorepo
pnpm dev                  # levantar todas las apps
pnpm lint                 # ESLint sobre el repositorio completo
pnpm lint:fix             # + autofix
pnpm format               # Prettier
pnpm typecheck            # tsc --noEmit en los 5 workspaces
pnpm test                 # pruebas

pnpm db:generate          # generar migración a partir del schema
pnpm db:migrate           # aplicar migraciones pendientes
pnpm db:studio            # explorador visual de la base

pnpm --filter @foodhub/api   run dev          # solo la API
pnpm --filter @foodhub/admin run dev          # solo el panel
pnpm --filter @foodhub/mobile run start       # Metro (requiere build de EAS instalada)
```

**Antes de dar por terminada una tarea:** `pnpm lint && pnpm typecheck && pnpm test`.
Los tres tienen que pasar. El CI corre ESLint con `--max-warnings 0`, así que una
advertencia también rompe el build.

---

## Convenciones de código

- **Idioma:** el dominio se nombra en español (`usuario`, `pedido`,
  `crearPedido`). Los términos técnicos quedan en inglés (`Router`, `Provider`,
  `middleware`). El código existente ya sigue esto; imitalo.
- **Base de datos:** `snake_case` en las columnas, `camelCase` en el TypeScript.
  Drizzle mapea solo con `casing: 'snake_case'`.
- **Commits:** `tipo(modulo): descripción breve en minúsculas`.
  Tipos: `feat` `fix` `docs` `refactor` `test` `chore`. El scope es obligatorio.
  El hook `commit-msg` rechaza lo que no cumpla.
- **Ramas:** `feature/nombre` y `fix/nombre`, siempre desde `develop`.
  Nunca se commitea directo a `main`.
- **Comentarios:** explicá _por qué_, no _qué_. Un comentario que repite lo que
  el código ya dice es ruido; uno que explica una restricción no obvia (un
  límite del pooler, una regla de negocio, un bug de una librería) vale oro.

---

## Trampas conocidas

**`prepare: false` en el cliente de Postgres.** El pooler de Supabase en modo
transaction (puerto 6543) no conserva estado entre sentencias y los prepared
statements dependen de él. Ya está configurado en `packages/db/src/index.ts`; no
lo saques.

**`node-linker=hoisted` en `.npmrc`.** Metro no resuelve los symlinks anidados
de pnpm. Si lo cambiás, la app móvil deja de compilar.

**`app.set('trust proxy', 1)` en la API.** Sin esto, detrás del proxy de Railway
todas las requests parecen venir de la misma IP: el rate limiting agrupa a todos
los usuarios en un contador y `evento_seguridad` registra siempre la misma IP.

**`uniwind-types.d.ts` es generado.** Metro lo reescribe en el primer arranque.
El archivo versionado es un stub mínimo para que `tsc` y el editor anden en un
clon recién hecho.

**Las claves `EXPO_PUBLIC_*` y `VITE_*` viajan dentro del bundle.** Cualquiera
que descargue el APK las puede leer. La `SUPABASE_SERVICE_ROLE_KEY` y la
`DATABASE_URL` van **solo** en `apps/api`.

**Los snapshots de precio en `item_pedido` son intencionales.** Congelan el
plato al confirmar el pedido. Sin ellos, editar una publicación cambiaría el
importe de pedidos ya cerrados.

---

## Al tocar el modelo de datos

1. Actualizá primero el diagrama vigente en el Drive (hoy `DG13092026_V7.drawio`),
   siguiendo el esquema de versiones de su carpeta.
2. Reflejá el cambio en `packages/db/src/schema/`.
3. `pnpm db:generate` y revisá el SQL generado antes de commitearlo.
4. Si el cambio afecta un contrato de API, actualizá también `packages/shared`.

Nunca uses `db:push` contra producción: sobrescribe el esquema sin dejar
historial de migraciones.
