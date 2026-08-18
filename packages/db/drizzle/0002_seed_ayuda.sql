DO $$
DECLARE
  cliente_id uuid;
  cocinero_id uuid;
BEGIN
  INSERT INTO "rol_destino" ("id", "nombre")
  VALUES (gen_random_uuid(), 'CLIENTE')
  ON CONFLICT ("nombre") DO NOTHING;

  INSERT INTO "rol_destino" ("id", "nombre")
  VALUES (gen_random_uuid(), 'COCINERO')
  ON CONFLICT ("nombre") DO NOTHING;

  SELECT "id" INTO cliente_id
  FROM "rol_destino"
  WHERE "nombre" = 'CLIENTE';

  SELECT "id" INTO cocinero_id
  FROM "rol_destino"
  WHERE "nombre" = 'COCINERO';

  INSERT INTO "faq" ("pregunta", "respuesta", "categoria", "rol_destino_id")
  SELECT datos.pregunta, datos.respuesta, datos.categoria, cliente_id
  FROM (VALUES
    ('¿Cómo creo mi cuenta?', 'Completá tus datos de registro y confirmá tu correo electrónico para comenzar a usar FoodHub.', 'Cuenta y registro'),
    ('¿Cómo hago un pedido?', 'Elegí un plato disponible, agregalo a tu carrito y confirmá el pedido con el cocinero.', 'Pedidos'),
    ('¿Dónde dejo una reseña?', 'Cuando el pedido esté completado vas a poder calificar la experiencia desde el detalle del pedido.', 'Reseñas y calificaciones'),
    ('¿Cómo contacto al cocinero?', 'Podés escribirle desde la conversación asociada a tu pedido.', 'Mensajería'),
    ('¿Cómo protege FoodHub mis datos?', 'Tratamos tus datos de acuerdo con nuestra política de privacidad y protegemos el acceso a tu cuenta.', 'Privacidad y seguridad')
  ) AS datos(pregunta, respuesta, categoria)
  WHERE NOT EXISTS (
    SELECT 1 FROM "faq" existente
    WHERE existente."pregunta" = datos.pregunta
      AND existente."rol_destino_id" = cliente_id
  );

  INSERT INTO "faq" ("pregunta", "respuesta", "categoria", "rol_destino_id")
  SELECT datos.pregunta, datos.respuesta, datos.categoria, cocinero_id
  FROM (VALUES
    ('¿Cómo creo mi cuenta de cocinero?', 'Completá el registro como cocinero, agregá tu ubicación y confirmá tu correo electrónico.', 'Cuenta y registro'),
    ('¿Cómo publico un plato?', 'Desde Mis publicaciones elegí Nueva publicación, completá los datos del plato y confirmá la publicación.', 'Publicaciones'),
    ('¿Cómo gestiono un pedido nuevo?', 'Revisá los detalles del pedido y aceptalo o rechazalo desde la bandeja de pedidos.', 'Gestión de pedidos'),
    ('¿Cómo mejoro mi reputación?', 'Brindá una buena experiencia y respondé a las reseñas de tus clientes desde la sección correspondiente.', 'Reseñas y reputación'),
    ('¿Qué información muestra mi dashboard?', 'El dashboard resume tu actividad, pedidos, ventas y valoración durante el período seleccionado.', 'Dashboard'),
    ('¿Cómo protege FoodHub mis datos?', 'Tratamos tus datos de acuerdo con nuestra política de privacidad y protegemos el acceso a tu cuenta.', 'Privacidad y seguridad')
  ) AS datos(pregunta, respuesta, categoria)
  WHERE NOT EXISTS (
    SELECT 1 FROM "faq" existente
    WHERE existente."pregunta" = datos.pregunta
      AND existente."rol_destino_id" = cocinero_id
  );
END $$;--> statement-breakpoint
