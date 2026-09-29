import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import {
  manualPublicoSchema,
  type CapituloManualPublico,
  type ManualPublico,
} from '@foodhub/shared';
import { listarManual } from '../api/soporte';
import { esErrorApi } from '../lib/api';
import { useSesion } from './useSesion';

export const CLAVE_MANUAL = ['soporte', 'manual'] as const;
const PREFIJO_CACHE = 'foodhub:cache:manual';
const claveDe = (usuarioId: string) => `${PREFIJO_CACHE}:${usuarioId}`;

/**
 * Persiste el catálogo descargado para el usuario actual en AsyncStorage (CA5).
 * Exportado para testing y llamadas directas.
 */
export async function guardarManualEnCache(
  usuarioId: string,
  datos: ManualPublico,
): Promise<void> {
  try {
    await AsyncStorage.setItem(claveDe(usuarioId), JSON.stringify(datos));
  } catch {
    // Si falla el guardado en cache (ej. cuota excedida), se ignora defensivamente.
  }
}

/**
 * Recupera el catálogo persistido desde AsyncStorage (CA5).
 * Valida la estructura mediante zod para descartar datos corruptos.
 */
export async function cargarManualDeCache(
  usuarioId: string,
): Promise<ManualPublico | null> {
  try {
    const raw = await AsyncStorage.getItem(claveDe(usuarioId));
    if (!raw) return null;
    const json = JSON.parse(raw) as unknown;
    const parseado = manualPublicoSchema.safeParse(json);
    if (!parseado.success) return null;
    return parseado.data;
  } catch {
    return null;
  }
}

export interface ResultadoManual {
  readonly datos: ManualPublico | undefined;
  readonly capitulos: CapituloManualPublico[];
  readonly estaCargando: boolean;
  readonly esError: boolean;
  readonly error: unknown;
  readonly esModoOffline: boolean;
  readonly reintentar: () => Promise<unknown>;
}

/**
 * US-AYU-01 · Catálogo del manual de usuario para el rol autenticado.
 *
 * Incluye persistencia offline en AsyncStorage por usuario (CA5):
 * - Intenta descargar la versión más reciente del servidor con refetch siempre al montar.
 * - Si hay conexión, actualiza el cache local.
 * - Si no hay conexión (error SIN_CONEXION) y existe un catálogo previo en cache,
 *   activa `esModoOffline` para mostrar los datos cacheados con el aviso informativo.
 * - Si no hay conexión ni cache previo, activa `esError`.
 */
export function useManual(): ResultadoManual {
  const sesion = useSesion((estado) => estado.sesion);
  const usuarioId = sesion?.user.id;

  const cache = useQuery({
    queryKey: [...CLAVE_MANUAL, 'cache', usuarioId],
    queryFn: () => (usuarioId ? cargarManualDeCache(usuarioId) : null),
    enabled: Boolean(usuarioId),
    staleTime: Infinity,
  });

  const query = useQuery({
    queryKey: [...CLAVE_MANUAL, usuarioId],
    queryFn: async () => {
      const respuesta = await listarManual();
      if (usuarioId) {
        void guardarManualEnCache(usuarioId, respuesta);
      }
      return respuesta;
    },
    enabled: sesion !== null,
    refetchOnMount: 'always',
    staleTime: 5 * 60_000,
    retry: (contador, error) => {
      // Si no hay red, no reintentamos en bucle para mostrar el fallback offline de inmediato.
      if (esErrorApi(error) && error.codigo === 'SIN_CONEXION') {
        return false;
      }
      return contador < 2;
    },
  });

  const datos = query.data ?? cache.data ?? undefined;
  const esSinConexion =
    query.isError &&
    esErrorApi(query.error) &&
    query.error.codigo === 'SIN_CONEXION';
  const esModoOffline = Boolean(esSinConexion && datos && datos.length > 0);

  const esError = query.isError && !esModoOffline;
  const estaCargando = !datos && (query.isPending || cache.isPending);

  return {
    datos,
    capitulos: datos ?? [],
    estaCargando,
    esError,
    error: query.error,
    esModoOffline,
    reintentar: () => query.refetch(),
  };
}
