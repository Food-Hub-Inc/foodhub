-- Correccion de modelo: UNA RESENA SE IDENTIFICA POR (AUTOR, OBJETO RESENADO).
--
-- QUE ESTABA MAL. La 0014 creo `calificacion_a_cocinero` anclada al PEDIDO,
-- con `pedido_id NOT NULL` y UNIQUE sobre esa columna. El pedido no es la
-- clave de negocio de una resena: solo responde "tiene derecho a resenar?" en
-- el momento del alta. Anclarlo ahi produjo una calificacion por pedido en vez
-- de una por cocinero, y por lo tanto un cliente podia calificar N veces al
-- mismo cocinero -una por cada pedido- e inflar o hundir su reputacion.
--
-- QUE HACE ESTA MIGRACION. Fusiona las tres tablas de resena en `resena`, con
-- un discriminador `tipo_resena` y una columna de destino por tipo:
--
--   PLATO     -> publicacion_id       (era `resena`)
--   COCINERO  -> cocinero_res_id      (era `calificacion_a_cocinero`)
--   CLIENTE   -> cliente_destino_id   (era `calificacion_a_cliente`)
--
-- POR QUE UNA SOLA TABLA. `reaccion_resena`, `respuesta_cocinero` y
-- `reporte_resena` cuelgan de `resena_id`, y asi pasan a servir a los tres
-- tipos SIN UN SOLO CAMBIO, incluida la cola de moderacion de PAN-ADM-02. La
-- alternativa -FK anulables hacia dos tablas- obligaba a duplicar cada indice
-- unico en version parcial (en PostgreSQL los NULL no chocan entre si, asi que
-- un indice unico sobre una FK anulable deja de proteger SIN DAR ERROR) y a
-- reescribir el GROUP BY de la cola de moderacion. Los dos son fallos
-- silenciosos. Es el mismo criterio que ya usa `mensaje`.
--
-- ESCRITA A MANO Y NO CON `db:generate`, por los mismos dos motivos que la
-- 0014: el traspaso de filas tiene que PRESERVAR LOS DATOS -Drizzle veria
-- tablas que desaparecen y generaria DROP + CREATE, y en `foodhub-dev` hay 206
-- resenas, 66 calificaciones a clientes y 3 a cocineros cargadas por el
-- equipo-, y los snapshots de `meta/` se cortan en la 0010.
--
-- ============================ ANTES DE CORRER ============================
-- ESTA MIGRACION BORRA DATOS Y MUEVE PROMEDIOS DE REPUTACION.
--
--   1. Respaldar:
--        pg_dump -t calificacion_a_cliente -t calificacion_a_cocinero -t resena
--   2. Contar lo que se consolida (tiene que dar 0 para no perder nada):
--        SELECT count(*) - count(DISTINCT (cliente_id, cocinero_id))
--          FROM calificacion_a_cocinero;
--   3. `foodhub-dev` es COMPARTIDA: avisar al equipo, porque el codigo
--      anterior deja de funcionar en cuanto esto corre.
-- =========================================================================

-- --------------------------------------------------------------------------
-- 1. El discriminador y las columnas de destino
-- --------------------------------------------------------------------------

CREATE TYPE "public"."tipo_resena" AS ENUM ('PLATO', 'COCINERO', 'CLIENTE');
--> statement-breakpoint

-- Se agrega con default para poblar las 206 filas existentes -todas son de
-- plato- y el default se retira despues: en una resena nueva el tipo es una
-- decision explicita de quien la crea, no algo que la base complete.
ALTER TABLE "resena"
  ADD COLUMN "tipo_resena" "tipo_resena" DEFAULT 'PLATO' NOT NULL;
--> statement-breakpoint
ALTER TABLE "resena" ALTER COLUMN "tipo_resena" DROP DEFAULT;
--> statement-breakpoint

-- `cliente_res_id` pasa a `autor_id`: el autor ya no es siempre un cliente
-- -en las resenas de tipo CLIENTE es el cocinero-.
ALTER TABLE "resena" RENAME COLUMN "cliente_res_id" TO "autor_id";
--> statement-breakpoint

ALTER TABLE "resena" ADD COLUMN "cliente_destino_id" uuid;
--> statement-breakpoint
ALTER TABLE "resena"
  ADD CONSTRAINT "resena_cliente_destino_id_usuario_id_fk"
  FOREIGN KEY ("cliente_destino_id") REFERENCES "public"."usuario"("id") ON DELETE cascade;
--> statement-breakpoint

-- Las dos columnas de destino de los otros tipos dejan de ser obligatorias:
-- una resena a un cocinero no tiene plato, y una a un cliente no tiene ninguno
-- de los dos. El CHECK del paso 4 es el que garantiza que este poblado el que
-- corresponde.
ALTER TABLE "resena" ALTER COLUMN "publicacion_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "resena" ALTER COLUMN "cocinero_res_id" DROP NOT NULL;
--> statement-breakpoint

-- --------------------------------------------------------------------------
-- 2. Consolidar los duplicados por par antes de traspasar
-- --------------------------------------------------------------------------
--
-- La unicidad vieja era por pedido, asi que un cliente pudo calificar dos
-- veces al mismo cocinero desde dos pedidos distintos. Se conserva la mas
-- reciente, desempatando por `id` para que el resultado sea el mismo corra
-- donde corra. En `foodhub-dev` al 2026-09-04 no hay ninguna: 3 filas, 3 pares.

