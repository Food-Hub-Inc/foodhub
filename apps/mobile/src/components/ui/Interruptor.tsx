import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useDuracion } from '../../hooks/useMovimientoReducido';

const ANCHO_TRACK = 44;
const ALTO_TRACK = 26;
const TAMANO_THUMB = 22;
const RECORRIDO = ANCHO_TRACK - TAMANO_THUMB - 4;

/**
 * Switch de activación/desactivación (US-CFG-05, PAN-CFG-01).
 *
 * Mismo lenguaje visual que `Casilla`: el color de fondo distingue el estado
 * sin animación y solo el thumb se desliza. `deshabilitado` cubre las
 * notificaciones esenciales del RF059 — el ícono informativo y su tooltip los
 * resuelve quien use este componente, no él.
 */
export function Interruptor({
  activo,
  onChange,
  deshabilitado = false,
  etiquetaAccesible,
}: {
  activo: boolean;
  onChange: (activo: boolean) => void;
  deshabilitado?: boolean;
  etiquetaAccesible: string;
}) {
  const duracion = useDuracion(140);
  const progreso = useSharedValue(activo ? 1 : 0);

  useEffect(() => {
    progreso.value = withTiming(activo ? 1 : 0, { duration: duracion });
  }, [activo, duracion, progreso]);

  const estiloThumb = useAnimatedStyle(() => ({
    transform: [{ translateX: progreso.value * RECORRIDO }],
  }));

  const fondo = deshabilitado || !activo ? 'bg-border' : 'bg-primary';

  return (
    <Pressable
      accessibilityLabel={etiquetaAccesible}
      accessibilityRole="switch"
      accessibilityState={{ checked: activo, disabled: deshabilitado }}
      className="items-center justify-center"
      disabled={deshabilitado}
      onPress={() => {
        onChange(!activo);
      }}
      style={{ width: ANCHO_TRACK + 16, height: 44 }}
    >
      <View
        className={`justify-center rounded-full ${fondo}`}
        style={{
          width: ANCHO_TRACK,
          height: ALTO_TRACK,
          opacity: deshabilitado ? 0.6 : 1,
        }}
      >
        <Animated.View
          className="rounded-full bg-surface"
          style={[
            estiloThumb,
            { width: TAMANO_THUMB, height: TAMANO_THUMB, marginLeft: 2 },
          ]}
        />
      </View>
    </Pressable>
  );
}
