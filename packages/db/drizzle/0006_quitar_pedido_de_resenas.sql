-- Resena por plato (1 de 2): se quita la relacion con pedido.
--
-- El cambio va en DOS migraciones y no en una porque drizzle-kit, al ver en la
-- misma tabla una columna borrada y otra agregada, pregunta de forma
-- interactiva si se trata de un rename. NO lo es: pedido_id y publicacion_id
-- apuntan a tablas distintas y guardan cosas distintas. Separar el DROP (aca)
-- del ADD (0007) hace el diff inequivoco y deja el SQL correcto sin depender
-- de lo que alguien conteste en una consola.
--
-- Incluye tambien el indice unico de carrito, que pasa de (cliente, cocinero) a
-- (cliente): un solo carrito activo por cliente (criterio de US-EXP-05).

ALTER TABLE "calificacion_cocinero" DROP CONSTRAINT "calificacion_cocinero_pedido_id_unique";--> statement-breakpoint
ALTER TABLE "resena" DROP CONSTRAINT "resena_pedido_id_unique";--> statement-breakpoint
ALTER TABLE "calificacion_cocinero" DROP CONSTRAINT "calificacion_cocinero_pedido_id_pedido_id_fk";
--> statement-breakpoint
ALTER TABLE "resena" DROP CONSTRAINT "resena_pedido_id_pedido_id_fk";
--> statement-breakpoint
DROP INDEX "carrito_cliente_cocinero_uq";--> statement-breakpoint
CREATE UNIQUE INDEX "carrito_cliente_uq" ON "carrito" USING btree ("cliente_id");--> statement-breakpoint
CREATE UNIQUE INDEX "calificacion_cocinero_uq" ON "calificacion_cocinero" USING btree ("cocinero_evaluador_id","cliente_evaluado_id");--> statement-breakpoint
ALTER TABLE "calificacion_cocinero" DROP COLUMN "pedido_id";--> statement-breakpoint
ALTER TABLE "resena" DROP COLUMN "pedido_id";