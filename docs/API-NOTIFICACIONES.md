# Contrato y arquitectura · Módulo de Notificaciones y Alertas

Superficie HTTP y funcionamiento interno del módulo NOT (US-NOT-01 a US-NOT-08,
RF034 a RF041). Prefijo: `/api/v1`. Los schemas viven en `@foodhub/shared`
(`notificacion.schema.ts`, `preferenciaNotificacion.schema.ts`).

Alcance implementado: **US-NOT-01 a US-NOT-08** y las notificaciones de
**RF086** (moderación de reseñas). Decisiones del equipo del 13/10/2026:

- **US-NOT-03**: la baja desde el panel (`publicaciones/moderacion.service.ts`)
  llama a `notificarPublicacionEliminadaPorAdmin`. El cuerpo se recorta a 500
  caracteres (`notificacion.cuerpo`) porque el motivo admite otros 500.
- **US-NOT-04**: `POST /avisos` (solo administrador) escribe un
  `AVISO_SISTEMA` por cuenta **activa** del segmento elegido y lo audita como
  `ALTA` de `notificacion`. Tocarlo abre PAN-NOT-03 (detalle del aviso), que no
  está en la maquetación.
- **RF086**: aprobar un reporte avisa al autor ("Tu reseña fue removida por
  incumplir las normas de comunidad.", texto aprobado por el equipo);
  rechazarlo avisa a quienes reportaron con el literal del RF. Las dos ramas
  van como `AVISO_SISTEMA`: el enum no tiene un tipo propio para la moderación.
- El **administrador no recibe notificaciones**: ningún requisito lo hace
  destinatario, así que el panel no tiene campana.

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
(`https://exp.host/--/api/v2/push/send`) y Expo los reenvía a FCM con la
**clave de cuenta de servicio FCM V1** cargada en las credenciales del
proyecto de EAS. El `google-services.json` (secreto de EAS, ver
`apps/mobile/EAS.md`) es la otra mitad: lo usa la app para obtener su token de
FCM. Sin la clave V1, Expo acepta el envío (ticket `ok`) pero el recibo vuelve
con error; `push_estado = 'ENVIADO'` solo significa que Expo aceptó el ticket.
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
`usuario_destino_id = <sesión>`. La **emisión no tiene ruta acá**: la disparan
pedidos, mensajería, publicaciones y moderación al ocurrir el evento, y los
avisos generales van por `POST /avisos` (ver más abajo).

| Método   | Ruta                            | US        | Body / query → respuesta                                                                           |
| -------- | ------------------------------- | --------- | -------------------------------------------------------------------------------------------------- |
| `GET`    | `/notificaciones`               | US-NOT-07 | query `?pagina=N` → `paginaNotificacionesSchema` (`{ datos, total, pagina, porPagina, noLeidas }`) |
| `GET`    | `/notificaciones/no-leidas`     | US-NOT-07 | → `{ noLeidas }`                                                                                   |
| `GET`    | `/notificaciones/:id`           | US-NOT-04 | → `notificacionSchema` (PAN-NOT-03). Una ajena responde `404`, igual que una inexistente           |
| `POST`   | `/notificaciones/marcar-leidas` | US-NOT-07 | `{ ids? }` (sin `ids` = todas) → `204`                                                             |
| `POST`   | `/notificaciones/dispositivos`  | 1.3.1.11  | `registrarDispositivoSchema` → `204`. Idempotente (upsert por token)                               |
| `DELETE` | `/notificaciones/dispositivos`  | —         | `{ expoPushToken }` → `204`. Acotado al dueño                                                      |
| `PUT`    | `/notificaciones/presencia`     | US-NOT-02 | `{ conversacionId \| null }` → `204`                                                               |

Las preferencias (US-NOT-08 / RF041, consolidado con RF059) viven en el módulo
de usuarios: `GET|PATCH /usuarios/yo/preferencias-notificacion[/:grupo]`.

## Endpoint · `/avisos` (panel)

Solo `ADMINISTRADOR` (`soloAdministrador` en la raíz del router).

| Método | Ruta      | US        | Body → respuesta                                                                                 |
| ------ | --------- | --------- | ------------------------------------------------------------------------------------------------ |
| `POST` | `/avisos` | US-NOT-04 | `avisoGeneralSchema` (`{ titulo ≤ 120, mensaje ≤ 500, destinatario }`) → `201 { destinatarios }` |

`destinatario` es `TODOS`, `CLIENTE` o `COCINERO`; solo se escribe a cuentas en
estado `ACTIVA`.

### Contrato del push (payload Expo → app)

El `data` del mensaje Expo lleva `{ tipo, objetoAfectadoId, notificacionId }`.
La app mapea `tipo` + `objetoAfectadoId` a una ruta (`deepLinkDeNotificacion`):

| `tipo`                          | Destino                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------- |
| `PEDIDO_*`                      | `/pedidos/{objetoAfectadoId}/detalle`                                                       |
| `MENSAJE_NUEVO`                 | `/mensajes/{objetoAfectadoId}` (id de la **conversación**)                                  |
| `PUBLICACION_COCINERO_FAVORITO` | `/platos/{objetoAfectadoId}`                                                                |
| `RESENA_RECIBIDA`               | `/resenas/mis-resenas` (PAN-RES-02; `objetoAfectadoId` = id de la reseña, sin usar todavía) |
| `PUBLICACION_ELIMINADA_ADMIN`   | `/(cocinero)/platos` (Mis publicaciones, donde la eliminada ya no aparece)                  |
| `AVISO_SISTEMA`                 | `/notificaciones/{notificacionId}` (PAN-NOT-03, detalle del aviso)                          |

El push incluye `channelId: 'default'`; la app crea ese canal Android al
registrar el token.

---

## Configuración

| Variable                               | ¿Obligatoria?      | Para qué                                                                                                                            |
| -------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `EXPO_ACCESS_TOKEN`                    | no                 | Solo si el proyecto de Expo tiene "Enhanced Security for Push Notifications". Sin ella, `exp.host` acepta los envíos sin autenticar |
| `NOTIFICACIONES_DESPACHO_INTERVALO_MS` | no (default 10000) | Cada cuánto barre el planificador                                                                                                   |

**FCM**: se configura en EAS, no en la API: la clave de cuenta de servicio FCM
V1 en las credenciales del proyecto y el `google-services.json` como secreto
de la build (`apps/mobile/EAS.md`). Verificado el 13/10/2026 en `foodhub-dev`:
un push de prueba volvió con recibo `ok` y llegó al dispositivo.

---

## Qué falta verificar en dispositivo

El envío push está probado con mocks (`push.service.test.ts`,
`emision.service.test.ts`) y, desde el 13/10/2026, con un push real en un
dispositivo (recibo `ok`, aviso de pedido expirado recibido en segundo plano).
Para repetir la prueba de punta a punta hace falta:

1. una build de EAS con `google-services.json` (perfil `development` alcanza);
2. iniciar sesión en la app (registra el Expo Push Token);
3. generar el evento (aceptar un pedido, mandar un mensaje, publicar un plato de
   un cocinero favorito) desde otra sesión.
