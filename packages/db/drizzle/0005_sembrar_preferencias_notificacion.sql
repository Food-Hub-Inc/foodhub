-- US-CFG-05, RF059: preferencias de notificacion por defecto.
--
-- Cada usuario (cliente o cocinero) necesita una fila por tipo de evento
-- aplicable a su rol para poder mostrar el switch correspondiente con su
-- estado inicial ("activa") y si el usuario puede apagarlo ("modificable").
-- Las notificaciones criticas -- avisos generales del sistema para los dos
-- roles, y eliminacion de publicaciones por el administrador para el
-- cocinero -- se siembran con modificable = false, tal como pide el RF: "no
-- podran deshabilitarse... y se mostraran con el switch deshabilitado".
--
-- Es una migracion de datos para los usuarios que ya existian antes de esta
-- US: el registro nuevo siembra sus propias filas en el alta
-- (auth.service.ts). ON CONFLICT DO NOTHING la deja segura de correr mas de
-- una vez.
INSERT INTO "preferencia_notificacion" ("usuario_id", "tipo_notificacion", "activa", "modificable")
SELECT u."id", t."tipo"::"tipo_notificacion", true, t."modificable"
FROM "usuario" u
CROSS JOIN (
  VALUES
    ('PEDIDO_ACEPTADO', true),
    ('PEDIDO_LISTO', true),
    ('PEDIDO_RECHAZADO', true),
    ('PEDIDO_COMPLETADO', true),
    ('MENSAJE_NUEVO', true),
    ('AVISO_SISTEMA', false)
) AS t("tipo", "modificable")
WHERE u."tipo" = 'CLIENTE'
ON CONFLICT ("usuario_id", "tipo_notificacion") DO NOTHING;
--> statement-breakpoint
INSERT INTO "preferencia_notificacion" ("usuario_id", "tipo_notificacion", "activa", "modificable")
SELECT u."id", t."tipo"::"tipo_notificacion", true, t."modificable"
FROM "usuario" u
CROSS JOIN (
  VALUES
    ('PEDIDO_CREADO', true),
    ('PEDIDO_ACEPTADO', true),
    ('PEDIDO_LISTO', true),
    ('PEDIDO_RECHAZADO', true),
    ('PEDIDO_COMPLETADO', true),
    ('MENSAJE_NUEVO', true),
    ('RESENA_RECIBIDA', true),
    ('PUBLICACION_ELIMINADA_ADMIN', false),
    ('AVISO_SISTEMA', false)
) AS t("tipo", "modificable")
WHERE u."tipo" = 'COCINERO'
ON CONFLICT ("usuario_id", "tipo_notificacion") DO NOTHING;
