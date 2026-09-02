-- Modulo de Notificaciones y Alertas, parte 2 de 2: siembra de la preferencia
-- PUBLICACION_COCINERO_FAVORITO (US-NOT-06 / US-NOT-08, RF059).
--
-- Va SEPARADA de 0014 porque el valor de enum recien agregado no se puede
-- castear a ::tipo_notificacion en la misma transaccion en que se agrega
-- (restriccion de PostgreSQL). 0014 solo lo declara; aca ya esta comiteado.
--
-- Es una migracion de DATOS para los clientes que existian antes de esta US:
-- el registro nuevo siembra sus propias filas en el alta (auth.service.ts,
-- via `preferenciasIniciales` de @foodhub/shared, que ya incluye este grupo
-- para el rol CLIENTE). Mismo criterio y misma forma que la 0005.
--
--   activa = true       el switch nace encendido (US-NOT-08: "switch habilitado").
--   modificable = true  es una notificacion configurable, no esencial: el
--                       cliente puede apagarla cuando quiera.
--
-- Solo CLIENTE: US-NOT-06 es exclusiva del cliente (el cocinero no tiene este
-- switch, ver GRUPOS_PREFERENCIA_POR_ROL en @foodhub/shared).
--
-- ON CONFLICT DO NOTHING: idempotente sobre el indice unico
-- (usuario_id, tipo_notificacion), igual que la 0005.
INSERT INTO "preferencia_notificacion" ("usuario_id", "tipo_notificacion", "activa", "modificable")
SELECT u."id", 'PUBLICACION_COCINERO_FAVORITO'::"tipo_notificacion", true, true
FROM "usuario" u
WHERE u."tipo" = 'CLIENTE'
ON CONFLICT ("usuario_id", "tipo_notificacion") DO NOTHING;
