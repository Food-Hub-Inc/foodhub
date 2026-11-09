# Capítulo 02 · Modelo de datos

Diagrama vigente: `DG13092026_V7.drawio` (43 clases), en el Drive del proyecto.
Implementación: `packages/db/src/schema/`.

> Este capítulo se redactó sobre el `DG12082026_V5`. Los diagramas anteriores
> al V7 quedaron reemplazados: ante cualquier diferencia, manda el V7.

---

## Criterio de traducción a tablas

Se aplica de forma uniforme en todo el schema:

- **Clase en el diagrama → tabla.** Categoría, MotivoCancelación, TipoConsulta,
  RolDestino… son entidades que el administrador da de alta y baja desde el
  panel, así que necesitan ABM.
- **Valores enumerados dentro de un atributo → `ENUM` de PostgreSQL.** Por
  ejemplo `origenRechazo (CLIENTE / COCINERO / SISTEMA)`. Son valores fijos del
  dominio: agregar uno implica cambiar reglas de negocio y desplegar código, no
  cargar una fila.
- Excepción documentada: `EstadoCuenta`, `EstadoPedido`, `EstadoPublicacion`,
  `EstadoMensaje` y `EstadoVersionTerminos` figuran como clases pero sus valores
  son fijos, así que se traducen a `ENUM`.

Los literales viven en `@foodhub/shared/constants/enums.ts` y los importa tanto
la base como los clientes: un solo lugar donde agregar un valor.

---

## Qué cambió respecto del V3 (Supabase Auth)

| Entidad                           | Cambio         | Motivo                                    |
| --------------------------------- | -------------- | ----------------------------------------- |
| `Sesion`                          | **eliminada**  | GoTrue gestiona sesiones y refresh tokens |
| `SolicitudRecuperacionContrasena` | **eliminada**  | GoTrue gestiona el token de recuperación  |
| `IntentoLoginFallido`             | **eliminada**  | absorbida por `EventoSeguridad`           |
| `EventoSeguridad`                 | **nueva**      | cubre los dos criterios de US-AUD-01      |
| `Usuario.passwordHash`            | **eliminado**  | la credencial vive en `auth.users`        |
| `Usuario.id`                      | **modificado** | ahora es FK a `auth.users.id`             |

### EventoSeguridad

```
+String   id
+String   tipoEvento         LOGIN_FALLIDO | ACCESO_DENEGADO
+String   emailIntentado     nullable
+String   usuarioId          nullable, FK → Usuario
+String   recursoSolicitado  nullable
+String   ipOrigen
+DateTime fechaHora
+String   motivo
```

Dos orígenes de escritura, porque el sistema observa cada evento desde un lugar
distinto:

- **`LOGIN_FALLIDO`** lo escribe un **Auth Hook de Supabase**. El login va del
  cliente directo a GoTrue sin pasar por la API, así que el backend no puede
  observarlo por sí mismo.
- **`ACCESO_DENEGADO`** lo escribe el middleware `requiereRol` de la API.

Las columnas de identidad son nullable: un login fallido con un correo
inexistente no tiene usuario, y un acceso denegado tiene usuario pero no email
intentado.

---

## Entidades por módulo

### Usuarios y seguridad — `schema/usuarios.ts`

| Entidad            | Notas                                                              |
| ------------------ | ------------------------------------------------------------------ |
| `usuario`          | tabla única con discriminador `tipo`; `id` = `auth.users.id`       |
| `cocinero`         | 1:1 con usuario, solo para los atributos propios del rol           |
| `version_terminos` | historial completo: el usuario queda atado a la versión que aceptó |
| `evento_seguridad` | ver arriba                                                         |

`Cliente` y `Administrador` **no tienen tabla**: no agregan ningún atributo
sobre `Usuario`. Crearlas produciría tablas vacías.

`usuario.ubicacion` es un punto PostGIS en **SRID 4326** (WGS-84, el sistema del
GPS), con índice GiST parcial sobre las filas que la tienen declarada. Es lo que
alimenta el feed por cercanía y el mapa de cocineros.

