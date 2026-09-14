-- US-AYU-05 - "Rol destinatario (Cliente / Cocinero / Ambos)".
--
-- La tabla `rol_destino` solo tenia CLIENTE y COCINERO (migracion 0002). El
-- formulario de alta de US-AYU-05 ofrece "Ambos" como tercera opcion, asi que
-- el catalogo necesita esa fila. Se siembra con ON CONFLICT igual que la 0002:
-- reaplicar la migracion no duplica ni pisa una fila existente.
--
-- Consecuencia en las lecturas: el contenido dirigido a "Ambos" debe llegar
-- tanto al cliente como al cocinero, de modo que los servicios de ayuda filtran
-- por el rol del usuario MAS 'AMBOS' (no solo por el rol exacto).

INSERT INTO "rol_destino" ("id", "nombre")
VALUES (gen_random_uuid(), 'AMBOS')
ON CONFLICT ("nombre") DO NOTHING;
