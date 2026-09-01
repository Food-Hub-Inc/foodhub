import {
  MAXIMO_ADJUNTOS_POR_CONSULTA,
  type EnviarConsultaInput,
  type EtiquetaTipoConsulta,
  type FormatoAdjuntoTicket,
  type SolicitarUrlCargaAdjuntoTicketInput,
  type TipoConsultaCatalogo,
  type UrlDeCarga,
} from '@foodhub/shared';
import { useMutation } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import {
  enviarConsulta as apiEnviarConsulta,
  solicitarUrlDeCargaDeAdjunto,
} from '../api/soporte';
import { subirArchivoFirmado } from '../lib/storage';
import { useTiposDeConsulta } from './useTiposDeConsulta';
import type { ArchivoParaSubir } from './useSelectorDeAdjuntos';

export { useTiposDeConsulta };

/**
 * Devuelve un mapa `etiqueta -> id` limitado a las cuatro etiquetas del
 * criterio (US-AYU-03). Si una etiqueta del criterio no existe en la base,
 * queda con `id: null` y el formulario la tratara como si no existiera.
 *
 * La pantalla usa esto para mostrar SIEMPRE las cuatro etiquetas del
 * criterio (en el orden del documento) sin importar el orden en que la
 * base las devuelva.
 */
export function useMapaDeTiposDeConsulta(
  tipos: TipoConsultaCatalogo[] | undefined,
): Record<EtiquetaTipoConsulta, { id: string | null; nombre: string }> {
  return useMemo(() => {
    const base: Record<
      EtiquetaTipoConsulta,
      { id: string | null; nombre: string }
    > = {
      'Consulta general': { id: null, nombre: 'Consulta general' },
      'Reporte de problema': { id: null, nombre: 'Reporte de problema' },
      'Sugerencia de mejora': { id: null, nombre: 'Sugerencia de mejora' },
      Denuncia: { id: null, nombre: 'Denuncia' },
    };
    if (!tipos) return base;
    for (const tipo of tipos) {
      const etiqueta = tipo.nombre as EtiquetaTipoConsulta;
      if (etiqueta in base) {
        base[etiqueta] = { id: tipo.id, nombre: tipo.nombre };
      }
    }
    return base;
  }, [tipos]);
}

// ---------------------------------------------------------------------------
// US-AYU-03 · Subida de adjuntos
// ---------------------------------------------------------------------------

/**
 * Resultado exitoso de `useSubirAdjuntos`.
 *
 * `resultados` tiene el mismo orden que `archivos` y la misma longitud:
 * la pantalla puede mapear directamente sobre el array original.
 */
export interface AdjuntoSubido {
  url: string;
  urlPublica: string;
  nombreArchivo: string;
  tipoMime: FormatoAdjuntoTicket;
  tamanoBytes: number;
}

/**
 * Sube en paralelo hasta 3 archivos a Supabase Storage y devuelve los
 * `AdjuntoSubido` listos para el POST `/soporte/tickets`.
 *
 * El cliente pide primero una URL firmada por cada archivo (un POST por
 * archivo) y despues sube el archivo PUT contra esa URL. La API nunca
 * recibe binarios (ver `docs/API-TRANSVERSALES.md`): el limite de 1 MB
 * del body de la API es lo que sostiene ese diseno.
 */
export function useSubirAdjuntos() {
  const [progreso, setProgreso] = useState<{
    cargados: number;
    total: number;
  } | null>(null);

  const mutacion = useMutation({
    mutationFn: async (
      archivos: readonly ArchivoParaSubir[],
    ): Promise<AdjuntoSubido[]> => {
      if (archivos.length > MAXIMO_ADJUNTOS_POR_CONSULTA) {
        throw new Error('Demasiados adjuntos para una sola consulta.');
      }

      setProgreso({ cargados: 0, total: archivos.length });

      // Paso 1: pedir TODAS las URLs firmadas en paralelo. Si una falla,
      // `Promise.all` rechaza y la mutacion propaga el error.
      const entradas: SolicitarUrlCargaAdjuntoTicketInput[] = archivos.map(
        (a) => ({ mimeType: a.mimeType, tamano: a.tamano }),
      );
      const urls: UrlDeCarga[] = await Promise.all(
        entradas.map((datos) => solicitarUrlDeCargaDeAdjunto(datos)),
      );

      // Paso 2: subir cada archivo a su URL firmada. Tambien en paralelo
      // para que la latencia agregada sea la del archivo mas lento y no
      // la suma de todos.
      const subidos: AdjuntoSubido[] = archivos.map((archivo, indice) => {
        const url = urls[indice];
        if (!url) {
          // Teoricamente inacanzable: `urls` y `archivos` tienen la misma
          // longitud, pero TS no lo sabe y la promesa siguiente necesita
          // que el valor este definido.
          throw new Error('Falta la URL firmada de uno de los adjuntos.');
        }
        return {
          url: '',
          urlPublica: '',
          nombreArchivo: archivo.nombre,
          tipoMime: archivo.mimeType,
          tamanoBytes: archivo.tamano,
        };
      });

      let cargados = 0;
      await Promise.all(
        archivos.map(async (archivo, indice) => {
          const url = urls[indice];
          if (!url) return;
          await subirArchivoFirmado({
            uri: archivo.uri,
            mimeType: archivo.mimeType,
            carga: url,
          });
          cargados += 1;
          setProgreso({ cargados, total: archivos.length });
          subidos[indice] = {
            url: url.ruta,
            urlPublica: url.urlPublica,
            nombreArchivo: archivo.nombre,
            tipoMime: archivo.mimeType,
            tamanoBytes: archivo.tamano,
          };
        }),
      );

      setProgreso(null);
      return subidos;
    },
  });

  const reset = useCallback(() => {
    setProgreso(null);
    mutacion.reset();
  }, [mutacion]);

  return { ...mutacion, progreso, reset };
}

// ---------------------------------------------------------------------------
// US-AYU-03 · Envio de la consulta
// ---------------------------------------------------------------------------

/**
 * `useMutation` del POST final. El `mutationFn` solo dispara la consulta
 * (los adjuntos los sube `useSubirAdjuntos` ANTES, en otro paso, asi
 * `onSuccess` puede seguir limpiando el formulario sin reintentar nada).
 */
export function useEnviarConsulta() {
  return useMutation({
    mutationFn: (datos: EnviarConsultaInput) => apiEnviarConsulta(datos),
  });
}
