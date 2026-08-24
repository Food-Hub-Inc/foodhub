-- US-AYU-04, RF058: horario de atencion del soporte que muestra la pantalla
-- "Contacto del soporte" de PAN-AYU-04.
--
-- Es un parametro institucional nuevo en la misma tabla clave/valor que ya
-- usan `plataforma_nombre`, `plataforma_logo_url` y
-- `plataforma_correo_soporte` (migracion 0004). El admin lo edita desde la
-- subseccion "Informacion institucional" de PAN-ADM-04; el valor inicial
-- coincide con `PARAMETROS_INSTITUCIONALES_DEFAULT.horarioAtencionSoporte`
-- en `packages/shared/src/schemas/configuracionSistema.schema.ts`, que debe
-- mantenerse en sincronia.
--
-- ON CONFLICT DO NOTHING: idempotente, igual que la 0004, para no pisar un
-- horario que el administrador ya haya personalizado.
INSERT INTO "configuracion_sistema" ("clave", "valor", "descripcion")
VALUES
  (
    'plataforma_horario_atencion_soporte',
    'Lunes a viernes de 9 a 18 hs',
    'Horario de atencion del equipo de soporte que se muestra al usuario en la pantalla "Contacto del soporte" (US-AYU-04).'
  )
ON CONFLICT ("clave") DO NOTHING;
