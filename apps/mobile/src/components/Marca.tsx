import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import isotipoFoodHub from '../../assets/isotipo-foodhub.png';

// El PNG fuente es de 1024x1060; se conserva esa proporción al escalar.
const RELACION_DE_ASPECTO = 1060 / 1024;

/** Pin de FoodHub. Es el isotipo aprobado, no una reconstrucción a mano. */
export function PinFoodHub({ size = 96 }: { size?: number }) {
  return (
    <Image
      accessibilityLabel="FoodHub"
      source={isotipoFoodHub}
      style={{ width: size, height: size * RELACION_DE_ASPECTO }}
      contentFit="contain"
    />
  );
}

/**
 * Logotipo horizontal: pin chico + palabra.
 *
 * "Food" va en primario y "hub" en secundario, como en la guía. El texto se
 * compone con `Text` y no con una imagen para que escale con la tipografía
 * del sistema y siga siendo legible con el cuerpo aumentado.
 */
export function MarcaFoodHub({ size = 28 }: { size?: number }) {
  return (
    <View
      className="flex-row items-center gap-2"
      accessible
      accessibilityRole="image"
      accessibilityLabel="FoodHub"
    >
      <PinFoodHub size={size} />
      <Text className="text-h1 font-extrabold text-primary">
        Food<Text className="text-secondary">hub</Text>
      </Text>
    </View>
  );
}
