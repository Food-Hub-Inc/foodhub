import { and, eq, inArray } from 'drizzle-orm';
import { dispositivoPush } from '@foodhub/db';
import type { RegistrarDispositivoInput } from '@foodhub/shared';
import { db } from '../../lib/db.js';

/**
 * Expo Push Tokens de los dispositivos (punto 1.3.1.11: "deben persistirse
 * asociados al usuario, con mecanismos de actualizacion ante renovaciones de
 * token o reinstalaciones").
 *
 * Un usuario puede tener varios dispositivos. Un mismo dispositivo fisico, en
 * cambio, tiene UN solo Expo Push Token por proyecto: si el telefono cambia de
 * dueno (A cierra sesion, B inicia), `getExpoPushTokenAsync` devuelve el mismo
 * token, y el registro lo reasigna a B. De ahi el UPSERT sobre `expo_push_token`.
 */

/**
 * US-NOT (registro): alta o renovacion de un token. Idempotente: mismo token =
 * la misma fila, reactivada y reasignada al usuario de la sesion.
 */
export async function registrarDispositivo(entrada: {
  usuarioId: string;
  datos: RegistrarDispositivoInput;
}): Promise<void> {
  const comun = {
    usuarioId: entrada.usuarioId,
    plataforma: entrada.datos.plataforma,
    dispositivoInfo: entrada.datos.dispositivoInfo ?? null,
    activo: true,
    fechaUltimoUso: new Date(),
  };

  await db
    .insert(dispositivoPush)
    .values({ expoPushToken: entrada.datos.expoPushToken, ...comun })
    .onConflictDoUpdate({
      target: dispositivoPush.expoPushToken,
      set: comun,
    });
}

/**
 * Baja de un token, acotada al dueno: la app la llama al cerrar sesion. El
 * `WHERE usuario_id` impide que alguien desactive el dispositivo de otro
 * mandando un token ajeno.
 */
export async function darDeBajaDispositivo(entrada: {
  usuarioId: string;
  expoPushToken: string;
}): Promise<void> {
  await db
    .update(dispositivoPush)
    .set({ activo: false })
    .where(
      and(
        eq(dispositivoPush.expoPushToken, entrada.expoPushToken),
        eq(dispositivoPush.usuarioId, entrada.usuarioId),
      ),
    );
}

/**
 * Desactiva tokens que Expo reporto como `DeviceNotRegistered`. Lo llama el
 * despachador, no un usuario: no se acota por dueno porque es el sistema
 * reaccionando a que el token esta muerto, sea de quien sea.
 */
export async function desactivarTokens(tokens: string[]): Promise<void> {
  if (tokens.length === 0) return;
  await db
    .update(dispositivoPush)
    .set({ activo: false })
    .where(inArray(dispositivoPush.expoPushToken, tokens));
}

/**
 * Tokens activos de un conjunto de usuarios, agrupados por usuario. Lo usa el
 * despachador para armar los mensajes de un lote de notificaciones.
 */
export async function tokensActivosPorUsuario(
  usuarioIds: string[],
): Promise<Map<string, string[]>> {
  const porUsuario = new Map<string, string[]>();
  if (usuarioIds.length === 0) return porUsuario;

  const filas = await db
    .select({
      usuarioId: dispositivoPush.usuarioId,
      token: dispositivoPush.expoPushToken,
    })
    .from(dispositivoPush)
    .where(
      and(
        inArray(dispositivoPush.usuarioId, usuarioIds),
        eq(dispositivoPush.activo, true),
      ),
    );

  for (const fila of filas) {
    const existentes = porUsuario.get(fila.usuarioId) ?? [];
    existentes.push(fila.token);
    porUsuario.set(fila.usuarioId, existentes);
  }
  return porUsuario;
}
