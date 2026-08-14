import { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

// SafeAreaView envuelto con withUniwind: el de react-native-safe-area-context
// descarta `className` en silencio (ver src/components/SafeAreaView.tsx).
import { SafeAreaView } from '../src/components/SafeAreaView';

// Import con efecto: src/lib/supabase.ts lanza al cargarse si faltan las
// EXPO_PUBLIC_*. Que esta pantalla llegue a renderizar ya prueba que Expo
// levanto el .env de apps/mobile.
import { supabase } from '../src/lib/supabase';

/**
 * Pantalla inicial — scaffold de la Etapa 6.
 *
 * Ademas del "Hola mundo", funciona como prueba de humo del entorno: cada
 * bloque de abajo verifica en pantalla uno de los puntos que rompian el
 * arranque, para no tener que deducirlos de los logs de Metro.
 *
 *   1. El .env de apps/mobile   -> las EXPO_PUBLIC_* llegan al bundle
 *   2. Worklets + Reanimated    -> la animacion corre en el hilo de UI
 *   3. El cliente de Supabase   -> se construyo sin lanzar
 *
 * Se reemplaza por PAN-AUT-00 (Bienvenida) al comenzar la codificacion del
 * Modulo de autenticacion y control de acceso. Las clases de Tailwind usan los
 * tokens declarados en global.css, no valores sueltos: asi la pantalla queda
 * atada a la guia visual y no a colores escritos a mano.
 */
export default function Inicio() {
  /**
   * La animacion es el verdadero test de react-native-worklets: `withRepeat`
   * corre en el hilo de UI a traves de un worklet. Si la version nativa no
   * coincidiera con la de Reanimated —el error que abortaba la build de
   * Gradle— esto no se moveria.
   */
  const escala = useSharedValue(1);

  useEffect(() => {
    escala.value = withRepeat(withTiming(1.15, { duration: 900 }), -1, true);
  }, [escala]);

  const estiloPulso = useAnimatedStyle(() => ({
    transform: [{ scale: escala.value }],
  }));

  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-6">
        <Animated.View
          className="mb-6 h-16 w-16 items-center justify-center rounded-full bg-primary"
          style={estiloPulso}
        >
          <Text className="text-h1 font-extrabold text-surface">FH</Text>
        </Animated.View>

        <Text className="text-h1 font-extrabold text-text-primary">
          ¡Hola, mundo!
        </Text>

        <Text className="mt-2 text-center text-body text-text-secondary">
          FoodHub · comida casera de tu barrios
        </Text>

        <View className="mt-8 w-full rounded-md border border-border bg-surface p-4">
          <Text className="text-label font-semibold text-text-primary">
            Prueba de humo del entorno
          </Text>

          <Chequeo
            etiqueta="Animacion (worklets + reanimated)"
            detalle="el circulo late arriba"
            ok
          />
          <Chequeo
            etiqueta="Cliente de Supabase"
            detalle={supabase ? 'construido' : 'no disponible'}
            ok={Boolean(supabase)}
          />
          <Chequeo
            etiqueta="EXPO_PUBLIC_API_URL"
            detalle={apiUrl ?? 'sin definir'}
            ok={Boolean(apiUrl)}
          />
          <Chequeo
            etiqueta="EXPO_PUBLIC_SUPABASE_URL"
            detalle={supabaseUrl ?? 'sin definir'}
            ok={Boolean(supabaseUrl)}
          />
        </View>

        <Text className="mt-6 text-center text-caption text-text-secondary">
          Editá este archivo y guardá: Fast Refresh debería reflejarlo sin
          reconstruir la app.
        </Text>
      </View>
    </SafeAreaView>
  );
}

/** Una linea de la prueba de humo. */
function Chequeo({
  etiqueta,
  detalle,
  ok,
}: {
  etiqueta: string;
  detalle: string;
  ok: boolean;
}) {
  return (
    <View className="mt-3">
      <Text className="text-caption text-text-secondary">
        <Text className={ok ? 'text-success' : 'text-error'}>
          {ok ? '✓' : '✗'}
        </Text>{' '}
        {etiqueta}
      </Text>
      <Text className="text-caption text-text-disabled">{detalle}</Text>
    </View>
  );
}
