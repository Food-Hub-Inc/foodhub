-- Modulo de Notificaciones y Alertas (US-NOT-01 a US-NOT-08), parte 1 de 2:
-- cambios de esquema. La siembra de la preferencia nueva va en 0015, aparte,
-- porque un valor de enum recien agregado no se puede USAR (castear a
-- ::tipo_notificacion) en la misma transaccion en que se agrega.
--
-- 1. NUEVO VALOR DE ENUM: PUBLICACION_COCINERO_FAVORITO (US-NOT-06).
--    El evento "un cocinero favorito publica un plato nuevo" no tenia tipo
--    propio. Se agrega al final, que es donde `ALTER TYPE ... ADD VALUE` lo
--    deja siempre y donde lo tiene el arreglo `TIPO_NOTIFICACION` de
--    @foodhub/shared. El literal tambien va en `TipoNotificacion` del diagrama
--    DG12082026_V5 (se edita a mano antes de mergear, regla del proyecto).
--
-- 2. NUEVA COLUMNA: notificacion.push_estado.
--    Estado del envio push de cada fila (PENDIENTE / ENVIADO / SIN_DESTINO /
--    FALLIDO). Es infraestructura interna de la API -no esta en el diagrama,
--    igual que dispositivo_push- y por eso es un varchar con default y no un
--    ENUM. El emisor intenta el push sincrono y, si no puede, la deja
--    'PENDIENTE' para el poller; la funcion SQL de expiracion de pedidos
--    (0010, que se amplia en una migracion posterior de este mismo modulo)
--    tambien escribe filas 'PENDIENTE' porque no puede hablar con Expo.
--
-- 3. INDICE PARCIAL para el barrido del poller (cada ~30s): se mantiene
--    diminuto porque casi todas las filas dejan de estar 'PENDIENTE' en la
--    primera corrida.
--
-- Las tres sentencias son IDEMPOTENTES (IF NOT EXISTS): si alguien las corrio
-- a mano en un ambiente antes de esta migracion, aplicarla es un no-op ahi y
-- hace el trabajo en el resto. Mismo criterio que la 0009.

ALTER TYPE "public"."tipo_notificacion" ADD VALUE IF NOT EXISTS 'PUBLICACION_COCINERO_FAVORITO';--> statement-breakpoint

ALTER TABLE "notificacion" ADD COLUMN IF NOT EXISTS "push_estado" varchar(20) DEFAULT 'PENDIENTE' NOT NULL;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "notificacion_push_pendiente_idx" ON "notificacion" USING btree ("fecha_creacion") WHERE "notificacion"."push_estado" = 'PENDIENTE';
