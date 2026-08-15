import type { PerfilUsuario } from '@foodhub/shared';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { CambiarPasswordInput, EditarPerfilInput } from '@foodhub/shared';
import {
  cambiarMiPassword,
  editarMiPerfil,
  eliminarMiCuenta,
  obtenerMiPerfil,
} from '../api/perfil';
import { useSesion } from './useSesion';

/** Clave de la consulta del perfil propio. Se comparte para poder invalidarla. */
export const CLAVE_PERFIL = ['perfil', 'yo'] as const;

/**
 * Perfil del usuario autenticado (US-GURP-01).
 *
 * El gate de navegación y PAN-GURP-01 leen de la misma consulta: el rol que
 * decide a qué barra de tabs entra el usuario y el nombre que se muestra en el
 * perfil son el mismo dato, y tenerlo dos veces es tenerlo desincronizado.
 *
 * `enabled` la apaga mientras no hay sesión: sin token la request devolvería
 * 401 y react-query lo reintentaría dos veces por nada.
 */
export function usePerfil(): UseQueryResult<PerfilUsuario, Error> {
  const sesion = useSesion((estado) => estado.sesion);

  return useQuery({
    queryKey: CLAVE_PERFIL,
    queryFn: obtenerMiPerfil,
    enabled: sesion !== null,
    // El perfil cambia poco y se invalida a mano al guardar: pedirlo en cada
    // vuelta a la pantalla gastaría datos móviles sin traer nada nuevo.
    staleTime: 5 * 60_000,
  });
}

/** US-GURP-02 · Edición del perfil propio. */
export function useEditarPerfil(): UseMutationResult<
  PerfilUsuario,
  Error,
  EditarPerfilInput
> {
  const cliente = useQueryClient();

  return useMutation({
    // Envuelto y no pasado directo: `editarMiPerfil` acepta un segundo
    // parámetro opcional (el token del registro) y react-query no debe llenarlo
    // con lo que sea que pase como segundo argumento en una versión futura.
    mutationFn: (datos: EditarPerfilInput) => editarMiPerfil(datos),
    onSuccess: (perfil) => {
      // La API devuelve el perfil ya actualizado: escribirlo en la cache evita
      // un GET redundante y deja la pantalla consistente en el mismo tick.
      cliente.setQueryData(CLAVE_PERFIL, perfil);
    },
  });
}

/** US-GURP-03 · Cambio de contraseña. */
export function useCambiarPassword(): UseMutationResult<
  void,
  Error,
  CambiarPasswordInput
> {
  return useMutation({ mutationFn: cambiarMiPassword });
}

/** US-GURP-04 · Baja lógica de la cuenta propia. */
export function useEliminarCuenta(): UseMutationResult<void, Error, void> {
  return useMutation({ mutationFn: eliminarMiCuenta });
}
