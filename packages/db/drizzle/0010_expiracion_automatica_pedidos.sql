-- US-PED-10 / RF029: expiracion automatica de pedidos sin respuesta.
--
-- "Un proceso periodico detecta los pedidos en estado Creado cuyo tiempo
-- transcurrido desde la creacion supera el umbral configurado y actualiza su
-- estado a Rechazado, registrando el origen del cambio como generado por el
-- sistema."
--
-- POR QUE VIVE EN LA BASE Y NO EN LA API
-- El proceso corre con pg_cron dentro de PostgreSQL (decision del equipo,
-- 2026-08-19). Asi la expiracion no depende de que el servicio de Railway este
-- despierto ni de cuantas instancias haya corriendo: un job programado, una
-- ejecucion. La alternativa -un intervalo dentro del proceso Express- duplicaria
-- el trabajo si algun dia se escala a dos instancias.
--
-- PREREQUISITO MANUAL: la extension pg_cron se habilita una sola vez desde el
-- panel de Supabase, igual que PostGIS (ver documento de configuraciones
-- manuales). Esta migracion no la crea porque `CREATE EXTENSION` exige permisos
-- que el rol de las migraciones puede no tener en todos los ambientes; en su
-- lugar falla con un mensaje claro si no esta.

DO $$
BEGIN
  IF to_regnamespace('cron') IS NULL THEN
    RAISE EXCEPTION 'La extension pg_cron no esta habilitada. Activala en el panel de Supabase (Database > Extensions) antes de aplicar esta migracion.';
  END IF;
END;
$$;--> statement-breakpoint

-- El umbral se lee de `configuracion_sistema` EN CADA CORRIDA y no se hornea en
-- el schedule: US-CFG-03 permite al administrador cambiarlo desde el panel y el
-- cambio tiene que regir sin volver a desplegar ni reprogramar el job.
CREATE OR REPLACE FUNCTION public.expirar_pedidos_sin_respuesta()
RETURNS integer
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  valor_parametro text;
  minutos integer;
  expirados integer;
BEGIN
  SELECT valor INTO valor_parametro
    FROM configuracion_sistema
   WHERE clave = 'pedido_expiracion_minutos';

  -- Ante un parametro ausente, vacio o no numerico se usa el valor de fabrica
  -- de RF057 (15 minutos): un dato mal cargado no puede dejar pedidos colgados
  -- para siempre ni tumbar el job.
  BEGIN
    minutos := valor_parametro::integer;
  EXCEPTION WHEN others THEN
    minutos := 15;
  END;

  IF minutos IS NULL OR minutos <= 0 THEN
    minutos := 15;
  END IF;

  -- El filtro por `estado_pedido_actual = 'CREADO'` dentro del UPDATE es lo que
  -- cumple el segundo criterio de US-PED-10 ("no aplique la expiracion" a los
  -- demas estados) incluso ante una carrera: si el cocinero acepta el pedido
  -- mientras el job corre, PostgreSQL reevalua la condicion sobre la fila ya
  -- actualizada y la deja fuera.
  WITH vencidos AS (
    UPDATE pedido
       SET estado_pedido_actual    = 'RECHAZADO',
           origen_rechazo          = 'SISTEMA',
           fecha_ultima_transicion = now()
     WHERE estado_pedido_actual = 'CREADO'
       AND fecha_creacion < now() - make_interval(mins => minutos)
    RETURNING id
  )
  INSERT INTO historial_estado_pedido (
    pedido_id,
    estado_pedido_anterior,
    estado_pedido_actual,
    origen_transicion,
    usuario_responsable_id,
    motivo,
    fecha_transicion
  )
  -- `usuario_responsable_id` y `motivo` quedan nulos a proposito: no hubo
  -- persona detras y la leyenda que ve el cliente ("Expirado - el cocinero no
  -- respondio a tiempo", PAN-PED-06.4) se deriva de `origen_transicion`, que ya
  -- lo dice todo. Escribir el texto aca lo duplicaria fuera de
  -- @foodhub/shared, que es donde viven los literales del sistema.
  SELECT id, 'CREADO', 'RECHAZADO', 'SISTEMA', NULL, NULL, now()
    FROM vencidos;

  GET DIAGNOSTICS expirados = ROW_COUNT;
  RETURN expirados;
END;
$$;--> statement-breakpoint

-- Cada minuto. El umbral configurable se mide en minutos (RF057: entre 5 y
-- 120), asi que una frecuencia menor haria que un pedido expirara despues de lo
-- prometido; una mayor no aportaria precision.
--
-- `cron.schedule` es idempotente por nombre: reaplicar la migracion actualiza el
-- job en lugar de duplicarlo.
SELECT cron.schedule(
  'foodhub-expirar-pedidos',
  '* * * * *',
  $$SELECT public.expirar_pedidos_sin_respuesta();$$
);
