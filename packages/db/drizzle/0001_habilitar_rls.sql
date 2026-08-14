ALTER TABLE "categoria" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "configuracion_sistema" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "motivo_cancelacion" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "rol_destino" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tipo_consulta" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tipo_usuario_cancelacion" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cocinero" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "evento_seguridad" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "usuario" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "version_terminos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "carrito" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "favorito_cocinero" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "favorito_publicacion" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "item_carrito" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "publicacion" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "historial_estado_pedido" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "item_pedido" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pedido" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "calificacion_cocinero" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reaccion_resena" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reporte_resena" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "resena" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "respuesta_cocinero" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "conversacion" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "mensaje" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "dispositivo_push" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notificacion" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "preferencia_notificacion" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "adjunto_ticket" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "capitulo_ayuda" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "faq" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "seccion_ayuda" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ticket_soporte" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "registro_auditoria" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- Bloque agregado a mano sobre la salida de drizzle-kit.
--
-- `ciudad` y `zona_cobertura` se crearon a mano desde el panel de Supabase y
-- nunca entraron al modelo: no figuran en src/schema/ ni en la migracion 0000,
-- asi que drizzle-kit no las ve y no genera el DROP por si solo. No forman
-- parte del alcance, de modo que se eliminan en lugar de incorporarlas.
--
-- Las tres cosas se crearon a mano y son exactamente lo unico que la base tiene
-- de mas respecto del schema: un diff contra el snapshot da 12 columnas
-- sobrantes (las 5 de ciudad, las 6 de zona_cobertura y esta FK) y ninguna
-- faltante. Al borrarlas, base y modelo quedan alineados.
--
-- Primero la columna: `cocinero.zona_cobertura_id` es NOT NULL y apunta a
-- zona_cobertura, asi que mientras exista bloquea el DROP de la tabla. Se hace
-- explicito en vez de usar DROP TABLE ... CASCADE, que se llevaria la columna
-- en silencio sin dejar rastro en la migracion.
--
-- Las tres tablas involucradas estaban vacias (0 filas) al momento de escribir
-- esta migracion, de modo que no se pierde ningun dato.
ALTER TABLE public.cocinero DROP COLUMN IF EXISTS zona_cobertura_id;--> statement-breakpoint
DROP TABLE IF EXISTS public.zona_cobertura;--> statement-breakpoint
DROP TABLE IF EXISTS public.ciudad;