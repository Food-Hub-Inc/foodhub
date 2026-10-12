import { and, eq, inArray } from 'drizzle-orm';
import { preferenciaNotificacion } from '@foodhub/db';
import {
  GRUPOS_PREFERENCIA_POR_ROL,
  MENSAJES_CONFIGURACION,
  TIPOS_NOTIFICACION_ESENCIALES,
  TIPOS_POR_GRUPO_PREFERENCIA,
  type GrupoPreferenciaNotificacion,
  type PreferenciaNotificacionGrupo,
  type PreferenciasNotificacion,
  type TipoNotificacion,
  type TipoUsuario,
} from '@foodhub/shared';
import { db } from '../../lib/db.js';
import {
  noAutorizado,
  noEncontrado,
} from '../../middleware/error.middleware.js';

/**
 * US-CFG-05 (RF059) - Preferencias de notificación push, PAN-CFG-01.
 *
 * Cada fila de `preferencia_notificacion` es un `TIPO_NOTIFICACION`, pero un
 * switch de la pantalla puede cubrir varios a la vez (ver
 * `TIPOS_POR_GRUPO_PREFERENCIA` en `@foodhub/shared`). Las filas se siembran
 * al registrarse (`auth.service.ts`) o, para las cuentas creadas antes de
 * US-CFG-05, en la migración `0005_sembrar_preferencias_notificacion.sql`.
 *
 * EXCEPCIÓN: `PUBLICACION_COCINERO_FAVORITO` (US-NOT-06) se agregó después. No
 * hay migración que lo siembre para los clientes existentes -no se puede usar
 * un valor de enum recién creado en la misma transacción, y drizzle corre
 * todas las migraciones pendientes en una-. `actualizarPreferencia` hace
 * UPSERT: la fila se crea la primera vez que el cliente toca ese switch. Sin
 * fila, `aGrupo` lo muestra en ON (el default de recibir), que es correcto.
 */

interface FilaPreferencia {
  tipoNotificacion: TipoNotificacion;
  activa: boolean;
  modificable: boolean;
}

function aGrupo(
  grupo: GrupoPreferenciaNotificacion,
  filas: readonly FilaPreferencia[],
): PreferenciaNotificacionGrupo {
  const delGrupo = filas.filter((f) =>
    TIPOS_POR_GRUPO_PREFERENCIA[grupo].includes(f.tipoNotificacion),
  );

  return {
    grupo,
    activa: delGrupo.every((f) => f.activa),
    modificable: delGrupo.every((f) => f.modificable),
  };
}

/** US-CFG-05, primer y segundo criterio - Los switches que le corresponden al rol del usuario. */
export async function obtenerPreferencias(entrada: {
  usuarioId: string;
  tipoUsuario: TipoUsuario;
}): Promise<PreferenciasNotificacion> {
  const grupos = GRUPOS_PREFERENCIA_POR_ROL[entrada.tipoUsuario];

  const filas = await db
    .select({
      tipoNotificacion: preferenciaNotificacion.tipoNotificacion,
      activa: preferenciaNotificacion.activa,
      modificable: preferenciaNotificacion.modificable,
    })
    .from(preferenciaNotificacion)
    .where(eq(preferenciaNotificacion.usuarioId, entrada.usuarioId));

  return grupos.map((grupo) => aGrupo(grupo, filas));
}

/**
 * US-CFG-05, cuarto criterio - Cambia un switch y lo persiste de inmediato.
 *
 * UPSERT y no UPDATE: la mayoría de las filas ya existen (sembradas al
 * registrarse o por la 0005), pero `PUBLICACION_COCINERO_FAVORITO` de los
 * clientes anteriores a US-NOT-06 no tiene fila hasta la primera vez que se
 * toca. Con `ON CONFLICT DO UPDATE` los dos casos se resuelven igual.
 *
 * Toca todas las filas del grupo juntas: es una sola unidad de UI (por
 * ejemplo, "Cambios de estado de mis pedidos" apaga PEDIDO_ACEPTADO,
 * PEDIDO_LISTO, PEDIDO_RECHAZADO y PEDIDO_COMPLETADO a la vez).
 */
export async function actualizarPreferencia(entrada: {
  usuarioId: string;
  tipoUsuario: TipoUsuario;
  grupo: GrupoPreferenciaNotificacion;
  activa: boolean;
}): Promise<PreferenciaNotificacionGrupo> {
  const { usuarioId, tipoUsuario, grupo, activa } = entrada;

  if (!GRUPOS_PREFERENCIA_POR_ROL[tipoUsuario].includes(grupo)) {
    throw noEncontrado('el grupo de preferencia solicitado');
  }

  const tipos = TIPOS_POR_GRUPO_PREFERENCIA[grupo];
  const esEsencial = (t: TipoNotificacion) =>
    TIPOS_NOTIFICACION_ESENCIALES.includes(t);

  const filas = await db
    .select({
      tipoNotificacion: preferenciaNotificacion.tipoNotificacion,
      modificable: preferenciaNotificacion.modificable,
    })
    .from(preferenciaNotificacion)
    .where(
      and(
        eq(preferenciaNotificacion.usuarioId, usuarioId),
        inArray(preferenciaNotificacion.tipoNotificacion, tipos),
      ),
    );

  // Sin filas todavía: `modificable` sale del catálogo de esenciales, no del
  // default optimista, para no dejar apagar un switch esencial por accidente.
  const modificable =
    filas.length === 0
      ? !tipos.some(esEsencial)
      : filas.every((f) => f.modificable);

  if (!modificable) {
    throw noAutorizado(MENSAJES_CONFIGURACION.notificacionEsencial);
  }

  await db
    .insert(preferenciaNotificacion)
    .values(
      tipos.map((tipo) => ({
        usuarioId,
        tipoNotificacion: tipo,
        activa,
        modificable: !esEsencial(tipo),
      })),
    )
    .onConflictDoUpdate({
      target: [
        preferenciaNotificacion.usuarioId,
        preferenciaNotificacion.tipoNotificacion,
      ],
      set: { activa },
    });

  return { grupo, activa, modificable };
}