La columna es nullable, pero el CHECK `usuario_cocinero_con_ubicacion` la exige
cuando `tipo = 'COCINERO'`: un cocinero sin coordenadas no aparecería en ninguno
de los tres mecanismos de descubrimiento. El cliente sí puede navegar sin
compartir la suya.

⚠️ Para calcular distancias en **metros** hay que castear a `geography`:

```sql
ST_DWithin(ubicacion::geography, $punto::geography, $metros)
```

Sin el cast, el radio se interpreta en grados y el resultado no corresponde a
ninguna distancia real.

### Catálogo y parámetros — `schema/catalogo.ts`

`categoria` · `rol_destino` · `tipo_consulta` · `tipo_usuario_cancelacion` ·
`motivo_cancelacion` · `configuracion_sistema`

### Publicaciones y carrito — `schema/publicaciones.ts`

`publicacion` · `favorito_cocinero` · `favorito_publicacion` · `carrito` ·
`item_carrito`

- `Favorito` (abstracta) se traduce a **dos tablas concretas**, así cada FK
  puede ser `NOT NULL` y la base impide por sí sola un favorito huérfano.
- `carrito` tiene índice único sobre `(cliente_id)`: **un solo carrito activo por
  cliente**. Es la regla "un pedido, un cocinero" implementada a nivel de base —
  mientras el carrito exista, todo lo que se agregue tiene que ser de
  `carrito.cocinero_id`. Agregar un plato de otro cocinero pide confirmación y
  reemplaza el carrito (US-EXP-05).

### Pedidos — `schema/pedidos.ts`

`pedido` · `item_pedido` · `historial_estado_pedido`

```
CREADO ──→ ACEPTADO ──→ LISTO ──→ COMPLETADO
   │           │
   └───────────┴──→ RECHAZADO
```

- `pedido.estado_pedido_actual` está desnormalizado a propósito: el listado
  filtra por estado en cada carga y resolverlo con una subconsulta por fila no
  escala. `historial_estado_pedido` conserva la trazabilidad completa.
- `item_pedido` guarda snapshots de nombre, precio e imagen. **Sin ellos, editar
  una publicación cambiaría el importe de pedidos ya cerrados.**
- Dos CHECK en la base: un rechazo siempre lleva motivo, y cliente y cocinero no
  pueden ser la misma persona.

### Reseñas — `schema/social.ts`

`resena` · `reaccion_resena` · `respuesta_cocinero` · `reporte_resena`

- **Una reseña se identifica por (autor, objeto reseñado)**, y el objeto es un
  **plato, un cocinero o un cliente**. Hay una sola por autor y objeto: si se
  vuelve a opinar, se **edita** la que ya existe. Sin esa restricción cualquiera
  podría inflar o hundir una reputación repitiendo la reseña.
- **El pedido no aparece en ninguna tabla del módulo.** Solo responde "¿tiene
  derecho a reseñar?" en el momento del alta, y eso se verifica por consulta
  contra `historial_estado_pedido`.
- **Los tres tipos viven en UNA tabla con discriminador** `tipo_resena`, igual
  que `mensaje` y al revés que `favorito`. El motivo es que los tres agregados
  sociales cuelgan de `resena_id` y así sirven a los tres tipos sin una línea
  extra, incluida la cola de moderación de PAN-ADM-02.

| `tipo_resena` | destino              | autor    | quién la ve                  |
| ------------- | -------------------- | -------- | ---------------------------- |
| `PLATO`       | `publicacion_id`     | cliente  | cualquiera (US-RES-01/03)    |
| `COCINERO`    | `cocinero_res_id`    | cliente  | cualquiera (RF087/US-RES-07) |
| `CLIENTE`     | `cliente_destino_id` | cocinero | solo cocineros (US-RES-02)   |

- El CHECK `resena_destino_segun_tipo` garantiza que esté poblado **exactamente**
  el destino de su tipo. Los tres índices únicos son **parciales**, uno por tipo:
  la columna de destino es `NULL` en los otros dos y en PostgreSQL los NULL no
  chocan entre sí, así que un único índice no restringiría nada.
