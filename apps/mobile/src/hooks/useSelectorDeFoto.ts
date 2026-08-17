import { useRef, useState } from 'react';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import {
  FORMATOS_IMAGEN_PERFIL,
  MAXIMO_IMAGEN_PERFIL_BYTES,
  MENSAJES_USUARIO,
  type FormatoImagenPerfil,
} from '@foodhub/shared';
import { TEXTOS_FOTO } from '../lib/textos';
import type { FotoElegida } from '../components/ui/SelectorDeFoto';

/**
 * Tipo por extensión, para cuando el selector no informa el suyo.
 *
 * `File.extension` devuelve el punto incluido (".png"), de ahí las claves.
 */
const POR_EXTENSION: Record<string, FormatoImagenPerfil> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

const OPCIONES: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.8,
};

type Origen = 'camara' | 'galeria';

function esFormatoPermitido(valor: string): valor is FormatoImagenPerfil {
  return (FORMATOS_IMAGEN_PERFIL as readonly string[]).includes(valor);
}

/**
 * Tipo de la imagen elegida, o `null` si no es uno de los tres admitidos.
 *
 * El selector de Android no siempre informa el `mimeType`: depende de la app de
 * galería que atienda el intent. Cuando falta, la extensión del archivo que
 * dejó en la caché es el único otro dato disponible, y es el mismo criterio que
 * usa Storage para decidir el `content-type` del objeto.
 */
function formatoDe(
  elegida: ImagePicker.ImagePickerAsset,
): FormatoImagenPerfil | null {
  const declarado = elegida.mimeType?.toLowerCase();
  if (declarado !== undefined && esFormatoPermitido(declarado))
    return declarado;

  const extension = new File(elegida.uri).extension.toLowerCase();
  return POR_EXTENSION[extension] ?? null;
}

/**
 * Traduce lo que devuelve el selector al contrato de `FotoElegida`, o `null` si
 * la imagen no cumple el criterio de aceptación de US-AUT-01.
 *
 * EL PESO SE LEE DEL ARCHIVO cuando el selector no lo informa, en lugar de
 * darlo por válido. Antes, un `fileSize` ausente hacía pasar la validación sin
 * mirar nada: una foto de 12 MB llegaba hasta la subida y recién ahí fallaba.
 */
function describir(elegida: ImagePicker.ImagePickerAsset): FotoElegida | null {
  const mimeType = formatoDe(elegida);
  if (mimeType === null) return null;

  const tamano = elegida.fileSize ?? new File(elegida.uri).size;
  if (tamano <= 0 || tamano > MAXIMO_IMAGEN_PERFIL_BYTES) return null;

  return { uri: elegida.uri, mimeType, tamano };
}

/**
 * Estado y acciones de `SelectorDeFoto` (PAN-AUT-01 y PAN-AUT-02).
 *
 * Vive en un hook aparte del componente para que este último se quede solo
 * con el marcado: `SelectorDeFoto` supera el límite de líneas por función de
 * ESLint apenas se le suma la lógica de permisos y validación de las dos
 * fuentes (cámara y galería).
 *
 * "Tomar foto" y "Elegir de la galería" NO abren la cámara o el selector de
 * archivos apenas se tocan. Guardan la intención en `origenPendiente` y piden
 * el cierre de la hoja; recién la lanzan cuando `HojaInferior` avisa que la
 * hoja terminó de cerrarse (`cerrar`, más abajo). Lanzar el selector nativo
 * mientras la hoja todavía se está animando hacia abajo le compite el hilo de
 * UI a esa animación: Android pausa la Activity de la app al abrir la cámara
 * o la galería, la animación de cierre queda a mitad de camino y la hoja no
 * vuelve a responder hasta reiniciar la pantalla.
 */
export function useSelectorDeFoto(
  onElegir: (foto: FotoElegida | null) => void,
) {
  const [error, setError] = useState<string | undefined>(undefined);
  const [abierta, setAbierta] = useState(false);
  const origenPendiente = useRef<Origen | null>(null);

  /**
   * El formato y el peso se comprueban acá y no al enviar: rechazar una foto
   * de 12 MB después de que el usuario completó todo el formulario es la peor
   * manera posible de decírselo.
   */
  const aplicar = (elegida: ImagePicker.ImagePickerAsset | undefined) => {
    if (!elegida) return;

    const foto = describir(elegida);
    if (foto === null) {
      setError(MENSAJES_USUARIO.imagenInvalida);
      return;
    }

    onElegir(foto);
  };

  const elegirDeGaleriaAhora = async () => {
    setError(undefined);

    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      setError(TEXTOS_FOTO.permisoDenegado);
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync(OPCIONES);
    aplicar(resultado.canceled ? undefined : resultado.assets[0]);
  };

  const tomarFotoAhora = async () => {
    setError(undefined);

    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) {
      setError(TEXTOS_FOTO.permisoCamaraDenegado);
      return;
    }

    const resultado = await ImagePicker.launchCameraAsync(OPCIONES);
    aplicar(resultado.canceled ? undefined : resultado.assets[0]);
  };

  /** Le llega a `HojaInferior` como `onCerrar`: corre cuando la hoja ya cerró. */
  const cerrar = () => {
    setAbierta(false);

    const origen = origenPendiente.current;
    origenPendiente.current = null;
    if (origen === 'galeria') void elegirDeGaleriaAhora();
    else if (origen === 'camara') void tomarFotoAhora();
  };

  return {
    error,
    abierta,
    abrir: () => {
      setAbierta(true);
    },
    cerrar,
    elegirDeGaleria: () => {
      origenPendiente.current = 'galeria';
      setAbierta(false);
    },
    tomarFoto: () => {
      origenPendiente.current = 'camara';
      setAbierta(false);
    },
  };
}
