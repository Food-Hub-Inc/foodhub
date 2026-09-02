# Contrato y arquitectura · Módulo de Notificaciones y Alertas

Superficie HTTP y funcionamiento interno del módulo NOT (US-NOT-01 a US-NOT-08,
RF034 a RF041). Prefijo: `/api/v1`. Los schemas viven en `@foodhub/shared`
(`notificacion.schema.ts`, `preferenciaNotificacion.schema.ts`).

Alcance implementado: **US-NOT-01, 02, 06, 07, 08**. US-NOT-03 (el admin elimina
una publicación), US-NOT-04 (aviso general del admin) y US-NOT-05 (reseña
recibida) quedan pendientes hasta que existan la moderación del panel
(US-ADM-04) y el módulo de Reseñas: cuando esos módulos emitan su evento, solo
tienen que llamar a `emitirNotificacion` con el tipo y el texto de
`MENSAJES_NOTIFICACION`, como hacen hoy pedidos, mensajería y publicaciones
(`disparadores.service.ts`).

---

## Cómo funciona la emisión

Toda notificación pasa por `emision.service.ts` (`emitirNotificacion` /
`emitirNotificacionEnLote`). Nadie inserta en `notificacion` a mano.

**Regla de escritura de la fila** (documento del módulo, revisión 01/09/2026 —
corrige la regla anterior "la fila se escribe siempre" que todavía describe la
skill `foodhub`):

| Caso                                                                       | ¿Fila?  | ¿Push?                             |
| -------------------------------------------------------------------------- | ------- | ---------------------------------- |
| tipo configurable, preferencia `activa = true` (o sin fila de preferencia) | sí      | sí                                 |
| tipo configurable, preferencia `activa = false`                            | **no**  | no                                 |
| tipo esencial (`AVISO_SISTEMA`, `PUBLICACION_ELIMINADA_ADMIN`)             | siempre | siempre                            |
| destinatario mirando esa conversación de chat (US-NOT-02)                  | sí      | **no** (`push_estado = 'OMITIDO'`) |

Los tres caminos que llevan un pedido a `RECHAZADO` —el cocinero rechaza, el
cliente cancela, el sistema expira— son el **único** `TIPO_NOTIFICACION`
`PEDIDO_RECHAZADO`; el texto y el destinatario los elige `pedido.origen_rechazo`.

La fila se escribe dentro de la transacción del evento que la generó (una
transición de pedido, un mensaje): es atómica con él. El push nunca es síncrono
(ver abajo).

---

## Envío push

La API **no habla con FCM directo**. Le manda los mensajes a la Expo Push API
(`https://exp.host/--/api/v2/push/send`) y Expo los reenvía a FCM con el
`google-services.json` de la build (secreto de EAS, ver `apps/mobile/EAS.md`).
No hay dependencia nueva: `push.service.ts` son dos `fetch`.

### El planificador

`planificador.ts` arranca en `server.ts` (no en `crearApp`: los tests con
supertest no encienden timers). Cada `NOTIFICACIONES_DESPACHO_INTERVALO_MS`
(default 10 s) hace, en orden:

1. **`notificarExpiracionesPendientes`** — busca los pedidos que expiró la
   función SQL `expirar_pedidos_sin_respuesta` (migración 0010) y todavía no
   tienen notificación, y las emite desde `MENSAJES_NOTIFICACION`. Así los
   textos literales de US-NOT-01 no se duplican dentro de una función SQL (lo
   que la 0010 evitó a propósito).
2. **`despacharPendientes`** — reclama lotes de `notificacion` con
   `push_estado = 'PENDIENTE'` (`UPDATE ... FOR UPDATE SKIP LOCKED`, así dos
   instancias de Railway se reparten filas disjuntas), arma un mensaje Expo por
   `(fila, token activo)`, y traduce cada ticket a `push_estado`.

`emitirNotificacion` además programa un barrido inmediato (`setImmediate`
coalescido) tras cada alta, así el caso típico es < 1 s de latencia.

### Estados de `notificacion.push_estado`

Es infraestructura interna (`varchar`, no enum de PG, no en `@foodhub/shared`):

| Estado        | Significado                                                       | ¿El despachador reintenta? |
| ------------- | ----------------------------------------------------------------- | -------------------------- |
| `PENDIENTE`   | fila escrita, push aún no intentado                               | sí                         |
| `ENVIANDO`    | un despachador la reclamó y está hablando con Expo                | — (transitorio)            |
| `ENVIADO`     | Expo aceptó el mensaje para ≥ 1 dispositivo                       | no                         |
| `OMITIDO`     | fila escrita, push salteado a propósito (US-NOT-02: chat abierto) | no                         |
| `SIN_DESTINO` | fila escrita, el usuario no tiene `dispositivo_push` activo       | no (terminal)              |
| `FALLIDO`     | había dispositivos y Expo los rechazó de forma permanente         | no (terminal)              |

Un token que Expo reporta como `DeviceNotRegistered` se desactiva
(`dispositivo_push.activo = false`).

---

## Presencia en el chat (US-NOT-02) — limitación conocida

