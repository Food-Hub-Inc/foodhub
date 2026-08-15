import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useMovimientoReducido } from '../../hooks/useMovimientoReducido';

/**
 * Bloque de carga con la forma del contenido que va a ocupar su lugar.
 *
 * La guía de UX pide skeleton y no un spinner suelto: el skeleton anticipa la
 * estructura, así que cuando llegan los datos nada se mueve de lugar. Un
 * spinner centrado deja la pantalla en blanco y después reacomoda todo de golpe.
 *
 * Con "reducir movimiento" activo el pulso se apaga y queda el bloque quieto:
 * la información —"acá va a haber algo"— se transmite igual por la forma.
 */
export function Esqueleto({ className = '' }: { className?: string }) {
  const reducido = useMovimientoReducido();
  const pulso = useSharedValue(1);

  useEffect(() => {
    if (reducido) {
      pulso.value = 1;
      return;
    }
    pulso.value = withRepeat(withTiming(0.45, { duration: 700 }), -1, true);
  }, [reducido, pulso]);

  const estilo = useAnimatedStyle(() => ({ opacity: pulso.value }));

  return (
    <Animated.View
      style={estilo}
      className={`rounded-sm bg-border ${className}`}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