- `cocinero_res_id` cumple dos papeles: es el **destino** en las de tipo
  COCINERO y el **dueño del plato** —desnormalizado— en las de tipo PLATO. Toda
  consulta sobre esa columna tiene que filtrar además por tipo.
- **La reputación pública del cocinero sale de las reseñas de tipo COCINERO**, no
  de las de sus platos. El promedio **por plato** sale de las de tipo PLATO. Son
  dos preguntas distintas y las dos aplican `resena_minimo_para_promedio`.
- **Las de tipo CLIENTE no llevan reacciones, respuesta ni reporte**, y no es un
  olvido: el cliente no las ve. Su privacidad ya no la da el modelo —comparten
  tabla con las públicas— sino el `requiereRol('COCINERO')` de sus rutas, con una
  prueba de router dedicada.
- Calificación entre 1 y 5, verificado por CHECK. Solo las `VISIBLE` promedian.

> **Cambio del 2026-08-18.** Antes la reseña era por pedido. Se cambió porque
> US-EXP-03 (filtro por valoración mínima) y US-EXP-05 (promedio en el detalle
> del plato) exigen la valoración de UNA publicación.
>
> **Corrección del 2026-09-04 (migración `0015`).** La reseña al cocinero había
> quedado anclada al PEDIDO —una por pedido— y eso permitía que un cliente
> frecuente pesara varias veces sobre la misma reputación. Se unificaron las tres
> tablas bajo la regla de arriba. **El diagrama `DG12082026_V5` todavía no
> refleja esto**: ver el punto 14 de `PENDIENTE_RESENAS.md`.

### Mensajería — `schema/mensajeria.ts`

`conversacion` · `mensaje`

- La conversación es **siempre 1 a 1**: los participantes van como dos columnas,
  no como tabla puente. Un índice único sobre `least/greatest` de los dos UUID
  evita que (A,B) y (B,A) sean dos conversaciones distintas.
- `Mensaje` (abstracta) se resuelve con **una tabla y discriminador**, al revés
  que `Favorito`: los dos subtipos se leen siempre juntos y en orden
  cronológico, y separarlos obligaría a un `UNION ALL` ordenado en la consulta
  más frecuente del módulo. Un CHECK garantiza que cada fila tenga poblada solo
  la columna de su tipo.

### Notificaciones — `schema/notificaciones.ts`

`notificacion` · `preferencia_notificacion` · `dispositivo_push`

- `dispositivo_push` **no está en el diagrama de clases**: es infraestructura,
  pero el punto 1.3.1.11 la exige explícitamente ("los Expo Push Tokens deben
  persistirse asociados al usuario, con actualización ante renovaciones o
  reinstalaciones"). Un usuario puede tener varios dispositivos.
- `preferencia_notificacion.modificable = false` marca las notificaciones
  críticas que el usuario no puede apagar.

### Ayuda y soporte — `schema/soporte.ts`

`capitulo_ayuda` · `seccion_ayuda` · `faq` · `ticket_soporte` · `adjunto_ticket`

### Auditoría — `schema/auditoria.ts`

`registro_auditoria` — operaciones de negocio (altas, bajas, modificaciones),
append-only. `datos_adicionales` es `jsonb` porque US-AUD-02 pide abrir un modal
con "los datos adicionales estructurados".

`usuario_id` usa `ON DELETE SET NULL`, no `CASCADE`: borrarse la cuenta no puede
ser una forma de borrar el propio rastro.

---

## Convenciones

- **PK**: `uuid` con `defaultRandom()`, salvo `usuario.id` (viene de GoTrue) y
  las tablas 1:1, cuya PK es la FK.
- **Nombres**: `snake_case` en la base, `camelCase` en TypeScript. Drizzle mapea
  solo con `casing: 'snake_case'`.
- **Dinero**: `numeric(12,2)`, nunca punto flotante — acumula error al sumar.
- **Fechas**: `timestamp with time zone`, siempre.
- **Bajas lógicas**: `activo` o `estado_cuenta`. Nada se borra físicamente.
