-- Resena por plato (2 de 2): se agrega la relacion con publicacion.
--
-- El ADD COLUMN es NOT NULL SIN DEFAULT, asi que solo se aplica sobre una tabla
-- vacia. Es el caso: el modulo de Resenas (RES) todavia no esta codificado y
-- nada escribe en resena. Verificar con "select count(*) from resena" antes de
-- correr esta migracion en cualquier ambiente que no sea foodhub-dev.

ALTER TABLE "resena" ADD COLUMN "publicacion_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "resena" ADD CONSTRAINT "resena_publicacion_id_publicacion_id_fk" FOREIGN KEY ("publicacion_id") REFERENCES "public"."publicacion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "resena_cliente_publicacion_uq" ON "resena" USING btree ("cliente_res_id","publicacion_id");--> statement-breakpoint
CREATE INDEX "resena_publicacion_idx" ON "resena" USING btree ("publicacion_id") WHERE "resena"."estado_resena" = 'VISIBLE';