# Pendiente: notificación de mensaje nuevo en el chat (US-NOT-02)

## Contexto

US-NOT-02 pide que un mensaje nuevo en el chat genere una notificación para el
destinatario. El módulo de Mensajería directa (US-MSG-01 a US-MSG-07) se
implementó **sin esa emisión**, por la misma decisión y el mismo motivo que ya
están documentados en `PENDIENTE_NOTIFICACIONES_DE_PEDIDO.md` (19/08/2026) y en
`PENDIENTE_NOTIFICACIONES_COCINEROS_FAVORITOS.md`: el módulo de Notificaciones y
Alertas (NOT) todavía no existe —no hay servicio de emisión, ni
`dispositivo_push` poblado, ni pantalla de historial (PAN-NOT-01)— y escribir la
emisión desde Mensajería habría metido medio módulo NOT dentro de otro.

Lo que **sí** quedó implementado es todo el aviso dentro de la app:

- el mensaje aparece **en tiempo real** en la conversación abierta (US-MSG-02),
  por Supabase Realtime;
- el **contador de no leídos** de la fila del listado se actualiza solo, aunque
  el usuario esté en otra pantalla, porque `useAcuseDeEntrega` mantiene una
  suscripción viva mientras la app lo esté;
- el mensaje pasa a **ENTREGADO** en cuanto llega al dispositivo.

Lo que falta es el aviso **cuando el usuario no tiene la app abierta**.

## Qué falta para cerrar esto

1. **Escribir la fila en `notificacion`** al enviar un mensaje. El tipo
   `MENSAJE_NUEVO` **ya existe** en `TIPO_NOTIFICACION`
   (`packages/shared/src/constants/enums.ts`): no hace falta migración de enum.
   - El lugar natural es `enviarMensaje`
     (`apps/api/src/modules/mensajeria/mensajeria.service.ts`), que ya es el único
     punto por el que pasa todo mensaje y ya corre dentro de una transacción.
   - `objetoAfectadoId` tiene que llevar el **id de la conversación**, no el del
     mensaje: el deep link abre PAN-MSG-02, y la ruta de la app es
     `/mensajes/[conversacionId]`.
   - Regla del módulo NOT: **la fila se escribe siempre**, aunque el push falle o
     el usuario tenga las notificaciones apagadas.
2. **No notificar si el destinatario está mirando esa conversación.** Es el único
   requisito propio de este evento y no lo tiene ninguno de los de pedido: un
   push por cada mensaje de una charla en curso es ruido puro. La presencia del
   canal `chat:<id>` ya sabe quién está adentro (ver `useCanalDeChat`), pero esa
   información vive en Realtime y no en la base: hay que decidir si la API la
   consulta o si el cliente avisa.
3. **Envío push por Expo/FCM**, con `dispositivo_push` y el registro del token al
   iniciar sesión (punto 1.3.1.11). Síncrono dentro del handler: el MVP no lleva
   cola de mensajes (punto 1.3.1.12).
4. **Respetar `preferencia_notificacion`** sólo para el push, nunca para la fila.

## Qué NO hay que rehacer

El módulo de Mensajería no necesita cambios de contrato ni de pantallas para
esto. La notificación es un efecto adicional de un mensaje que ya está escrito,
validado y replicado en tiempo real a las dos partes.
