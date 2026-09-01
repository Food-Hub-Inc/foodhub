import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import {
  FORMATOS_ADJUNTO_TICKET,
  MAXIMO_ADJUNTOS_POR_CONSULTA,
  MAXIMO_ADJUNTO_TICKET_BYTES,
  MENSAJES_AYUDA,
  type FormatoAdjuntoTicket,
} from '@foodhub/shared';
import { TEXTOS_AYUDA } from '../lib/textos';

export interface ArchivoParaSubir {
  /** URI local del archivo (la que devuelve `DocumentPicker`). */
  uri: string;
  /** MIME type declarado por el picker. */
  mimeType: FormatoAdjuntoTicket;
  /** Tamano en bytes, leido del File del filesystem. */
  tamano: number;
  /** Nombre original, para mostrarlo y para `nombreArchivo` del body. */
  nombre: string;
}

/**
 * Selector de archivos adjuntos (US-AYU-03).
 *
 * Vive como hook y no como componente porque el formulario que lo
 * contiene (PAN-AYU-03) ya coordina varios dialogos y no conviene sumar
 * un `Modal` mas. La UI vive en `ListaDeAdjuntos.tsx`, que recibe
 * `estado` y `acciones` de este hook y los renderiza.
 *
 * EL TAMANO Y EL FORMATO SE CHEQUEAN ACA Y NO AL ENVIAR. El criterio de
 * aceptacion exige que el rechazo sea inmediato ("Muestre el mensaje
 * 'El archivo debe ser JPG, PNG o PDF de hasta 5 MB.'"), no que se
 * descubra al apretar Enviar. El mismo mensaje se usa para los DOS
 * casos (formato y tamano): la UI no necesita diferenciarlos.
 *
 * El maximo de 3 adjuntos se chequea TAMBIEN aca: si el usuario
 * selecciona un cuarto, se rechaza con `maximoAdjuntos` y no se
 * agrega. Asi la lista nunca pasa del limite y el POST no se va a
 * 400 con un error que el cliente no puede resolver.
 */

export interface EstadoAdjuntos {
  readonly archivos: readonly ArchivoParaSubir[];
  readonly error: string | undefined;
  readonly habilitado: boolean;
}

export interface AccionesAdjuntos {
  readonly agregar: () => Promise<void>;
  readonly quitar: (indice: number) => void;
  readonly limpiar: () => void;
}

/**
 * Resultado de validar un asset. Si el asset es valido, `aceptado`
 * trae el `ArchivoParaSubir` normalizado; si no, `error` tiene el
 * mensaje que la UI debe mostrar (que es siempre el mismo, literal del
 * criterio).
 */
function validarAceptacion(asset: DocumentPicker.DocumentPickerAsset): {
  aceptado?: ArchivoParaSubir;
  error?: string;
} {
  const mime = (asset.mimeType ?? '').toLowerCase();
  if (!(FORMATOS_ADJUNTO_TICKET as readonly string[]).includes(mime)) {
    return { error: MENSAJES_AYUDA.consulta.adjuntoInvalido };
  }
  const tamano = asset.size ?? 0;
  if (tamano <= 0 || tamano > MAXIMO_ADJUNTO_TICKET_BYTES) {
    return { error: MENSAJES_AYUDA.consulta.adjuntoInvalido };
  }
  return {
    aceptado: {
      uri: asset.uri,
      mimeType: mime as FormatoAdjuntoTicket,
      tamano,
      nombre: asset.name ?? TEXTOS_AYUDA.consulta.adjuntar,
    },
  };
}

/**
 * Corta `aceptados` al cupo que todavia tiene libre la lista. Se
 * llama DESPUES de aceptar validos: si el usuario eligio 5 y tiene 1,
 * aceptamos los primeros 2 (cupo libre 2) y descartamos los demas.
 */
function cortarAlCupo(
  aceptados: readonly ArchivoParaSubir[],
  cupoLibre: number,
): ArchivoParaSubir[] {
  return aceptados.slice(0, cupoLibre);
}

export function useSelectorDeAdjuntos(): {
  estado: EstadoAdjuntos;
  acciones: AccionesAdjuntos;
} {
  const [archivos, setArchivos] = useState<ArchivoParaSubir[]>([]);
  const [error, setError] = useState<string | undefined>(undefined);

  const habilitado = archivos.length < MAXIMO_ADJUNTOS_POR_CONSULTA;

  const agregar = async (): Promise<void> => {
    setError(undefined);
    if (archivos.length >= MAXIMO_ADJUNTOS_POR_CONSULTA) {
      setError(MENSAJES_AYUDA.consulta.maximoAdjuntos);
      return;
    }

    const cupoLibre = MAXIMO_ADJUNTOS_POR_CONSULTA - archivos.length;
    const resultado = await DocumentPicker.getDocumentAsync({
      // Mime types admitidos por el criterio. `type` en `getDocumentAsync`
      // acepta un array de strings o `*/*`. Usamos la lista literal: el
      // picker ya la filtra para el usuario.
      type: [...FORMATOS_ADJUNTO_TICKET],
      // Copia el archivo al cache del dispositivo para que
      // `expo-file-system` lo pueda leer de inmediato. Sin esto, en
      // algunas versiones de Android, el URI del picker apuntaba a un
      // archivo en una carpeta que la app no podia leer de inmediato.
      copyToCacheDirectory: true,
      multiple: cupoLibre > 1,
    });

    if (resultado.canceled) return;

    /**
     * `expo-document-picker` puede traer 0, 1 o N archivos, segun como
     * se haya disparado el selector. Normalizamos a un array.
     */
    const elegidos = Array.isArray(resultado.assets) ? resultado.assets : [];

    const aceptados: ArchivoParaSubir[] = [];
    let primerError: string | undefined;
    for (const asset of elegidos) {
      const resultadoValidacion = validarAceptacion(asset);
      if (resultadoValidacion.aceptado) {
        aceptados.push(resultadoValidacion.aceptado);
        continue;
      }
      if (resultadoValidacion.error && primerError === undefined) {
        primerError = resultadoValidacion.error;
      }
    }

    const aceptadosRecortados = cortarAlCupo(aceptados, cupoLibre);

    if (primerError !== undefined) setError(primerError);
    if (aceptadosRecortados.length > 0) {
      setArchivos((prev) => [...prev, ...aceptadosRecortados]);
    }
  };

  const quitar = (indice: number) => {
    setArchivos((prev) => prev.filter((_, i) => i !== indice));
    setError(undefined);
  };

  const limpiar = () => {
    setArchivos([]);
    setError(undefined);
  };

  return {
    estado: { archivos, error, habilitado },
    acciones: { agregar, quitar, limpiar },
  };
}
