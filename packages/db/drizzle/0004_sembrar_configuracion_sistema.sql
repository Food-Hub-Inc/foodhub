-- US-CFG-03, RF057: parametros generales de la plataforma. Los valores
-- iniciales son los "predefinidos de fabrica" a los que vuelve "Restaurar
-- valores por defecto" (ver PARAMETROS_*_DEFAULT en
-- packages/shared/src/schemas/configuracionSistema.schema.ts, que debe
-- mantenerse en sincronia con estos valores).
--
-- ON CONFLICT DO NOTHING: idempotente, para que correr las migraciones dos
-- veces (o contra un ambiente que ya tenga datos) no pise valores que el
-- administrador ya haya cambiado.
INSERT INTO "configuracion_sistema" ("clave", "valor", "descripcion")
VALUES
  ('radio_busqueda_defecto_km', '5', 'Radio, en kilómetros, que usa el feed y el mapa para mostrar cocineros cercanos por defecto.'),
  ('distancia_maxima_filtro_km', '20', 'Distancia máxima que un cliente puede seleccionar en el filtro de búsqueda.'),
  ('feed_publicaciones_por_pagina', '20', 'Cantidad de publicaciones que se cargan por página en el feed.'),
  ('pedido_tiempo_cancelacion_cliente_minutos', '5', 'Minutos que tiene el cliente para cancelar un pedido en estado "Creado".'),
  ('pedido_expiracion_minutos', '15', 'Minutos que tiene el cocinero para aceptar o rechazar un pedido antes de que expire automáticamente.'),
  ('resena_minimo_para_promedio', '3', 'Cantidad mínima de reseñas que necesita un cocinero para mostrar su valoración promedio pública.'),
  ('resena_limite_dias_para_resenar', '14', 'Días, tras completar un pedido, que tiene el cliente para dejar una reseña.'),
  ('plataforma_nombre', 'FoodHub', 'Nombre de la plataforma, visible en la app y en las comunicaciones.'),
  ('plataforma_logo_url', '', 'Logo de la plataforma.'),
  ('plataforma_correo_soporte', 'soporte@foodhub.com', 'Correo de contacto que se muestra a los usuarios para soporte.')
ON CONFLICT ("clave") DO NOTHING;