DELETE FROM "calificacion_a_cocinero" c
 WHERE c."id" <> (
   SELECT c2."id"
     FROM "calificacion_a_cocinero" c2
    WHERE c2."cliente_id" = c."cliente_id"
      AND c2."cocinero_id" = c."cocinero_id"
    ORDER BY coalesce(c2."fecha_ultima_edicion", c2."fecha_publicacion") DESC,
             c2."id" DESC
    LIMIT 1
 );
--> statement-breakpoint

-- --------------------------------------------------------------------------
-- 3. Traspasar las filas de las dos tablas absorbidas
-- --------------------------------------------------------------------------

-- Las calificaciones al cocinero conservan su `id`: `reaccion_resena` y
-- companiia todavia no las referencian, pero mantenerlo hace el traspaso
-- verificable contra el respaldo fila por fila.
INSERT INTO "resena" (
  "id", "tipo_resena", "autor_id", "cocinero_res_id", "calificacion",
  "comentario", "tags", "estado_resena", "editada",
  "fecha_publicacion", "fecha_ultima_edicion"
)
SELECT "id", 'COCINERO', "cliente_id", "cocinero_id", "calificacion",
       "comentario", "tags", "estado_resena", "editada",
       "fecha_publicacion", "fecha_ultima_edicion"
  FROM "calificacion_a_cocinero";
--> statement-breakpoint

-- `calificacion_a_cliente` no tenia `estado_resena`, `editada` ni
-- `fecha_ultima_edicion`: no era moderable. Al unificarse hereda la maquinaria
-- de moderacion, y las filas existentes entran como VISIBLE y sin editar, que
-- es exactamente lo que eran.
INSERT INTO "resena" (
  "id", "tipo_resena", "autor_id", "cliente_destino_id", "calificacion",
  "comentario", "tags", "estado_resena", "editada", "fecha_publicacion"
)
SELECT "id", 'CLIENTE', "cocinero_evaluador_id", "cliente_evaluado_id",
       "calificacion", "comentario", "tags", 'VISIBLE', false,
       "fecha_publicacion"
  FROM "calificacion_a_cliente";
--> statement-breakpoint

DROP TABLE "calificacion_a_cocinero";
--> statement-breakpoint
DROP TABLE "calificacion_a_cliente";
--> statement-breakpoint

-- --------------------------------------------------------------------------
-- 4. El CHECK que sostiene el discriminador
-- --------------------------------------------------------------------------
--
-- Exactamente el destino de su tipo poblado, y ningun otro. Sin esto una fila
-- podria apuntar a un plato y a un cliente a la vez, o a ninguno de los tres.

ALTER TABLE "resena"
  ADD CONSTRAINT "resena_destino_segun_tipo" CHECK (
    CASE "tipo_resena"
      WHEN 'PLATO' THEN "publicacion_id" IS NOT NULL AND "cocinero_res_id" IS NOT NULL AND "cliente_destino_id" IS NULL
      WHEN 'COCINERO' THEN "publicacion_id" IS NULL AND "cocinero_res_id" IS NOT NULL AND "cliente_destino_id" IS NULL
      WHEN 'CLIENTE' THEN "publicacion_id" IS NULL AND "cocinero_res_id" IS NULL AND "cliente_destino_id" IS NOT NULL
    END
  );
--> statement-breakpoint

-- --------------------------------------------------------------------------
-- 5. Unicidad: una resena por autor y objeto, un indice parcial por tipo
-- --------------------------------------------------------------------------
--
-- Parciales porque la columna de destino es NULL en los otros dos tipos, y en
-- PostgreSQL los NULL no chocan entre si: un unico indice sobre las tres
-- columnas no restringiria nada.

DROP INDEX IF EXISTS "resena_cliente_publicacion_uq";
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "resena_plato_uq"
  ON "resena" ("autor_id", "publicacion_id") WHERE "tipo_resena" = 'PLATO';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "resena_cocinero_uq"
  ON "resena" ("autor_id", "cocinero_res_id") WHERE "tipo_resena" = 'COCINERO';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "resena_cliente_uq"
  ON "resena" ("autor_id", "cliente_destino_id") WHERE "tipo_resena" = 'CLIENTE';
--> statement-breakpoint

-- --------------------------------------------------------------------------
-- 6. Indices de lectura, ahora discriminados por tipo
-- --------------------------------------------------------------------------
--
-- `cocinero_res_id` sirve a dos consultas distintas -la reputacion del
-- cocinero y las resenas de sus platos-, asi que el tipo tiene que entrar en
-- el indice o cada una recorreria tambien las filas de la otra.

DROP INDEX IF EXISTS "resena_cocinero_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "resena_publicacion_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "resena_cliente_idx";
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "resena_opiniones_cocinero_idx"
  ON "resena" ("cocinero_res_id", "fecha_publicacion" DESC)
  WHERE "estado_resena" = 'VISIBLE' AND "tipo_resena" = 'COCINERO';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "resena_platos_del_cocinero_idx"
  ON "resena" ("cocinero_res_id", "fecha_publicacion" DESC)
  WHERE "estado_resena" = 'VISIBLE' AND "tipo_resena" = 'PLATO';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "resena_publicacion_idx"
  ON "resena" ("publicacion_id")
  WHERE "estado_resena" = 'VISIBLE' AND "tipo_resena" = 'PLATO';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "resena_cliente_destino_idx"
  ON "resena" ("cliente_destino_id", "fecha_publicacion" DESC)
  WHERE "estado_resena" = 'VISIBLE' AND "tipo_resena" = 'CLIENTE';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "resena_autor_idx" ON "resena" ("autor_id");
