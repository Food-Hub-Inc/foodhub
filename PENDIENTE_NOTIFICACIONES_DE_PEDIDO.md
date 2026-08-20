# Pendiente: notificaciones automáticas del ciclo de vida del pedido (US-NOT-01)

## Contexto

RF025, RF026, RF027, RF028 y RF029 cierran su descripción con "y **notifica al
cliente de forma automática**". El módulo de Pedidos se implementó **sin esa
emisión**, por decisión del equipo del 19/08/2026: el módulo de Notificaciones y
Alertas (NOT) todavía no existe —no hay servicio de emisión, ni
`dispositivo_push` poblado, ni pantalla de historial (PAN-NOT-01)— y escribir la
emisión desde Pedidos habría metido medio módulo NOT dentro de otro.

Es la misma decisión, y por el mismo motivo, que ya está documentada en
`PENDIENTE_NOTIFICACIONES_COCINEROS_FAVORITOS.md` para US-NOT-06.

Lo que **sí** quedó implementado es todo el resto del ciclo de vida: las
transiciones, su registro en `historial_estado_pedido` y la actualización
inmediata de las dos pantallas (la del cliente se revalida sola cada diez
segundos mientras el pedido está activo). El cliente se entera del cambio de
estado; lo que falta es el aviso push cuando no tiene la app abierta.

## Qué falta para cerrar esto

Los cinco eventos, con los mensajes literales de US-NOT-01:

| Transición               | Destinatario | Mensaje del criterio                                                                             |
| ------------------------ | ------------ | ------------------------------------------------------------------------------------------------ |
| `CREADO` (alta)          | cocinero     | "Nuevo pedido recibido — [Nombre del plato] de [Nombre del cliente]. Pedido #FH-XXXXX."          |
| `→ ACEPTADO`             | cliente      | "¡Tu pedido fue aceptado! [Nombre del cocinero] ya está preparando tu pedido. Pedido #FH-XXXXX." |
| `→ LISTO`                | cliente      | "¡Tu pedido está listo! Pedido #FH-XXXXX."                                                       |
| `→ RECHAZADO` (cocinero) | cliente      | ver US-NOT-01 en el documento de proyecto                                                        |
| `→ RECHAZADO` (sistema)  | cliente      | "Tu pedido expiró, el cocinero no respondió a tiempo." (RF029)                                   |

Pasos:

1. **Escribir la fila en `notificacion`** en cada transición, respetando
   `preferencia_notificacion` solo para el push: la regla del módulo NOT es que
   **la fila se escribe siempre**, aunque el push falle o el usuario tenga las
   notificaciones apagadas.
   - El lugar natural es `aplicarTransicion`
     (`apps/api/src/modules/pedidos/transiciones.service.ts`), que ya es el único
     punto por el que pasa todo cambio de estado.
   - Los cinco valores de `TIPO_NOTIFICACION` que hacen falta —`PEDIDO_CREADO`,
     `PEDIDO_ACEPTADO`, `PEDIDO_LISTO`, `PEDIDO_RECHAZADO`,
     `PEDIDO_COMPLETADO`— **ya existen** en
     `packages/shared/src/constants/enums.ts`: no hace falta migración de enum.
2. **La expiración automática también notifica** (RF029), y esa corre en la base
   (`expirar_pedidos_sin_respuesta`, migración 0010). O el job escribe la fila en
   `notificacion` con el mismo INSERT, o el módulo NOT expone un proceso que
   detecte las transiciones con `origen_transicion = 'SISTEMA'` sin notificar.
   Es la única de las cinco que no puede resolverse desde la API.
3. **Envío push por Expo/FCM**, con `dispositivo_push` y el registro del token al
   iniciar sesión (punto 1.3.1.11). Síncrono dentro del handler: el MVP no lleva
   cola de mensajes (punto 1.3.1.12).
4. **Historial in-app** (US-NOT-07, PAN-NOT-01): la pantalla ya existe como
   `app/notificaciones.tsx`, hoy en estado pendiente.

## Qué NO hay que rehacer

El módulo de Pedidos no necesita cambios de contrato ni de pantallas para esto.
La notificación es un efecto adicional de una transición que ya está escrita,
validada y registrada.
