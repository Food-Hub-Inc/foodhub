import type {
  CrearPublicacionInput,
  FiltrosPublicacion,
  PaginaPublicaciones,
  PublicacionDetalle,
} from '@foodhub/shared';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import {
  crearPublicacion,
  listarMisPublicaciones,
  obtenerMiPublicacion,
} from '../api/publicaciones';
import type { FotoElegida } from '../components/ui/SelectorDeFoto';
import { subirFotoDePlato } from '../lib/subirFotoDePlato';
import { useSesion } from './useSesion';

/**
 * Clave base del listado propio. Se comparte para poder invalidarla desde
 * las mutaciones que agregan las historias siguientes (crear, editar,
 * disponibilidad, eliminar).
 */
export const CLAVE_PUBLICACIONES = ['publicaciones', 'propias'] as const;

/**
 * US-PUB-05 · "Mis publicaciones" — listado paginado y filtrado.
 *
 * `keepPreviousData` conserva la página anterior en pantalla mientras llega
 * la nueva: sin esto, cada cambio de filtro o de página muestra el esqueleto
 * de carga y el listado "parpadea" en vez de reemplazarse con suavidad.
 */
export function usePublicacionesPropias(
  filtros: FiltrosPublicacion,
): UseQueryResult<PaginaPublicaciones, Error> {
  const sesion = useSesion((estado) => estado.sesion);

  return useQuery({
    queryKey: [...CLAVE_PUBLICACIONES, filtros],
    queryFn: () => listarMisPublicaciones(filtros),
    enabled: sesion !== null,
    placeholderData: keepPreviousData,
  });
}

/** US-PUB-05 · Detalle de una publicación propia. */
export function usePublicacionPropia(
  id: string | undefined,
): UseQueryResult<PublicacionDetalle, Error> {
  const sesion = useSesion((estado) => estado.sesion);

  return useQuery({
    queryKey: [...CLAVE_PUBLICACIONES, 'detalle', id],
    queryFn: () => obtenerMiPublicacion(id ?? ''),
    enabled: sesion !== null && id !== undefined,
  });
}

/** Datos validados del formulario de alta, sin la imagen: se resuelve aparte. */
export type DatosNuevaPublicacion = Omit<CrearPublicacionInput, 'imagenUrl'>;

/**
 * US-PUB-01 · Alta de una publicación.
 *
 * Encadena, igual que el registro (ver `useRegistro`), la subida de la foto
 * -si el cocinero eligió una- con el alta en sí: la publicación se crea con la
 * URL definitiva de Storage, nunca con un archivo local. Si la subida falla,
 * toda la mutación falla: a diferencia de la foto de perfil en el registro
 * -opcional y tolerante a fallar porque la cuenta ya existe-, acá el cocinero
 * todavía no confirmó nada, así que no tiene sentido publicar sin la imagen
 * que recién eligió y dejarlo enterarse después.
 */
export function useCrearPublicacion(): UseMutationResult<
  PublicacionDetalle,
  Error,
  { datos: DatosNuevaPublicacion; foto: FotoElegida | null }
> {
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: async ({ datos, foto }) => {
      const imagenUrl = foto ? await subirFotoDePlato(foto) : undefined;
      return crearPublicacion({
        ...datos,
        ...(imagenUrl !== undefined ? { imagenUrl } : {}),
      });
    },
    onSuccess: () => {
      void cliente.invalidateQueries({ queryKey: CLAVE_PUBLICACIONES });
    },
  });
}
