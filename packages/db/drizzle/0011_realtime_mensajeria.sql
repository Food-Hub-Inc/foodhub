-- US-MSG-02 y US-MSG-05: tiempo real del chat.
--
-- "El interlocutor envia un mensaje mientras el usuario esta dentro del chat ->
-- muestre el nuevo mensaje EN TIEMPO REAL sin necesidad de recargar la
-- pantalla", "actualice el indicador de estado a 'Leido' sin necesidad de
-- recargar" y "muestre el indicador 'Escribiendo...'".
--
-- POR QUE ESTE MODULO SI ABRE RLS Y EL DE PEDIDOS NO
--
-- El seguimiento del pedido (US-PED-02) se resolvio con revalidacion periodica
-- de React Query, justamente para no abrir politicas de lectura directa sobre
-- la base (ver el encabezado de apps/mobile/src/hooks/usePedidos.ts). Un pedido
-- cambia de estado cuatro veces en veinte minutos: diez segundos de retraso no
-- cambian ninguna decision del usuario.
--
-- El chat es lo contrario. Tres criterios de aceptacion distintos exigen
-- explicitamente "en tiempo real" y uno de ellos -"Escribiendo..."- es
-- irrealizable con polling: el indicador tiene que aparecer y desaparecer en
-- menos de tres segundos. Por eso el equipo decidio (2026-08-21) habilitar
-- Supabase Realtime SOLO para las dos tablas de mensajeria.
--
-- QUE SE ABRE EXACTAMENTE, Y QUE NO
--
--   SI   SELECT para el rol `authenticated`, y unicamente sobre las filas en
--        las que quien pregunta es uno de los dos participantes.
--   NO   INSERT, UPDATE ni DELETE. No se declara ninguna politica de escritura:
--        todo mensaje se escribe por la API, que valida el JWT, la pertenencia
--        a la conversacion y las reglas del dominio.
--   NO   el rol `anon`. Sin sesion iniciada no se lee nada.
--
-- El efecto colateral que hay que tener presente: con una politica de SELECT,
-- esas dos tablas quedan tambien legibles por la API REST que Supabase expone
-- sola en /rest/v1. Es lectura, acotada a las conversaciones propias y con el
-- JWT del usuario: exactamente lo mismo que ya devuelve la API de FoodHub.
--
-- PREREQUISITO: el esquema `realtime` lo crea Supabase al provisionar el
-- proyecto. Esta migracion falla con un mensaje claro si se la aplica contra un
-- PostgreSQL que no sea de Supabase.

DO $$
BEGIN
  IF to_regnamespace('realtime') IS NULL THEN
    RAISE EXCEPTION 'El esquema `realtime` no existe. Esta migracion requiere un proyecto de Supabase con Realtime habilitado.';
  END IF;
END;
$$;--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 1. Pertenencia a una conversacion
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER a proposito. La funcion la invoca la politica de `mensaje`,
-- que necesita mirar `conversacion` para saber si quien pregunta participa. Sin
-- DEFINER, esa lectura volveria a evaluar la politica de `conversacion` una vez
-- por fila del hilo: el mismo trabajo, repetido, en la consulta mas frecuente
-- del modulo.
--
-- `search_path` fijo y acotado es obligatorio en una funcion DEFINER: sin el,
-- un rol con permiso de creacion en otro esquema podria anteponer una tabla
-- `conversacion` propia y hacer que la funcion devuelva siempre true.
--
-- `(select auth.uid())` y no `auth.uid()` a secas: envuelto en un subselect,
-- PostgreSQL lo evalua UNA vez como InitPlan en lugar de una vez por fila.
CREATE OR REPLACE FUNCTION public.es_participante_de(p_conversacion_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.conversacion c
     WHERE c.id = p_conversacion_id
       AND (SELECT auth.uid()) IN (c.usuario1_id, c.usuario2_id)
  );
$$;--> statement-breakpoint

REVOKE EXECUTE ON FUNCTION public.es_participante_de(uuid) FROM public;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.es_participante_de(uuid) TO authenticated;--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 2. Politicas de lectura sobre las dos tablas del modulo
-- ---------------------------------------------------------------------------

-- RLS ya estaba habilitado en las dos desde 0001_habilitar_rls, que denegaba
-- todo por ausencia de politicas. Esto es lo primero que se les declara.

DROP POLICY IF EXISTS conversacion_select_participante ON public.conversacion;--> statement-breakpoint

CREATE POLICY conversacion_select_participante
  ON public.conversacion
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) IN (usuario1_id, usuario2_id));--> statement-breakpoint

DROP POLICY IF EXISTS mensaje_select_participante ON public.mensaje;--> statement-breakpoint

CREATE POLICY mensaje_select_participante
  ON public.mensaje
  FOR SELECT
  TO authenticated
  USING (public.es_participante_de(conversacion_id));--> statement-breakpoint

