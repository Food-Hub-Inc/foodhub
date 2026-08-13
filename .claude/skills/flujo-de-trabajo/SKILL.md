---
name: flujo-de-trabajo
description: 'Método de trabajo obligatorio para cualquier tarea de desarrollo en FoodHub: cómo encarar una funcionalidad, una corrección o un refactor, y cómo validar que quedó bien antes de darla por terminada. Usar AL EMPEZAR cualquier tarea de código y ANTES de declararla completa. Palabras clave: implementar, desarrollar, agregar funcionalidad, corregir bug, refactorizar, terminar tarea, validar, verificar, definición de terminado, pull request, commit, sprint, historia de usuario.'
metadata:
  proyecto: FoodHub - UTN FRM - Grupo 21
  version: '1.0.0'
---

# Flujo de trabajo

Este proyecto tiene 81 historias de usuario, 95 requisitos funcionales, 30+
pantallas y una cátedra que evalúa la trazabilidad entre todo eso. El método no
es burocracia: es lo que evita que se programe algo que nadie pidió o que quede
sin conectar con la documentación.

**Regla de oro:** ninguna tarea se declara terminada sin haberla verificado
ejecutando algo. "Debería andar" no es una verificación.

---

## Los cinco pasos

```
1. ENTENDER   → qué se pide y de dónde sale
2. PLANIFICAR → qué archivos se tocan y en qué orden
3. IMPLEMENTAR→ el cambio más chico que funciona
4. VERIFICAR  → ejecutar, no suponer
5. ENTREGAR   → commit trazable + PR
```

No se saltea ninguno. Los pasos 1 y 4 son los que más se saltean y los que más
retrabajo evitan.

---

## Paso 1 · Entender

**Antes de escribir una línea**, respondé estas cuatro preguntas. Si no podés
responder alguna, **preguntá; no supongas**.

| Pregunta                                 | Dónde se responde                        |
| ---------------------------------------- | ---------------------------------------- |
| ¿Qué historia de usuario cubre?          | skill `foodhub` → capítulo del módulo    |
| ¿Cuáles son los criterios de aceptación? | la US los lista uno por uno              |
| ¿Qué pantalla es?                        | `PAN-XXX-NN` en el PDF de maquetación    |
| ¿Qué entidades toca?                     | diagrama `DG12082026_V4` y `packages/db` |

### Cuándo hay que preguntar y no decidir solo

- El requerimiento admite dos lecturas razonables.
- Falta un criterio de aceptación para un caso de borde real.
- La implementación obliga a cambiar el modelo de datos.
- Hay que agregar una dependencia nueva.
- El diseño no cubre un estado (vacío, error, sin permiso).

> No inventes requerimientos. Es preferible una pregunta a medio sprint que una
> funcionalidad que hay que rehacer.

---

## Paso 2 · Planificar

Escribí el plan antes de tocar el código. Para una tarea chica alcanzan tres
líneas; para una funcionalidad completa, algo así:

```
US-PED-03 · Aceptar pedido

  packages/shared   validar la transición CREADO → ACEPTADO
  packages/db       (sin cambios: la tabla ya existe)
  apps/api          services/pedidos.service.ts  → aceptarPedido()
                    routers/pedidos.router.ts    → POST /pedidos/:id/aceptar
                    notificar al cliente (US-NOT-02)
  apps/mobile       PAN-PED-04 → botón + estado optimista

  Riesgos: dos cocineros aceptando el mismo pedido a la vez → transacción
```

**Orden recomendado: de adentro hacia afuera.** Contrato → datos → servicio →
router → UI. Así cada capa se apoya en algo ya verificado.

---

## Paso 3 · Implementar

- **El cambio más chico que cumple los criterios.** Nada "por si acaso".
- **Seguí el código que ya está.** Antes de inventar un patrón, mirá cómo se
  resolvió lo mismo en otro módulo.
- **Consultá la skill `codigo-limpio`** si dudás de dónde poner una
  responsabilidad, y `ux-ui-foodhub` antes de tocar una pantalla.
- **Commits chicos y frecuentes**, cada uno con el código funcionando.

### Al tocar el modelo de datos

1. Actualizá primero el `.drawio`.
2. Reflejalo en `packages/db/src/schema/`.
3. `pnpm db:generate` y **leé el SQL** antes de commitearlo.
4. Si cambia un contrato de API, actualizá `packages/shared`.

Nunca `db:push` contra producción.

---

## Paso 4 · Verificar

