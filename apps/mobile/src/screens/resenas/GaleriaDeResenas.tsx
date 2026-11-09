import { useState } from 'react';
import {
  FlatList,
  Modal,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { Boton } from '../../components/ui/Boton';
import { TEXTOS_RESENA } from '../../lib/textos';

/**
 * Galería a pantalla completa de las fotos adjuntas — US-RES-03.
 *
 * "El cliente presiona sobre una imagen adjunta de una reseña → muestre una
 * galería en pantalla completa con la imagen ampliada y permita navegar entre
 * las imágenes de otras reseñas del mismo cocinero deslizando lateralmente."
 *
 * NO SE REUSA `VisorDeImagen` del chat. Aquel resuelve US-MSG-03: muestra UNA
 * imagen y su razón de ser es el botón "Descargar", que acá no corresponde.
 * Compartirlo obligaría a que un componente tenga dos modos según quién lo
 * llame, con literales de dos módulos distintos adentro.
 *
 * EL ANCHO DE PÁGINA SE MIDE EN TIEMPO DE EJECUCIÓN con `useWindowDimensions`
 * en lugar de tomarse de una constante: `pagingEnabled` avanza de a un ancho de
 * viewport, así que si la página no mide exactamente eso el carrusel queda
 * desalineado al rotar el dispositivo.
 */
export function GaleriaDeResenas({
  fotos,
  indiceInicial,
  onCerrar,
}: {
  fotos: readonly string[];
  indiceInicial: number;
  onCerrar: () => void;
}) {
  const { width } = useWindowDimensions();
  const [actual, setActual] = useState(indiceInicial);

  /**
   * El índice de arranque se congela en la primera apertura. `initialScrollIndex`
   * solo se lee al montar, pero si cambiara mientras la galería está abierta
   * -porque el listado de atrás cargó otra página- React Native reposicionaría
   * el carrusel debajo del dedo del usuario.
   *
   * Es `useState` sin setter y no `useRef` porque leer `.current` durante el
   * render lo prohíbe la regla `react-hooks/refs` del proyecto.
   */
  const [inicial] = useState(indiceInicial);

  const alTerminarDeDeslizar = (
    evento: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    setActual(Math.round(evento.nativeEvent.contentOffset.x / width));
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={onCerrar}
      transparent={false}
      visible={fotos.length > 0}
    >
      <View className="flex-1 bg-text-primary">
        <FlatList
          data={fotos}
          getItemLayout={(_, indice) => ({
            length: width,
            offset: width * indice,
            index: indice,
          })}
          horizontal
          initialScrollIndex={inicial}
          keyExtractor={(url) => url}
          onMomentumScrollEnd={alTerminarDeDeslizar}
          pagingEnabled
          renderItem={({ item }) => (
            <Image
              accessibilityLabel={TEXTOS_RESENA.fotoDeLaResena}
              contentFit="contain"
              source={{ uri: item }}
              style={{ width, flex: 1 }}
            />
          )}
          showsHorizontalScrollIndicator={false}
        />

        <PieDeLaGaleria
          actual={actual}
          onCerrar={onCerrar}
          total={fotos.length}
        />
      </View>
    </Modal>
  );
}

/**
 * Posición y cierre. El contador aparece solo con más de una foto: "1 de 1" no
 * informa nada y ocupa lugar sobre la imagen.
 */
function PieDeLaGaleria({
  actual,
  total,
  onCerrar,
}: {
  actual: number;
  total: number;
  onCerrar: () => void;
}) {
  return (
    <View className="px-4 pb-8 pt-3">
      {total > 1 ? (
        <Text className="mb-3 text-center text-body text-surface">
          {TEXTOS_RESENA.posicionEnGaleria(actual + 1, total)}
        </Text>
      ) : null}

      <Boton onPress={onCerrar} variante="secundario">
        {TEXTOS_RESENA.cerrarGaleria}
      </Boton>
    </View>
  );
}
