-- US-CFG-02, RF056: opciones fijas del selector "Aplicable a" del formulario
-- de motivo de cancelacion ("Cancelacion por cocinero", "Cancelacion por
-- cliente", "Ambos"). No son administrables desde el panel: es dato de
-- referencia fijo, por eso se siembra en una migracion y no se ofrece ABM.
INSERT INTO "tipo_usuario_cancelacion" ("nombre_tipo_usuario_cancelacion")
VALUES ('COCINERO'), ('CLIENTE'), ('AMBOS')
ON CONFLICT ("nombre_tipo_usuario_cancelacion") DO NOTHING;
