# Capítulo 04 · Módulos funcionales

El núcleo del negocio. Alcance 2.2.2.2.2.

---

## PUB · Publicaciones (5 historias)

El cocinero administra su oferta y la mantiene actualizada en tiempo real.

| Historia  | Pantalla   | Notas                                                                  |
| --------- | ---------- | ---------------------------------------------------------------------- |
| US-PUB-01 | PAN-PUB-02 | crear: imagen, nombre, descripción, precio, categoría, tiempo estimado |
| US-PUB-02 | PAN-PUB-03 | editar                                                                 |
| US-PUB-03 | —          | eliminar (baja lógica: `activo = false`)                               |
| US-PUB-04 | PAN-PUB-01 | cambiar disponibilidad                                                 |
| US-PUB-05 | PAN-PUB-01 | listado propio con búsqueda, filtros, orden y paginación               |

**Disponibilidad — tres estados:**

| Estado             | Color de badge          |
| ------------------ | ----------------------- |
| `DISPONIBLE`       | `--color-success`       |
| `ULTIMAS_UNIDADES` | `--color-warning`       |
| `NO_DISPONIBLE`    | `--color-text-disabled` |

**Subida de imágenes.** El archivo va **del dispositivo directo a Supabase
Storage** mediante una URL firmada que emite el backend. La imagen nunca pasa
por la API: eso evita el cuello de botella y mantiene el límite de 1 MB en el
body de las requests.

---

## EXP · Exploración y búsqueda (7 historias)

Cómo el cliente descubre qué comer.

| Historia  | Pantalla     | Qué hace                                                      |
| --------- | ------------ | ------------------------------------------------------------- |
| US-EXP-01 | PAN-EXP-01   | feed ordenado por cercanía, con scroll infinito               |
| US-EXP-02 | PAN-EXP-02   | mapa geolocalizado de cocineros cercanos                      |
| US-EXP-03 | PAN-EXP-03   | filtros combinables: categoría, precio, distancia, valoración |
| US-EXP-04 | PAN-EXP-04   | perfil público del cocinero                                   |
| US-EXP-05 | PAN-EXP-05   | detalle de la publicación                                     |
| US-EXP-06 | (sin código) | favoritos de cocinero y de publicación + "Mis favoritos"      |
| US-EXP-07 | PAN-PED-01   | carrito                                                       |

**El feed no tiene radio.** Trae todas las publicaciones activas en estado
`DISPONIBLE` o `ULTIMAS_UNIDADES`, ordenadas por distancia ascendente; el que
acota es el filtro de distancia de US-EXP-03. El mapa, en cambio, consulta por la
**zona visible**, porque su criterio de aceptación habla de "la zona visible del
mapa".

**La ubicación del cliente no se persiste.** El cliente no la declara al
registrarse (`usuario.ubicacion` queda `null`; el CHECK solo se la exige al
cocinero), así que la app la pide al GPS y la manda como query params `lat`/`lng`
en cada consulta. Sin permiso, el feed cae a orden por fecha y sin distancia.

**Proximidad.** Se resuelve en el backend con PostGIS (`ST_Distance` sobre
`geography` para la distancia y el orden, `ST_MakeEnvelope` para la zona visible).
El cliente dibuja los marcadores sobre Google Maps y, al tocar uno, abre la
tarjeta con "Ver perfil". Con zoom bajo se agrupan los marcadores cercanos
(clustering) con un contador visible.

**"Mis favoritos"** no tiene código PAN en la maquetación. Se entra por un ícono
de corazón en el encabezado del feed, al lado de la campana de notificaciones
(decisión del equipo, 2026-08-18), y tiene dos pestañas: Cocineros y
Publicaciones. Un cocinero dado de baja desaparece de la lista sin error: se
filtra al leer, la fila del favorito no se borra.

