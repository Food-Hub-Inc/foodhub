-- RF087 / US-RES-07 - El cliente califica al cocinero, una vez por pedido.
--
-- ESCRITA A MANO Y NO CON `db:generate`, por dos motivos:
--
--   1. El renombre de `calificacion_cocinero` tiene que PRESERVAR LOS DATOS.
--      Drizzle no detecta un renombre: veria una tabla que desaparece y otra
--      que aparece, y generaria DROP + CREATE. En `foodhub-dev` ya hay
--      calificaciones cargadas del equipo probando US-RES-02.
--   2. Es la practica del modulo desde la 0011: los snapshots de `meta/` se
--      cortan en la 0010.
--
-- POR QUE SE RENOMBRA. El nombre `calificacion_cocinero` no decia si el
-- cocinero era el AUTOR o el EVALUADO. Con una sola direccion se toleraba; con
-- las dos es directamente ambiguo, porque la version corregida del modulo llama
-- "CalificacionCocinero" a la direccion CONTRARIA de la que ya existia con ese
-- nombre en la base. Las dos tablas pasan a nombrarse por el evaluado.

-- --------------------------------------------------------------------------
-- 1. Renombre de la calificacion que el cocinero le pone al cliente
-- --------------------------------------------------------------------------

ALTER TABLE "calificacion_cocinero" RENAME TO "calificacion_a_cliente";
--> statement-breakpoint

-- Postgres conserva los nombres viejos de indices y restricciones al renombrar
-- la tabla. Se renombran tambien: un indice llamado `calificacion_cocinero_uq`
-- sobre `calificacion_a_cliente` es peor que no tener convencion.
ALTER INDEX "calificacion_cocinero_uq" RENAME TO "calificacion_a_cliente_uq";
--> statement-breakpoint
ALTER INDEX "calificacion_cliente_idx" RENAME TO "calificacion_a_cliente_idx";
--> statement-breakpoint
ALTER TABLE "calificacion_a_cliente"
  RENAME CONSTRAINT "calificacion_cocinero_rango" TO "calificacion_a_cliente_rango";
--> statement-breakpoint

-- --------------------------------------------------------------------------
-- 2. Tabla nueva: la calificacion que el cliente le pone al cocinero
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "calificacion_a_cocinero" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "pedido_id" uuid NOT NULL,
  "cliente_id" uuid NOT NULL,
  "cocinero_id" uuid NOT NULL,
  "calificacion" integer NOT NULL,
  "comentario" varchar(1000),
  "tags" text[],
  "estado_resena" "estado_resena" DEFAULT 'VISIBLE' NOT NULL,
  "editada" boolean DEFAULT false NOT NULL,
  "fecha_publicacion" timestamp with time zone DEFAULT now() NOT NULL,
  "fecha_ultima_edicion" timestamp with time zone,
  CONSTRAINT "calificacion_a_cocinero_rango"
    CHECK ("calificacion" between 1 and 5)
);
--> statement-breakpoint

ALTER TABLE "calificacion_a_cocinero"
  ADD CONSTRAINT "calificacion_a_cocinero_pedido_id_pedido_id_fk"
  FOREIGN KEY ("pedido_id") REFERENCES "public"."pedido"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "calificacion_a_cocinero"
  ADD CONSTRAINT "calificacion_a_cocinero_cliente_id_usuario_id_fk"
  FOREIGN KEY ("cliente_id") REFERENCES "public"."usuario"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "calificacion_a_cocinero"
  ADD CONSTRAINT "calificacion_a_cocinero_cocinero_id_cocinero_usuario_id_fk"
  FOREIGN KEY ("cocinero_id") REFERENCES "public"."cocinero"("usuario_id") ON DELETE cascade;
--> statement-breakpoint

-- Una calificacion por pedido, con independencia de cuantos platos lo integren:
-- un pedido grande no pesa mas sobre la reputacion que uno de un solo plato.
CREATE UNIQUE INDEX IF NOT EXISTS "calificacion_a_cocinero_pedido_uq"
  ON "calificacion_a_cocinero" ("pedido_id");
--> statement-breakpoint

-- Indice parcial del promedio del perfil publico (RF082): solo las VISIBLE
-- promedian, asi que la condicion entra en el indice.
CREATE INDEX IF NOT EXISTS "calificacion_a_cocinero_cocinero_idx"
  ON "calificacion_a_cocinero" ("cocinero_id", "fecha_publicacion" DESC)
  WHERE "estado_resena" = 'VISIBLE';
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "calificacion_a_cocinero_cliente_idx"
  ON "calificacion_a_cocinero" ("cliente_id");
--> statement-breakpoint

-- Mismo criterio que el resto del schema: RLS habilitada y sin politicas, de
-- modo que solo la service role de la API pueda leer y escribir.
ALTER TABLE "calificacion_a_cocinero" ENABLE ROW LEVEL SECURITY;
