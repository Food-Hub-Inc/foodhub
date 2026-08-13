import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Pantalla inicial — scaffold de la Etapa 6.
 *
 * Se reemplaza por PAN-AUT-00 (Bienvenida) al comenzar la codificación del
 * Módulo de autenticación y control de acceso. Las clases de Tailwind usan los
 * tokens declarados en global.css, no valores sueltos: así la pantalla queda
 * atada a la guía visual y no a colores escritos a mano.
 */
export default function Inicio() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-h1 font-extrabold text-text-primary">
          FoodHub
        </Text>

        <Text className="mt-2 text-body text-text-secondary text-center">
          Comida casera de tu barrio
        </Text>

        <View className="mt-8 w-full rounded-md border border-border bg-surface p-4">
          <Text className="text-label font-semibold text-text-primary">
            Scaffold inicial
          </Text>
          <Text className="mt-1 text-caption text-text-secondary">
            Etapa 6 · Desarrollo e Implementación. Las pantallas se incorporan
            según la maquetación aprobada en la Etapa 5.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