US-NOT-02 pide no enviar push si el destinatario **tiene esa conversación
abierta**. Esa información vive en Supabase Realtime (canal `chat:<id>`), no en
la base. En vez de que la API consulte Realtime —acoplándose a ese servicio y
agregando latencia al envío de cada mensaje—, **el cliente del destinatario
declara qué conversación está mirando**: `PUT /notificaciones/presencia` con el
`conversacionId` mientras la pantalla de chat está enfocada (se renueva cada
30 s), y `null` al salir.

La API lo guarda en un **`Map` en memoria del proceso, con TTL de ~40 s**
(`presencia.service.ts`).

**Consecuencias de que sea en memoria y por instancia:**

- Se pierde en un reinicio del proceso. Impacto: durante los segundos hasta el
  siguiente ping del cliente, un mensaje nuevo podría generar un push
  redundante mientras el chat está abierto.
- En un despliegue de **dos instancias** en Railway, cada instancia solo ve a
  los clientes que le pegaron a ella. Si el mensaje lo procesa la instancia que
  no recibió el ping de presencia, sale el push igual.

**En ninguno de los dos casos se pierde una notificación**: la fila del
historial se escribe siempre, y el peor caso es un push de más en un chat que el
usuario ya tiene abierto.

Es una concesión deliberada del MVP, alineada con la decisión de "sin cola de
mensajes" (punto 1.3.1.12 del análisis de factibilidad). **Evolución futura:**
un store compartido (Redis) para la presencia, o que la API consulte el estado
de presencia del canal contra Realtime.

Misma naturaleza tiene el reset de arranque del despachador: si una segunda
instancia arranca mientras la primera despacha, podría devolver a `PENDIENTE`
un lote en vuelo → a lo sumo un push duplicado. La solución definitiva es una
columna de reclamo con reaper por tiempo.

---

## Endpoints · `/notificaciones`

Todos requieren sesión y rol `CLIENTE` o `COCINERO` (el administrador opera
desde el panel web y no recibe push). Toda lectura y escritura se acota a
`usuario_destino_id = <sesión>`. La **emisión no tiene ruta**: la disparan
pedidos, mensajería y publicaciones al ocurrir el evento.

| Método   | Ruta                            | US        | Body / query → respuesta                                                                           |
| -------- | ------------------------------- | --------- | -------------------------------------------------------------------------------------------------- |
| `GET`    | `/notificaciones`               | US-NOT-07 | query `?pagina=N` → `paginaNotificacionesSchema` (`{ datos, total, pagina, porPagina, noLeidas }`) |
| `GET`    | `/notificaciones/no-leidas`     | US-NOT-07 | → `{ noLeidas }`                                                                                   |
| `POST`   | `/notificaciones/marcar-leidas` | US-NOT-07 | `{ ids? }` (sin `ids` = todas) → `204`                                                             |
| `POST`   | `/notificaciones/dispositivos`  | 1.3.1.11  | `registrarDispositivoSchema` → `204`. Idempotente (upsert por token)                               |
| `DELETE` | `/notificaciones/dispositivos`  | —         | `{ expoPushToken }` → `204`. Acotado al dueño                                                      |
| `PUT`    | `/notificaciones/presencia`     | US-NOT-02 | `{ conversacionId \| null }` → `204`                                                               |

Las preferencias (US-NOT-08 / RF041, consolidado con RF059) viven en el módulo
de usuarios: `GET|PATCH /usuarios/yo/preferencias-notificacion[/:grupo]`.

### Contrato del push (payload Expo → app)

El `data` del mensaje Expo lleva `{ tipo, objetoAfectadoId, notificacionId }`.
La app mapea `tipo` + `objetoAfectadoId` a una ruta (`deepLinkDeNotificacion`):

| `tipo`                          | Destino                                                    |
| ------------------------------- | ---------------------------------------------------------- |
| `PEDIDO_*`                      | `/pedidos/{objetoAfectadoId}/detalle`                      |
| `MENSAJE_NUEVO`                 | `/mensajes/{objetoAfectadoId}` (id de la **conversación**) |
| `PUBLICACION_COCINERO_FAVORITO` | `/platos/{objetoAfectadoId}`                               |

El push incluye `channelId: 'default'`; la app crea ese canal Android al
registrar el token.

---

## Configuración

| Variable                               | ¿Obligatoria?      | Para qué                                                                                                                            |
| -------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `EXPO_ACCESS_TOKEN`                    | no                 | Solo si el proyecto de Expo tiene "Enhanced Security for Push Notifications". Sin ella, `exp.host` acepta los envíos sin autenticar |
| `NOTIFICACIONES_DESPACHO_INTERVALO_MS` | no (default 10000) | Cada cuánto barre el planificador                                                                                                   |

**FCM**: se configura en la build de EAS, no en la API. El
`google-services.json` es un secreto de EAS (`apps/mobile/EAS.md`).

---

## Qué falta verificar en dispositivo

El envío push está **probado con mocks** (`push.service.test.ts`,
`emision.service.test.ts`). La prueba de punta a punta —que un push realmente
llegue a un teléfono y que tocarlo abra la pantalla correcta— necesita:

1. una build de EAS con `google-services.json` (perfil `development` alcanza);
2. iniciar sesión en la app (registra el Expo Push Token);
3. generar el evento (aceptar un pedido, mandar un mensaje, publicar un plato de
   un cocinero favorito) desde otra sesión.
