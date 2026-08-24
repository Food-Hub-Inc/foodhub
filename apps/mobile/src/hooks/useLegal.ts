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
import { saveFile, openFile } from 'expo-downloads';
import * as FileSystem from 'expo-file-system/legacy';
import {
  descargarPdfLegal,
  nombreDeDocumentoLegal,
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
 * Descarga el PDF del documento y lo guarda en la carpeta Descargas del
 * dispositivo, para luego abrirlo en el visor de PDF del sistema.
 *
 * En Android 10+ `expo-downloads` escribe con MediaStore en la carpeta
 * Descargas publica: sin selector de carpeta, sin dialogo de permisos y sin
 * pedirle al usuario que elija donde guardar — el comportamiento de "apretar
 * descargar y que aparezca en Descargas", igual que un navegador. Antes esto
 * abria el dialogo nativo de "Compartir" (`expo-sharing`), que para el
 * usuario no es una descarga.
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

      // `saveFile` recibe el contenido como string (base64), asi que el PDF en
      // cache se lee y se reenvia: la logica de autenticacion de la descarga
      // ya quedo resuelta en `descargarPdfLegal`.
      const contenido = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const guardado = await saveFile({
        name: nombreDeDocumentoLegal(tipo),
        type: 'application/pdf',
        data: contenido,
        encoding: 'base64',
      });

      // En Android nunca viene `cancelled` (solo iOS puede cancelar el picker):
      // si ocurriera, no hay nada que abrir.
      if (guardado.cancelled) return uri;

      try {
        await openFile({ uri: guardado.uri, type: 'application/pdf' });
      } catch {
        // No hay visor de PDF o no se pudo abrir: el archivo igual quedo en
        // Descargas, asi que el guardado no debe reportarse como fallido.
      }

      return guardado.uri;
    },
    onSuccess: () => {
      void cliente.invalidateQueries({ queryKey: ['legal', 'documento'] });
    },
  });
}

/** Helper para traducir errores de los hooks a un mensaje visible. */
export { mensajeDeError };