**Carrito.** Índice único sobre `(cliente_id)`: hay **un solo carrito activo por
cliente**. Agregar un plato de otro cocinero abre el diálogo "Tu carrito tiene
platos de otro cocinero. ¿Querés vaciarlo y comenzar uno nuevo?" y, si el cliente
confirma, reemplaza el carrito. Los ítems guardan snapshot de nombre, precio e
imagen, así el cliente ve lo que agregó aunque el cocinero edite el plato
mientras tanto.

Al abrir el carrito, los platos que pasaron a `NO_DISPONIBLE` se quitan solos y
se avisa con "Este plato ya no está disponible y fue quitado de tu carrito."

---

## PED · Pedidos (10 historias)

El proceso transaccional central.

### Ciclo de vida

```
CREADO ──→ ACEPTADO ──→ LISTO ──→ COMPLETADO
   │           │
   └───────────┴──→ RECHAZADO
```

`TRANSICIONES_PEDIDO` en `@foodhub/shared` es la única definición de qué
transición es válida. Cualquier cambio de estado se valida contra esa tabla
antes de tocar la base.

| Historia  | Actor    | Qué hace                               |
| --------- | -------- | -------------------------------------- |
| US-PED-01 | cliente  | confirmar pedido desde el carrito      |
| US-PED-02 | cliente  | seguimiento del pedido (PAN-PED-02/03) |
| US-PED-03 | cocinero | aceptar (PAN-PED-04)                   |
| US-PED-04 | cocinero | rechazar, con motivo obligatorio       |
| US-PED-05 | cocinero | marcar Listo y Completado              |
| US-PED-06 | cliente  | historial (PAN-PED-05)                 |
| US-PED-07 | cliente  | detalle (PAN-PED-06)                   |
| US-PED-08 | cocinero | historial                              |
| US-PED-09 | cliente  | cancelar                               |
| US-PED-10 | sistema  | expiración automática                  |

### Reglas

1. **Un pedido, un cocinero.**
2. **Precios congelados** al confirmar (`item_pedido`).
3. **Rechazo sin motivo: imposible.** Lo impide la API y un CHECK en la base.
4. **Cada transición se registra** en `historial_estado_pedido` con quién,
   cuándo y por qué.
5. **US-PED-10 · Expiración automática.** Si el cocinero no responde en N
   minutos (por defecto 15, editable desde `configuracion_sistema`), el pedido
   pasa a `RECHAZADO` con `origen = SISTEMA`. Es el único proceso periódico del
   sistema.
6. **Nadie se pide a sí mismo** (CHECK `pedido_partes_distintas`).

---

## RES · Reseñas y calificaciones (6 historias)

Reputación **bidireccional**: el cliente reseña los platos que pidió y el
cocinero califica al cliente.

| Historia  | Quién califica a quién / qué hace                            |
| --------- | ------------------------------------------------------------ |
| US-RES-01 | cliente → **un plato** de un pedido completado (PAN-RES-01)   |
| US-RES-02 | cocinero → cliente, tras un pedido que llegó a aceptado       |
| US-RES-03 | ver reseñas y promedio en el perfil público                   |
| US-RES-04 | reaccionar a una reseña (me gusta / no me gusta)            |
| US-RES-05 | el cocinero responde una reseña                             |
| US-RES-06 | reportar una reseña inapropiada                             |

Reglas:

- Calificación de **1 a 5** (CHECK en la base).
- **La reseña es por plato, no por pedido.** Una por cliente y publicación
  (`resena_cliente_publicacion_uq`); si el cliente vuelve a pedir el mismo plato,
  edita la que ya tiene. Ninguna de las dos tablas referencia `pedido`.
- Solo se reseña un plato que el cliente pidió en un pedido **completado**, y solo
  se califica a un cliente que hizo un pedido que llegó a **aceptado**. Las dos
  condiciones se validan por consulta contra `pedido`/`item_pedido`.
- Una calificación por par cocinero-cliente (`calificacion_cocinero_uq`),
  editable.
- Solo las reseñas `VISIBLE` promedian en el perfil público. La moderación las
  pasa a `OCULTA_MODERACION`; el autor puede pasarlas a `ELIMINADA_AUTOR`.