-- La politica decide QUE filas se ven; el GRANT decide si el rol puede mirar la
-- tabla siquiera. Hacen falta los dos, y se declaran explicitos para no
-- depender de los privilegios por defecto del proyecto.
GRANT SELECT ON public.conversacion TO authenticated;--> statement-breakpoint
GRANT SELECT ON public.mensaje TO authenticated;--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 3. Publicacion logica que alimenta Realtime
-- ---------------------------------------------------------------------------

-- REPLICA IDENTITY FULL hace que el WAL lleve la fila COMPLETA en los UPDATE.
-- Sin esto, Realtime no puede evaluar la politica de seguridad sobre el registro
-- anterior y descarta el evento: el cambio de ENVIADO a LEIDO -que es un UPDATE-
-- no le llegaria al remitente, y ese es justamente el criterio de US-MSG-02.
--
-- El costo es mas volumen de WAL por fila modificada. Es asumible: los dos
-- unicos UPDATE del modulo son el acuse de entrega y la marca de lectura, sobre
-- filas de pocos cientos de bytes.
ALTER TABLE public.mensaje REPLICA IDENTITY FULL;--> statement-breakpoint
ALTER TABLE public.conversacion REPLICA IDENTITY FULL;--> statement-breakpoint

-- Idempotente por si la publicacion ya existe o ya incluye las tablas:
-- `ALTER PUBLICATION ... ADD TABLE` falla si la tabla ya esta.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'conversacion'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversacion;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'mensaje'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.mensaje;
  END IF;
END;
$$;--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 4. Canal privado por conversacion: "Escribiendo..." y presencia
-- ---------------------------------------------------------------------------

-- El indicador "Escribiendo..." (US-MSG-05) y el "en linea" de la cabecera
-- (US-MSG-01) NO se persisten: son efimeros por definicion y guardarlos
-- ensuciaria la base con estado que caduca en tres segundos. Viajan por los
-- canales Broadcast y Presence de Realtime, que no tocan ninguna tabla de
-- negocio.
--
-- Esos canales se autorizan con politicas sobre `realtime.messages`. El topico
-- es `chat:<conversacion_id>` y solo lo pueden abrir los dos participantes.
CREATE OR REPLACE FUNCTION public.es_participante_del_topico(p_topico text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    -- La comprobacion del formato va ANTES del cast: un topico arbitrario que
    -- no sea un UUID haria fallar `::uuid` con un error de la base en lugar de
    -- denegar limpiamente el acceso.
    WHEN p_topico ~ '^chat:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      THEN public.es_participante_de(substring(p_topico FROM 6)::uuid)
    ELSE false
  END;
$$;--> statement-breakpoint

REVOKE EXECUTE ON FUNCTION public.es_participante_del_topico(text) FROM public;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.es_participante_del_topico(text) TO authenticated;--> statement-breakpoint

-- `realtime.messages` pertenece a `supabase_realtime_admin`, no al rol con el
-- que corren las migraciones. En los proyectos de Supabase el rol `postgres`
-- tiene los permisos para declararle politicas, pero no esta garantizado en
-- todos los ambientes.
--
-- Por eso va dentro de un bloque que atrapa el fallo de permisos y AVISA en
-- lugar de abortar: si esto no se aplica, el chat funciona igual -mensajes,
-- lectura y no leidos siguen andando por la publicacion de arriba- y lo unico
-- que se pierde es "Escribiendo..." y el "en linea". Hacer caer toda la
-- migracion por una funcionalidad accesoria seria peor.
--
-- Si aparece el WARNING, hay que correr las dos sentencias a mano desde el
-- editor SQL del panel de Supabase (ver docs/MENSAJERIA-REALTIME.md).
DO $$
BEGIN
  IF to_regprocedure('realtime.topic()') IS NULL THEN
    RAISE WARNING 'realtime.topic() no existe en este proyecto: los canales privados de "Escribiendo..." y presencia quedan sin autorizar.';
    RETURN;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS foodhub_chat_recibir ON realtime.messages';
  EXECUTE $pol$
    CREATE POLICY foodhub_chat_recibir
      ON realtime.messages
      FOR SELECT
      TO authenticated
      USING (public.es_participante_del_topico(realtime.topic()))
  $pol$;

  EXECUTE 'DROP POLICY IF EXISTS foodhub_chat_emitir ON realtime.messages';
  EXECUTE $pol$
    CREATE POLICY foodhub_chat_emitir
      ON realtime.messages
      FOR INSERT
      TO authenticated
      WITH CHECK (public.es_participante_del_topico(realtime.topic()))
  $pol$;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE WARNING 'Sin permisos para declarar politicas sobre realtime.messages. Corre las sentencias a mano desde el editor SQL del panel (ver docs/MENSAJERIA-REALTIME.md). El chat funciona igual; solo quedan sin efecto "Escribiendo..." y el indicador de presencia.';
END;
$$;
