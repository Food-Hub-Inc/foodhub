# Pendiente: "última conexión hace X tiempo" en el chat (US-MSG-01)

## Contexto

El primer criterio de aceptación de US-MSG-01 pide que la cabecera del chat
muestre:

> foto de perfil, nombre completo, **indicador de estado (en línea / última
> conexión hace X tiempo)** y un botón "Ver perfil"

De esas cuatro cosas quedaron implementadas tres y **media**: la cabecera muestra
foto, nombre completo, "Ver perfil" y **"En línea"**, pero nunca "última conexión
hace X tiempo".

## Por qué

El sistema **no registra la última conexión de nadie**. `usuario` no tiene una
columna para eso y el diagrama vigente `DG12082026_V5` tampoco la modela, así que
agregarla habría implicado tocar el modelo de datos, que es una decisión de
equipo y no de implementación.

Frente a las tres opciones, el equipo eligió (2026-08-21) la que no toca el
diagrama: **presencia por Supabase Realtime**. El canal privado `chat:<id>` sabe
quién está conectado **ahora**, y con eso alcanza para "En línea"; lo que no
puede saber es cuándo fue la última vez, porque no deja rastro.

Cuando el interlocutor no está conectado, la cabecera **no muestra nada** en esa
línea. No dice "Desconectado": el criterio no lo pide, y la ausencia de presencia
también puede ser una conexión inestable o un cambio de red.

## Qué falta para cerrar esto

1. **Agregar `ultima_conexion` a `Usuario`** en `../Docs/FoodHub - DG*.drawio`
   (pasa a V6) y después en `packages/db/src/schema/usuarios.ts`.
2. **Actualizarla** en algún punto único: el candidato natural es
   `requiereAutenticacion` (`apps/api/src/middleware/auth.middleware.ts`), que
   toda request autenticada atraviesa. Ojo con el costo: sería un `UPDATE` por
   request. Lo habitual es escribir sólo si pasaron más de N minutos desde la
   última marca.
3. **Exponerla** en `interlocutorSchema`
   (`packages/shared/src/schemas/mensajeria.schema.ts`) y formatearla en
   `SubtituloDeCabecera` (`apps/mobile/src/screens/mensajeria/CabeceraDeChat.tsx`)
   con `tiempoTranscurrido`, que ya existe en `apps/mobile/src/lib/formato.ts`.

## Qué NO hay que rehacer

La presencia por Realtime seguiría sirviendo: "En línea" es información mejor y
más inmediata que "última conexión hace 1 minuto". Lo que se agrega es el
**respaldo** para cuando el interlocutor no está conectado.
