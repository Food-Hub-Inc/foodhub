import { useEffect, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useDuracion } from '../../hooks/useMovimientoReducido';
import { IconoTilde } from '../iconos';
import { MensajeDeCampo } from './MensajeDeCampo';

/**
 * Casilla de verificación (guía visual: "checkbox marcado / sin marcar").
 *
 * Toda la fila —casilla y texto— es el área táctil. Obligar a acertarle a un
 * cuadrado de 20 px en un teléfono es una barrera de accesibilidad, y el texto
 * de al lado ya explica qué se está aceptando.
 */
export function Casilla({
  nombre,
  marcada,
  onChange,
  error,
  children,
  etiquetaAccesible,
}: {
  nombre: string;
  marcada: boolean;
  onChange: (marcada: boolean) => void;
  error?: string | undefined;
  /** Contenido de la etiqueta: admite enlaces embebidos (términos y condiciones). */
  children: ReactNode;
  /** Texto plano equivalente al contenido, para el lector de pantalla. */
  etiquetaAccesible: string;
}) {
  const duracion = useDuracion(140);
  const progreso = useSharedValue(marcada ? 1 : 0);

  useEffect(() => {
    progreso.value = withTiming(marcada ? 1 : 0, { duration: duracion });
  }, [marcada, duracion, progreso]);

  const estiloTilde = useAnimatedStyle(() => ({
    opacity: progreso.value,
    transform: [{ scale: 0.7 + progreso.value * 0.3 }],
  }));

  const bordeMarcado = marcada ? 'border-primary' : 'border-border';
  const borde = error ? 'border-error' : bordeMarcado;
  const fondo = marcada ? 'bg-primary' : 'bg-surface';

  return (
    <View>
      <Pressable
        onPress={() => {
          onChange(!marcada);
        }}
        className="min-h-11 flex-row items-center gap-3 py-1"
        accessibilityRole="checkbox"
        accessibilityState={{ checked: marcada }}
        accessibilityLabel={etiquetaAccesible}
      >
        <View
          className={`h-6 w-6 items-center justify-center rounded-xs border-2 ${borde} ${fondo}`}
        >
          <Animated.View style={estiloTilde}>
            <IconoTilde size={16} className="text-surface" />
          </Animated.View>
        </View>
        <View className="flex-1">{children}</View>
      </Pressable>

      <MensajeDeCampo mensaje={error} idCampo={nombre} />
    </View>
  );
}