Es el paso que separa "creo que anda" de "anda".

### 4.1 · Verificación automática (siempre)

```bash
pnpm lint        # 0 errores y 0 advertencias — el CI usa --max-warnings 0
pnpm typecheck   # los 5 workspaces
pnpm test        # las pruebas
```

Los tres tienen que pasar. Si uno falla, la tarea no está terminada.

### 4.2 · Verificación funcional (siempre)

**Recorré los criterios de aceptación uno por uno y ejecutá cada uno.** No de
memoria: abriendo la pantalla o pegándole al endpoint.

```
US-AUT-01 · Registro de cliente
  [x] Correo duplicado → "Este correo ya esta registrado"
  [x] Contraseñas distintas → botón deshabilitado + mensaje
  [x] Sin aceptar términos → botón deshabilitado
  [x] Registro correcto → inicia sesión y va al feed
```

### 4.3 · Casos de borde que suelen olvidarse

- ¿Qué pasa **sin datos**? (primer uso, listas vacías)
- ¿Y **sin conexión**?
- ¿Y con un usuario de **otro rol**?
- ¿Y si el mismo botón se toca **dos veces rápido**?
- ¿Y con el **texto más largo** que permite el campo?
- ¿Y si el registro fue **borrado** mientras la pantalla estaba abierta?

### 4.4 · Verificación de seguridad (si tocaste algo transversal)

- ¿El endpoint valida el rol con `requiereRol`?
- ¿Un usuario puede acceder a datos de otro cambiando un ID en la URL?
- ¿La validación está en el **servidor** y no solo en el formulario?
- ¿El error que ve el usuario oculta el detalle técnico?
- ¿Quedó algún secreto en el código o en un `EXPO_PUBLIC_*`?

---

## Paso 5 · Entregar

### Commit

```
tipo(modulo): descripción breve en minúsculas
```

Tipos: `feat` `fix` `docs` `refactor` `test` `chore`. El scope es obligatorio.
El hook `commit-msg` rechaza lo que no cumpla.

```bash
feat(pedidos): agregar endpoint para aceptar un pedido
fix(auth): corregir validación de cuenta suspendida
```

### Pull request

Rama `feature/*` o `fix/*` desde `develop`. La plantilla de PR pide la
trazabilidad (US, pantalla, estado de codificación) — completala: de ahí sale la
matriz de trazabilidad de la Etapa 6.

Requiere aprobación de alguien distinto del autor. Revisión técnica: Líder de
Desarrollo. Validación funcional: Analista de Calidad.

---

## Definición de terminado

Una tarea está terminada cuando **todo** esto es cierto:

- [ ] Cumple **todos** los criterios de aceptación de su US
- [ ] `pnpm lint` sin errores ni advertencias
- [ ] `pnpm typecheck` pasa
- [ ] `pnpm test` pasa
- [ ] Verificada a mano, ejecutándola
- [ ] Casos de borde contemplados
- [ ] La UI respeta el mockup y los tokens
- [ ] Commits con formato válido
- [ ] PR abierto con la trazabilidad completa
- [ ] Sin secretos ni `console.log` de depuración
- [ ] Matriz de trazabilidad actualizada

---

## Cómo informar el avance

Sé exacto. Distinguí lo verificado de lo que no.

```
✅ US-PED-03 implementada y verificada
   - endpoint POST /pedidos/:id/aceptar
   - 4/4 criterios de aceptación verificados a mano
   - lint, typecheck y test en verde

⚠️  Pendiente: la notificación push no se probó en dispositivo real
    (falta el google-services.json del proyecto de Firebase)
```

Nunca reportes como terminado algo que no ejecutaste. Si una prueba falla,
decilo con la salida del comando. Si salteaste un paso, decí cuál y por qué.

---

## Antipatrones

| Antipatrón                        | Por qué falla                                        |
| --------------------------------- | ---------------------------------------------------- |
| Programar sin leer la US          | se construye algo que nadie pidió                    |
| "Ya que estoy, cambio esto otro"  | el PR se vuelve irrevisable y esconde bugs           |
| Suponer un requerimiento faltante | se descubre en la evaluación, no en el sprint        |
| Declarar terminado sin ejecutar   | el bug lo encuentra el evaluador                     |
| Silenciar un error de ESLint      | la regla estaba señalando algo real                  |
| Commit gigante al final del día   | imposible de revisar y de revertir                   |
| Copiar y pegar entre módulos      | el bug se arregla en un lugar y sobrevive en el otro |
