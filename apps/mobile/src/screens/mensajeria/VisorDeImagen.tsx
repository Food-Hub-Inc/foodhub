import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { MENSAJES_MENSAJERIA } from '@foodhub/shared';
import { Boton } from '../../components/ui/Boton';
import { TEXTOS_MENSAJERIA } from '../../lib/textos';

/**
 * Imagen del chat a pantalla completa (US-MSG-03).
 *
 * "El usuario presiona sobre una imagen recibida en el chat → muestre la imagen
 * ampliada en pantalla completa con las opciones 'Descargar' y 'Cerrar'."
 *
 * QUÉ HACE "DESCARGAR", EXACTAMENTE
 *
 * Baja el archivo a la caché de la app y abre la hoja nativa de compartir, donde
 * el usuario elige dónde guardarlo: Fotos, Drive, otra app. Es `expo-sharing` y
 * no `expo-media-library` por decisión del equipo (2026-08-21): escribir directo
 * en la galería exige permiso de escritura de medios y un plugin nativo, o sea
 * una build de EAS nueva para probar el módulo. La hoja de compartir no pide
 * ningún permiso y llega al mismo lugar en un toque más.
 *
 * EL ARCHIVO VA A LA CACHÉ Y NO AL ALMACENAMIENTO PERMANENTE de la app: es una
 * copia de tránsito hacia donde el usuario decida, y el sistema operativo la
 * limpia solo cuando necesite espacio.
 */

/**
 * Nombre con el que se guarda la copia local.
 *
 * Se toma el último segmento de la URL pública, sin la cadena de consulta, para
 * conservar la extensión: sin ella, el destino que elija el usuario no reconoce
 * el tipo del archivo. La URL de Storage siempre trae uno, pero se contempla el
 * caso degenerado en lugar de dar por hecho el formato de un servicio externo.
 */
const NOMBRE_POR_DEFECTO = 'imagen.jpg';

function nombreDeArchivo(imagenUrl: string): string {
  const ultimo = imagenUrl.split('/').pop();
  const sinConsulta = ultimo?.split('?')[0];
  return sinConsulta && sinConsulta.length > 0
    ? sinConsulta
    : NOMBRE_POR_DEFECTO;
}

/**
 * Baja la imagen a la caché y abre la hoja nativa de compartir.
 *
 * Vive en un hook aparte para que el componente se quede con el marcado: con la
 * lógica adentro supera el límite de líneas por función que fija ESLint.
 */
function useDescarga(imagenUrl: string | null) {
  const [error, setError] = useState<string | null>(null);
  const [descargando, setDescargando] = useState(false);

  const descargar = async () => {
    if (!imagenUrl) return;
    setError(null);
    setDescargando(true);

    try {
      const carpeta = new Directory(Paths.cache, 'chat');
      if (!carpeta.exists) carpeta.create({ intermediates: true });

      const destino = new File(carpeta, nombreDeArchivo(imagenUrl));
      if (destino.exists) destino.delete();
      await File.downloadFileAsync(imagenUrl, destino);

      /**
       * Sin hoja de compartir disponible el archivo ya quedó bajado, pero el
       * usuario no tendría forma de llegar a él: se le avisa en vez de dejarlo
       * creyendo que se guardó.
       */
      if (!(await Sharing.isAvailableAsync())) {
        setError(TEXTOS_MENSAJERIA.noSePudoDescargar);
        return;
      }

      await Sharing.shareAsync(destino.uri);
    } catch {
      setError(TEXTOS_MENSAJERIA.noSePudoDescargar);
    } finally {
      setDescargando(false);
    }
  };

  return { error, descargando, descargar };
}

export function VisorDeImagen({
  imagenUrl,
  onCerrar,
}: {
  imagenUrl: string | null;
  onCerrar: () => void;
}) {
  const { error, descargando, descargar } = useDescarga(imagenUrl);

  return (
    <Modal
      animationType="fade"
      onRequestClose={onCerrar}
      transparent={false}
      visible={imagenUrl !== null}
    >
      <View className="flex-1 bg-text-primary">
        <Pressable
          accessibilityLabel={MENSAJES_MENSAJERIA.cerrar}
          accessibilityRole="button"
          className="flex-1"
          onPress={onCerrar}
        >
          {imagenUrl ? (
            <Image
              contentFit="contain"
              source={{ uri: imagenUrl }}
              style={{ flex: 1 }}
            />
          ) : null}
        </Pressable>

        {error ? (
          <Text
            accessibilityLiveRegion="polite"
            className="px-4 pb-2 text-center text-body text-error"
          >
            {error}
          </Text>
        ) : null}

        <View className="flex-row gap-3 px-4 pb-8 pt-3">
          <View className="flex-1">
            <Boton
              cargando={descargando}
              onPress={() => {
                void descargar();
              }}
            >
              {MENSAJES_MENSAJERIA.descargar}
            </Boton>
          </View>
          <View className="flex-1">
            <Boton onPress={onCerrar} variante="secundario">
              {MENSAJES_MENSAJERIA.cerrar}
            </Boton>
          </View>
        </View>
      </View>
    </Modal>
  );
}
