import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { TerminosVigentesParaAceptar } from '@foodhub/shared';
import {
  aceptarTerminosVigentes,
  obtenerTerminosVigentesParaAceptar,
} from '../api/terminos';
import { CLAVE_PERFIL } from './usePerfil';

/** Clave de la consulta de términos vigentes de la pantalla de re-aceptación. */
const CLAVE_TERMINOS_VIGENTES = ['terminos', 'vigentes'] as const;

/**
 * Contenido vigente de términos y condiciones y política de privacidad —
 * US-CFG-04 (RF058), pantalla de re-aceptación obligatoria.
 */
export function useTerminosVigentesParaAceptar(): UseQueryResult<
  TerminosVigentesParaAceptar,
  Error
> {
  return useQuery({
    queryKey: CLAVE_TERMINOS_VIGENTES,
    queryFn: obtenerTerminosVigentesParaAceptar,
  });
}

/**
 * Registra la aceptación del usuario autenticado. Invalida el perfil: es lo
 * que hace que `debeAceptarTerminos` pase a `false` y `GateDeSesion` deje
 * entrar al resto de la app en la siguiente vuelta de render.
 */
export function useAceptarTerminos(): UseMutationResult<void, Error, void> {
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: aceptarTerminosVigentes,
    onSuccess: () => {
      void cliente.invalidateQueries({ queryKey: CLAVE_PERFIL });
    },
  });
}
