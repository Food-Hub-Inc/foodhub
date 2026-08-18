# Pendiente: "Publicaciones nuevas de cocineros favoritos" (US-NOT-06)

## Contexto

RF059 (US-CFG-05, criterios de aceptación) pide, para el cliente, un switch
más en la pantalla de preferencias de notificación:

> Publicaciones nuevas de cocineros favoritos (switch habilitado).

US-CFG-05 se implementó sin este switch a propósito. El resto de los
switches de RF059 mapean a valores que ya existen en `TIPO_NOTIFICACION`
(`packages/shared/src/constants/enums.ts`); este no tiene ninguno. El evento
es US-NOT-06 ("un cocinero favorito publica algo nuevo"), y el módulo de
Notificaciones y Alertas (NOT) todavía no está implementado — no hay quién
emita esa notificación, así que agregar el switch ahora sería mostrarle al
usuario una opción que no hace nada.

## Qué falta para cerrar esto

1. **Agregar el valor al enum.** En
   `packages/shared/src/constants/enums.ts`, sumar un valor a
   `TIPO_NOTIFICACION` (por ejemplo `PUBLICACION_COCINERO_FAVORITO`).
2. **Actualizar el diagrama de clases.** `TipoNotificacion` en
   `../Docs/FoodHub - DG12082026_V5.drawio` necesita el mismo literal nuevo,
   a mano, antes de tocar el schema (regla del proyecto).
3. **Migración de base.** `pnpm db:generate` va a proponer un
   `ALTER TYPE tipo_notificacion ADD VALUE ...` sobre el enum de Postgres.
   Revisar el SQL generado antes de commitear, como siempre.
4. **Sumar el switch a US-CFG-05:**
   - `packages/shared/src/schemas/preferenciaNotificacion.schema.ts`: agregar
     el nuevo grupo a `GRUPO_PREFERENCIA_NOTIFICACION`,
     `TIPOS_POR_GRUPO_PREFERENCIA` y a la lista de `CLIENTE` en
     `GRUPOS_PREFERENCIA_POR_ROL`.
   - `apps/mobile/src/lib/textos.ts`: agregar la etiqueta literal a
     `TEXTOS_PREFERENCIAS_NOTIFICACION.etiquetasCliente`.
   - Los clientes que ya existen no van a tener la fila nueva en
     `preferencia_notificacion`: hace falta otra migración de datos, igual
     que `packages/db/drizzle/0005_sembrar_preferencias_notificacion.sql`,
     que la siembre para las cuentas `CLIENTE` existentes. El registro nuevo
     no necesita cambios: `preferenciasIniciales()` la va a incluir sola en
     cuanto el grupo esté en `GRUPOS_PREFERENCIA_POR_ROL.CLIENTE`.
5. **Implementar la emisión real (US-NOT-06, módulo NOT).** Cuando un
   cocinero publique un plato nuevo, para cada fila de `favorito_cocinero`
   que lo tenga como favorito: si el cliente tiene esta preferencia activa,
   escribir la fila en `notificacion` y disparar el push (mismas reglas que
   el resto de NOT, documentadas en la skill `foodhub`,
   `resources/04-modulos-funcionales.md`, sección NOT). Esta parte no
   depende de CFG-05 — depende de que exista el módulo de Publicaciones que
   dispara el evento y el módulo NOT que lo consume.

## Alcance de lo que sí quedó implementado

US-CFG-05 completa (excepto este switch): los otros 3 switches del cliente
(cambios de estado de pedido, mensajes nuevos, avisos del sistema) y los 6
del cocinero, con persistencia inmediata, switches esenciales deshabilitados
con tooltip, y siembra automática al registrarse.
