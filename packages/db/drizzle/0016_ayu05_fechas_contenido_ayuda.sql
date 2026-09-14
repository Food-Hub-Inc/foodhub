-- US-AYU-05 / RF (modulo Ayuda) - Fechas de creacion y ultima modificacion del
-- contenido gestionado desde el panel: capitulos, secciones y preguntas
-- frecuentes.
--
-- ESCRITA A MANO Y NO CON `db:generate`: los snapshots de `meta/` se cortan en
-- la 0010 y el resto de las migraciones del modulo son manuales (ver 0014).
--
-- POR QUE. El criterio de aceptacion de US-AYU-05 exige que, al editar un
-- capitulo o una pregunta, el sistema "registre la fecha de modificacion". No
-- alcanza con `fecha_creacion`: hay que poder distinguir cuando se creo de
-- cuando se toco por ultima vez. `fecha_ultima_modificacion` la actualiza el
-- servicio en cada edicion, igual que `configuracion_sistema`; no se usa un
-- trigger para no repartir la regla entre la base y la API.
--
-- Los defaults permiten agregar las columnas NOT NULL sobre filas existentes
-- sin backfill manual: las filas ya cargadas quedan con la fecha de la
-- migracion como creacion y modificacion.

ALTER TABLE "capitulo_ayuda"
  ADD COLUMN IF NOT EXISTS "fecha_creacion" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "capitulo_ayuda"
  ADD COLUMN IF NOT EXISTS "fecha_ultima_modificacion" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint

ALTER TABLE "seccion_ayuda"
  ADD COLUMN IF NOT EXISTS "fecha_creacion" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "seccion_ayuda"
  ADD COLUMN IF NOT EXISTS "fecha_ultima_modificacion" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint

ALTER TABLE "faq"
  ADD COLUMN IF NOT EXISTS "fecha_creacion" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "faq"
  ADD COLUMN IF NOT EXISTS "fecha_ultima_modificacion" timestamp with time zone DEFAULT now() NOT NULL;
