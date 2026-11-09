import { useState } from 'react';
import { Modal, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { useResolveClassNames } from 'uniwind';
import {
  MAXIMO_CARACTERES_PIE_DE_IMAGEN,
  MENSAJES_MENSAJERIA,
} from '@foodhub/shared';
import { SafeAreaView } from '../../components/SafeAreaView';
import { Boton } from '../../components/ui/Boton';
import { TEXTOS_MENSAJERIA } from '../../lib/textos';
import type { FotoElegida } from '../../components/ui/SelectorDeFoto';

/**
 * Vista previa antes de enviar una imagen (US-MSG-03).
 *
 * "El usuario selecciona una imagen → muestre una vista previa con la imagen
 * ampliada, un campo opcional para agregar un mensaje de texto que la acompañe y
 * los botones 'Enviar' y 'Cancelar'."
 *
 * EL PIE SÍ SE CORTA con `maxLength`, al revés que el campo de mensaje. Ahí el
 * criterio pide explícitamente dejar escribir de más y avisar con un contador en
 * rojo; acá no dice nada, y un límite que el usuario descubre al chocar contra
 * él es mejor que un texto que se pierde al enviar.
 */
export function VistaPreviaDeImagen({
  foto,
  onCancelar,
  onEnviar,
}: {
  foto: FotoElegida | null;
  onCancelar: () => void;
  onEnviar: (pieDeImagen: string) => void;
}) {
  const [pie, setPie] = useState('');

  const estiloPlaceholder = useResolveClassNames('text-text-disabled');
  const colorPlaceholder =
    typeof estiloPlaceholder.color === 'string'
      ? estiloPlaceholder.color
      : undefined;

  const cerrar = () => {
    setPie('');
    onCancelar();
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={cerrar}
      visible={foto !== null}
    >
      <SafeAreaView className="flex-1 bg-background">
        <Text
          accessibilityRole="header"
          className="px-4 py-3 text-h2 font-bold text-text-primary"
        >
          {TEXTOS_MENSAJERIA.vistaPreviaDeImagen}
        </Text>

        <View className="flex-1 bg-text-primary">
          {foto ? (
            <Image
              contentFit="contain"
              source={{ uri: foto.uri }}
              style={{ flex: 1 }}
            />
          ) : null}
        </View>

        <View className="gap-3 px-4 pb-6 pt-3">
          <TextInput
            accessibilityLabel={TEXTOS_MENSAJERIA.pieDeImagen}
            className="min-h-11 rounded-md border border-border bg-surface px-3 py-2 text-body text-text-primary"
            maxLength={MAXIMO_CARACTERES_PIE_DE_IMAGEN}
            multiline
            onChangeText={setPie}
            placeholder={TEXTOS_MENSAJERIA.pieDeImagen}
            placeholderTextColor={colorPlaceholder}
            value={pie}
          />

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Boton onPress={cerrar} variante="secundario">
                {MENSAJES_MENSAJERIA.cancelar}
              </Boton>
            </View>
            <View className="flex-1">
              <Boton
                onPress={() => {
                  onEnviar(pie.trim());
                  setPie('');
                }}
              >
                {MENSAJES_MENSAJERIA.enviar}
              </Boton>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