- **Una reacción por usuario y reseña**: cambiar de opinión es un UPDATE, no una
  fila nueva.
- La respuesta del cocinero tiene **ventana de edición** (`fecha_edicion_limite`):
  pasada, se congela, para que no se altere después de que el cliente la leyó.
- Un usuario no puede reportar dos veces la misma reseña.

---

## MSG · Mensajería directa (7 historias)

Chat dentro de la plataforma, para no depender de WhatsApp.

| Historia  | Qué hace                                          |
| --------- | ------------------------------------------------- |
| US-MSG-01 | iniciar conversación desde el perfil del cocinero |
| US-MSG-02 | enviar y recibir texto                            |
| US-MSG-03 | adjuntar imágenes                                 |
| US-MSG-04 | listado por actividad reciente (PAN-MSG-01)       |
| US-MSG-05 | historial completo (PAN-MSG-02)                   |
| US-MSG-06 | hilo asociado a un pedido                         |
| US-MSG-07 | comportamiento ante la baja de una de las partes  |

Reglas:

- La conversación es **siempre 1 a 1**. No hay chats grupales en el alcance.
- Índice único normalizado sobre el par de UUID: (A,B) y (B,A) son la **misma**
  conversación.
- Contadores de no leídos y flag de archivado **por participante**: cada uno
  archiva y marca como leído de forma independiente.
- Si una parte da de baja su cuenta, la conversación queda
  `bloqueada_por_baja`: el historial sigue visible para la otra, pero no se
  pueden enviar mensajes nuevos (US-MSG-07).
- Estados de mensaje: `ENVIADO` → `ENTREGADO` → `LEIDO`.

---

## NOT · Notificaciones y alertas (8 historias)

| Historia  | Evento que la dispara                                 |
| --------- | ----------------------------------------------------- |
| US-NOT-01 | cambio de estado de un pedido relevante               |
| US-NOT-02 | mensaje nuevo en el chat                              |
| US-NOT-03 | el administrador elimina una publicación del cocinero |
| US-NOT-04 | aviso general del sistema                             |
| US-NOT-05 | el cocinero recibe una reseña                         |
| US-NOT-06 | un cocinero favorito publica algo nuevo               |
| US-NOT-07 | historial de notificaciones en la app (PAN-NOT-01)    |
| US-NOT-08 | habilitar o deshabilitar cada tipo                    |

Reglas (implementación en `docs/API-NOTIFICACIONES.md`):

- **Regla de escritura de la fila** (documento del módulo, rev. 01/09/2026):
  para un tipo **configurable** con la preferencia en `activa = false`, **no se
  escribe fila ni se manda push**. Para los tipos **esenciales**
  (`AVISO_SISTEMA`, `PUBLICACION_ELIMINADA_ADMIN`) la fila se escribe siempre.
  El push es un efecto adicional que puede fallar sin tocar la fila.
  _(Esto corrige la regla anterior "la fila se escribe siempre".)_
- Los tres rechazos de un pedido —cocinero, cliente (cancela), sistema
  (expira)— son el **único** tipo `PEDIDO_RECHAZADO`; el texto y el
  destinatario los elige `pedido.origen_rechazo`.
- `preferencia_notificacion.modificable = false` marca las críticas que no se
  pueden apagar. La interfaz las muestra **deshabilitadas**, no ocultas.
- Un usuario puede tener **varios dispositivos** (`dispositivo_push`), y el
  token se renueva ante reinstalación o rotación del sistema operativo.
- El push **no** es síncrono: `emision.service.ts` solo escribe la fila; un
  **planificador** (`server.ts`) barre lo pendiente cada ~10 s y lo manda por
  la **Expo Push API** (no FCM directo). El MVP **no** incorpora cola de
  mensajes (punto 1.3.1.12). La expiración automática, que corre en pg_cron,
  la notifica ese mismo planificador.
- **Alcance implementado**: US-NOT-01, 02, 05, 06, 07, 08. US-NOT-03 y US-NOT-04
  quedan como enganches hasta que exista la moderación del panel (US-ADM-04).
