import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { IconoChevronAbajo } from '../iconos';
import { useDuracion } from '../../hooks/useMovimientoReducido';

/**
 * Bloque acordeon usado por la pantalla de Politica de privacidad
 * (US-AYU-04, CA3): el titulo es la fila que se ve siempre; el contenido
 * se expande con FadeIn/FadeOut al tocarla.
 *
 * Sigue el mismo patron que `TarjetaFaq` (PAN-AYU-02): rotacion animada
 * del chevron con `useSharedValue` + `withTiming`, contenido que entra
 * y sale con `entering`/`exiting`.
 */
export function SeccionColapsable({
  titulo,
  children,
  inicialAbierta = false,
}: {
  titulo: string;
  children: React.ReactNode;
  /** Para que el primer item del documento empiece abierto. */
  inicialAbierta?: boolean;
}) {
  const [expandida, setExpandida] = useState(inicialAbierta);
  const rotacion = useSharedValue(inicialAbierta ? 180 : 0);
  const duracion = useDuracion(220);

  useEffect(() => {
    rotacion.set(withTiming(expandida ? 180 : 0, { duration: duracion }));
  }, [duracion, expandida, rotacion]);

  const estiloChevron = useAnimatedStyle(() => ({
    transform: [{ rotate: `${String(rotacion.get())}deg` }],
  }));

  return (
    <View className="mb-3 overflow-hidden rounded-md border border-border bg-surface">
      <Pressable
        className="min-h-14 flex-row items-center gap-3 px-4 py-3"
        onPress={() => {
          setExpandida((abierta) => !abierta);
        }}
        accessibilityRole="button"
        accessibilityState={{ expanded: expandida }}
        accessibilityLabel={titulo}
      >
        <Text className="flex-1 text-body font-semibold text-text-primary">
          {titulo}
        </Text>
        <Animated.View style={estiloChevron}>
          <IconoChevronAbajo className="text-text-secondary" size={20} />
        </Animated.View>
      </Pressable>

      {expandida ? (
        <Animated.View
          className="overflow-hidden border-t border-border"
          entering={FadeIn.duration(duracion)}
          exiting={FadeOut.duration(duracion)}
        >
          <View className="px-4 pt-3 pb-4">{children}</View>
        </Animated.View>
      ) : null}
    </View>
  );
}
