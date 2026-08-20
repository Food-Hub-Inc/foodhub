import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import {
  TIPO_VERSION_TERMINOS,
  type DocumentoLegalVigente,
  type InformacionDeContacto,
  type TipoVersionTerminos,
} from '@foodhub/shared';
import { shareAsync } from 'expo-sharing';
import {
  descargarPdfLegal,
  obtenerDocumentoLegal,
  obtenerInformacionDeContacto,
} from '../api/legal';
import { mensajeDeError } from '../lib/api';

/**
 * Hooks de React Query para el modulo de Informacion legal (US-AYU-04).
 *
 * Las claves de cache son discriminadas por tipo de documento para que un
 * cliente y un cocinero que tienen el mismo celular no compartan datos del
 * documento equivocado si la pantalla se reabre rapidamente.
 */

const CLAVE_DOCUMENTO = (tipo: TipoVersionTerminos) =>
  ['legal', 'documento', tipo] as const;

const CLAVE_CONTACTO = ['legal', 'contacto'] as const;

export function useDocumentoLegal(
  tipo: TipoVersionTerminos,
): UseQueryResult<DocumentoLegalVigente, Error> {
  return useQuery({
    queryKey: CLAVE_DOCUMENTO(tipo),
    queryFn: () => obtenerDocumentoLegal(tipo),
    enabled: TIPO_VERSION_TERMINOS.includes(tipo),
  });
}

export function useInformacionDeContacto(): UseQueryResult<
  InformacionDeContacto,
  Error
> {
  return useQuery({
    queryKey: CLAVE_CONTACTO,
    queryFn: obtenerInformacionDeContacto,
  });
}

/**
 * Descarga el PDF del documento y abre el dialogo nativo de "Compartir" del
 * sistema. Asi el usuario puede guardarlo en Drive, enviarlo por WhatsApp,
 * o abrirlo con un visor PDF sin que la app tenga que elegir por el.
 *
 * El error que devuelve `mutate` ya viene envuelto por React Query; los
 * callers lo traducen con `mensajeDeError`.
 */
export function useDescargarPdfLegal(): UseMutationResult<
  string,
  Error,
  TipoVersionTerminos
> {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: async (tipo: TipoVersionTerminos) => {
      const uri = await descargarPdfLegal(tipo);
      await shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Guardar documento',
      });
      return uri;
    },
    onSuccess: () => {
      void cliente.invalidateQueries({ queryKey: ['legal', 'documento'] });
    },
  });
}

/** Helper para traducir errores de los hooks a un mensaje visible. */
export { mensajeDeError };
