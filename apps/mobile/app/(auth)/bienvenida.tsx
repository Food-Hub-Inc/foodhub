import { Text, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { MarcaFoodHub, PinFoodHub } from '../../src/components/Marca';
import { SafeAreaView } from '../../src/components/SafeAreaView';
import { IconoCocinero } from '../../src/components/iconos';
import { Boton, BotonDeTexto } from '../../src/components/ui/Boton';
import { useDuracion } from '../../src/hooks/useMovimientoReducido';
import { TEXTOS_BIENVENIDA } from '../../src/lib/textos';

/**
 * PAN-AUT-00 · Bienvenida.
 *
 * Es la raíz de quien no tiene sesión. NO tiene formulario de ingreso: son tres
 * caminos, y esa ausencia es del mockup, no un recorte. El registro se separa
 * por rol desde acá porque los dos formularios piden cosas distintas —el
 * cocinero declara ubicación y descripción pública— y preguntarlo después de
 * llenar medio formulario obligaría a rehacerlo.
 */

/** Platos de la fila decorativa. Son ilustración, no datos. */
const PLATOS = ['🥘', '🌮', '🥗', '🍲', '🥧'] as const;

export default function Bienvenida() {
  const duracion = useDuracion(320);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 justify-between px-6 pb-8">
        <Animated.View
          className="flex-1 items-center justify-center"
          entering={FadeInUp.duration(duracion)}
        >
          <PinFoodHub size={104} />

          <View className="mt-7">
            <MarcaFoodHub size={34} />
          </View>

          <Text className="mt-6 text-center text-h1 font-extrabold text-text-primary">
            {TEXTOS_BIENVENIDA.titulo}
          </Text>
          <Text className="mt-3 text-center text-body text-text-secondary">
            {TEXTOS_BIENVENIDA.bajada}
          </Text>

          <View
            accessibilityLabel={TEXTOS_BIENVENIDA.chipsPlatos}
            accessibilityRole="image"
            className="mt-8 flex-row gap-3"
          >
            {PLATOS.map((plato) => (
              <View
                className="h-12 w-12 items-center justify-center rounded-full bg-surface"
                key={plato}
              >
                <Text className="text-h2">{plato}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View
          className="gap-3"
          entering={FadeInDown.duration(duracion).delay(120)}
        >
          <Boton
            onPress={() => {
              router.push('/registro-cliente');
            }}
          >
            {TEXTOS_BIENVENIDA.registrarseCliente}
          </Boton>

          <Boton
            icono={<IconoCocinero className="text-primary" size={20} />}
            onPress={() => {
              router.push('/registro-cocinero');
            }}
            variante="secundario"
          >
            {TEXTOS_BIENVENIDA.registrarseCocinero}
          </Boton>

          <View className="mt-1 items-center">
            <BotonDeTexto
              className="text-text-primary"
              onPress={() => {
                router.push('/login');
              }}
            >
              {TEXTOS_BIENVENIDA.iniciarSesion}
            </BotonDeTexto>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
