import type {
  CambiarDisponibilidadPublicacionRespuesta,
  CrearPublicacionInput,
  EditarPublicacionInput,
  EstadoPublicacion,
  FiltrosPublicacion,
  PaginaPublicaciones,
  PublicacionDetalle,
} from '@foodhub/shared';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type Query,
  type QueryKey,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import {
  cambiarDisponibilidad,
  crearPublicacion,
  editarPublicacion,
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

/**
 * Selecciona, de entre TODAS las consultas cacheadas de publicaciones
 * propias, las de LISTADO (`PaginaPublicaciones`) y excluye la de detalle
 * (`PublicacionDetalle`, bajo la misma clave base + `'detalle'`): sus formas
 * son distintas y escribirle a la de detalle el mismo `datos.map(...)` de
 * abajo la rompería. Puede haber varias entradas de listado en caché a la vez
 * -una por combinación de filtros/página que el cocinero visitó- y todas
 * tienen que reflejar el cambio, no solo la que está en pantalla.
 */
const consultasDeListado = {
  predicate: (query: Query) =>
    query.queryKey[0] === CLAVE_PUBLICACIONES[0] &&
    query.queryKey[1] === CLAVE_PUBLICACIONES[1] &&
    query.queryKey[2] !== 'detalle',
};

/**
 * US-PUB-04 · Cambio de disponibilidad.
 *
 * El criterio de aceptación exige que, al elegir una opción en el selector,
 * "el cambio se aplica de forma inmediata (...) y el indicador visual se
 * actualiza al color correspondiente" - sin esperar la respuesta del
 * servidor. Por eso la actualización de la card es OPTIMISTA (`onMutate`), a
 * diferencia del resto de las mutaciones del módulo, que escriben la caché
 * recién en `onSuccess`. Si el PATCH falla (la publicación se volvió ajena o
 * se eliminó desde otro dispositivo mientras tanto), `onError` revierte el
 * listado exactamente al estado que tenía antes del toque.
 */
export function useCambiarDisponibilidad(): UseMutationResult<
  CambiarDisponibilidadPublicacionRespuesta,
  Error,
  { publicacionId: string; estadoPublicacion: EstadoPublicacion },
  { previas: [QueryKey, PaginaPublicaciones | undefined][] }
> {
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: ({ publicacionId, estadoPublicacion }) =>
      cambiarDisponibilidad(publicacionId, estadoPublicacion),

    onMutate: async ({ publicacionId, estadoPublicacion }) => {
      await cliente.cancelQueries({ queryKey: CLAVE_PUBLICACIONES });

      const previas =
        cliente.getQueriesData<PaginaPublicaciones>(consultasDeListado);

      cliente.setQueriesData<PaginaPublicaciones>(
        consultasDeListado,
        (pagina) =>
          pagina && {
            ...pagina,
            datos: pagina.datos.map((item) =>
              item.id === publicacionId ? { ...item, estadoPublicacion } : item,
            ),
          },
      );

      return { previas };
    },

    onError: (_error, _variables, contexto) => {
      contexto?.previas.forEach(([clave, pagina]) => {
        cliente.setQueryData(clave, pagina);
      });
    },

    // No invalida en `onSuccess`: la respuesta del servidor confirma
    // exactamente lo que ya se escribió de forma optimista, así que un
    // refetch inmediato solo gastaría datos móviles sin cambiar nada en
    // pantalla. `onSettled` sí revalida, éxito o error, para que la caché
    // vuelva a converger con el servidor ante cualquier duda.
    onSettled: () => {
      void cliente.invalidateQueries({ queryKey: CLAVE_PUBLICACIONES });
    },
  });
}

/** Datos validados del formulario de edición, sin la imagen: igual criterio que el alta. */
export type DatosEditarPublicacion = Omit<EditarPublicacionInput, 'imagenUrl'>;

/**
 * US-PUB-02 · Edición de una publicación propia.
 *
 * Mismo encadenado subida+persistencia que `useCrearPublicacion`, pero acá
 * `imagenUrl` viaja en TRES estados en vez de dos -de ahí que reciba
 * `fotoTocada` aparte de `foto`-:
 *
 *   - `fotoTocada` es `false`: el cocinero no tocó la imagen. `imagenUrl` se
 *     OMITE del PATCH: no participa de esta edición.
 *   - `fotoTocada` es `true` y `foto` es `null`: presionó "Quitar imagen".
 *     `imagenUrl` viaja como `null` explícito (ver `imagenUrlSchema` en
 *     `@foodhub/shared`); la capa de lectura resuelve el fallback a la
 *     imagen de la categoría.
 *   - `fotoTocada` es `true` y `foto` no es `null`: hay una foto nueva que
 *     subir, igual que en el alta.
 */
export function useEditarPublicacion(): UseMutationResult<
  PublicacionDetalle,
  Error,
  {
    id: string;
    datos: DatosEditarPublicacion;
    foto: FotoElegida | null;
    fotoTocada: boolean;
  }
> {
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, datos, foto, fotoTocada }) => {
      const imagenUrl: string | null | undefined = fotoTocada
        ? foto
          ? await subirFotoDePlato(foto)
          : null
        : undefined;

      return editarPublicacion(id, {
        ...datos,
        ...(imagenUrl !== undefined ? { imagenUrl } : {}),
      });
    },
    onSuccess: (detalle) => {
      // La API devuelve el detalle ya actualizado: se escribe directo en la
      // caché para que la pantalla de detalle quede consistente en el mismo
      // tick, sin esperar un GET redundante (mismo criterio que
      // `useEditarPerfil`). El listado sí se invalida: sus tarjetas muestran
      // varios de los campos que la edición puede haber tocado (nombre,
      // precio, categoría, imagen).
      cliente.setQueryData(
        [...CLAVE_PUBLICACIONES, 'detalle', detalle.id],
        detalle,
      );
      void cliente.invalidateQueries(consultasDeListado);
    },
  });
}
