-- US-AYU-03: tipos de consulta que faltan para el formulario de contacto
-- del soporte (criterio de aceptacion literal: "Consulta general / Reporte
-- de problema / Sugerencia de mejora / Denuncia").
--
-- La migracion 0000 crea la tabla `tipo_consulta` con la columna
-- `nombre_tipo_consulta` UNIQUE. La seed posterior y la migracion 0002
-- cargaron los cinco valores que ya usa el modulo de Pedidos, pero el
-- formulario de US-AYU-03 exige CUATRO valores, dos de los cuales no estaban
-- sembrados. Este parche los agrega de forma idempotente, sin tocar los
-- preexistentes.
--
-- ON CONFLICT DO NOTHING: la columna tiene UNIQUE sobre nombre, asi que
-- re-ejecutar la migracion no duplica filas. Es el mismo criterio que usan
-- 0004 y 0012 para parametros clave/valor de `configuracion_sistema`.
INSERT INTO "tipo_consulta" ("nombre_tipo_consulta", "activo")
VALUES
  ('Reporte de problema', true),
  ('Denuncia', true)
ON CONFLICT ("nombre_tipo_consulta") DO NOTHING;
