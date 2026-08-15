import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { MENSAJES_USUARIO } from '@foodhub/shared';
import { TEXTOS_FOTO, TEXTOS_REGISTRO } from '../../lib/textos';
import { IconoCamara } from '../iconos';
import { FondoTenue } from './FondoTenue';
import { MensajeDeCampo } from './MensajeDeCampo';

/**
 * Zona punteada de "Agregar foto" (PAN-AUT-01 y PAN-AUT-02).
 *
 * QUÉ HACE Y QUÉ NO
 * ---------------------------------------------------------------------------
 * Elige la imagen, valida formato y tamaño contra el criterio de aceptación de
 * US-AUT-01 (JPG, PNG o WEBP de hasta 5 MB) y muestra la vista previa. NO la
 * sube: la arquitectura fija que la imagen va del dispositivo al bucket de
 * Supabase Storage por URL firmada, pero ni el nombre del bucket ni el endpoint
 * que emite esa URL están definidos en `docs/API-TRANSVERSALES.md`. Inventarlos
 * sería inventar un requerimiento.
 *
 * Como la foto es opcional en las dos historias, la cuenta se crea igual y el
 * `fotoPerfilUrl` viaja vacío. Queda pendiente de definición del equipo.
 */
export interface FotoElegida {
  uri: string;
  mimeType: string | undefined;
  tamano: number | undefined;
}

/** Límite del criterio de aceptación de US-AUT-01. */
const MAXIMO_BYTES = 5 * 1024 * 1024;
const FORMATOS = ['image/jpeg', 'image/png', 'image/webp'];

export function SelectorDeFoto({
  foto,
  onElegir,
}: {
  foto: FotoElegida | null;
  onElegir: (foto: FotoElegida | null) => void;
}) {
  const [error, setError] = useState<string | undefined>(undefined);

  const elegir = async () => {
    setError(undefined);

    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      setError(TEXTOS_FOTO.permisoDenegado);
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    const elegida = resultado.canceled ? undefined : resultado.assets[0];
    if (!elegida) return;

    // El formato y el peso se comprueban acá y no al enviar: rechazar una foto
    // de 12 MB después de que el usuario completó todo el formulario es la peor
    // manera posible de decírselo.
    const formatoValido =
      elegida.mimeType === undefined || FORMATOS.includes(elegida.mimeType);
    const pesoValido =
      elegida.fileSize === undefined || elegida.fileSize <= MAXIMO_BYTES;

    if (!formatoValido || !pesoValido) {
      setError(MENSAJES_USUARIO.imagenInvalida);
      return;
    }

    onElegir({
      uri: elegida.uri,
      mimeType: elegida.mimeType,
      tamano: elegida.fileSize,
    });
  };

  return (
    <View>
      <View className="mb-1.5 flex-row items-center gap-1">
        <Text className="text-label font-semibold text-text-primary">
          {TEXTOS_REGISTRO.fotoPerfil}
        </Text>
        <Text className="text-label text-text-secondary">
          {TEXTOS_REGISTRO.opcional}
        </Text>
      </View>

      <Pressable
        onPress={() => {
          void elegir();
        }}
        className="h-14 flex-row items-center justify-center gap-2 overflow-hidden rounded-sm border border-dashed border-primary"
        accessibilityRole="button"
        accessibilityLabel={
          foto ? TEXTOS_REGISTRO.cambiarFoto : TEXTOS_REGISTRO.agregarFoto
        }
      >
        <FondoTenue opacidad="opacity-5" />
        {foto ? (
          <Image
            source={{ uri: foto.uri }}
            style={{ width: 36, height: 36, borderRadius: 18 }}
            contentFit="cover"
            accessibilityLabel={TEXTOS_FOTO.vistaPrevia}
          />
        ) : (
          <IconoCamara size={20} className="text-primary" />
        )}
        <Text className="text-body font-bold text-primary">
          {foto ? TEXTOS_REGISTRO.cambiarFoto : TEXTOS_REGISTRO.agregarFoto}
        </Text>
      </Pressable>

      <MensajeDeCampo mensaje={error} idCampo="foto-perfil" />
    </View>
  );
}
