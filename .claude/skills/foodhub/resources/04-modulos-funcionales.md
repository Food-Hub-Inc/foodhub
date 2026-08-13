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

| Historia  | Pantalla   | Qué hace                                                      |
| --------- | ---------- | ------------------------------------------------------------- |
| US-EXP-01 | PAN-EXP-01 | feed dinámico de publicaciones recientes                      |
| US-EXP-02 | PAN-EXP-02 | mapa geolocalizado de cocineros cercanos                      |
| US-EXP-03 | PAN-EXP-03 | filtros combinables: categoría, precio, distancia, valoración |
| US-EXP-04 | PAN-EXP-04 | perfil público del cocinero                                   |
| US-EXP-05 | PAN-EXP-05 | detalle de la publicación                                     |
| US-EXP-06 | —          | favoritos de cocinero y de publicación                        |
| US-EXP-07 | PAN-PED-01 | carrito                                                       |

**Proximidad.** Se resuelve en el backend con PostGIS. El backend devuelve las
coordenadas de los cocineros dentro del radio configurado; el cliente dibuja los
marcadores sobre Google Maps y, al tocar uno, navega al perfil. Con zoom bajo se
agrupan los marcadores cercanos (clustering).

**Carrito.** Índice único sobre `(cliente_id, cocinero_id)`: agregar un plato de
otro cocinero abre un carrito separado. Los ítems guardan snapshot de nombre,
precio e imagen, así el cliente ve lo que agregó aunque el cocinero edite el
plato mientras tanto.

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

Reputación **bidireccional**: el cliente califica al cocinero y el cocinero
califica al cliente.

| Historia  | Quién califica a quién / qué hace                           |
| --------- | ----------------------------------------------------------- |
| US-RES-01 | cliente → cocinero, sobre un pedido completado (PAN-RES-01) |
| US-RES-02 | cocinero → cliente                                          |
| US-RES-03 | ver reseñas y promedio en el perfil público                 |
| US-RES-04 | reaccionar a una reseña (me gusta / no me gusta)            |
| US-RES-05 | el cocinero responde una reseña                             |
| US-RES-06 | reportar una reseña inapropiada                             |

Reglas:

- Calificación de **1 a 5** (CHECK en la base).
- **Una reseña por pedido** en cada dirección (`pedido_id` UNIQUE).
- Solo se reseñan pedidos **completados**.
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

Reglas:

- **La fila en `notificacion` se escribe siempre**, aunque el push falle o el
  usuario tenga las notificaciones apagadas en el sistema operativo. El envío
  push es un efecto adicional, no la notificación en sí.
- `preferencia_notificacion.modificable = false` marca las críticas que no se
  pueden apagar (US-NOT-07 lo especifica para al menos una). La interfaz las
  muestra **deshabilitadas**, no ocultas: así queda claro que existen.
- Un usuario puede tener **varios dispositivos** (`dispositivo_push`), y el
  token se renueva ante reinstalación o rotación del sistema operativo.
- El envío por FCM tarda menos de 200 ms, así que se resuelve de forma síncrona
  dentro del handler: el MVP **no** incorpora cola de mensajes (punto 1.3.1.12).
