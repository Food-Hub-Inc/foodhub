import { Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useDuracion } from '../../hooks/useMovimientoReducido';
import { IconoAlerta, IconoInformacion, IconoTildeCirculo } from '../iconos';
import { FondoTenue } from './FondoTenue';

/**
 * Banner de estado a lo ancho del contenido.
 *
 * Cubre los tres que muestra la maquetación: el aviso naranja del registro de
 * cocinero (PAN-AUT-02), la caja roja de credenciales inválidas (PAN-AUT-03) y
 * la verde de enlace enviado (PAN-AUT-04).
 *
 * Los tres llevan ícono además del color, y el rojo se anuncia como
 * `assertive`: un error que aparece después de tocar un botón tiene que
 * interrumpir la lectura, o el usuario se queda esperando algo que ya pasó.
 */
export type TonoAviso = 'informativo' | 'error' | 'exito';

const ICONO = {
  informativo: IconoInformacion,
  error: IconoAlerta,
  exito: IconoTildeCirculo,
} as const;

const COLOR = {
  informativo: { fondo: 'bg-primary', texto: 'text-warning' },
  error: { fondo: 'bg-error', texto: 'text-error' },
  exito: { fondo: 'bg-success', texto: 'text-success' },
} as const;

export function Aviso({
  tono,
  mensaje,
  className = '',
}: {
  tono: TonoAviso;
  mensaje: string;
  className?: string;
}) {
  const duracion = useDuracion(180);
  const Icono = ICONO[tono];
  const color = COLOR[tono];

  return (
    <Animated.View
      entering={FadeIn.duration(duracion)}
      className={`overflow-hidden rounded-sm p-3.5 ${className}`}
      accessibilityLiveRegion={tono === 'error' ? 'assertive' : 'polite'}
      accessibilityRole="alert"
    >
      <FondoTenue className={color.fondo} />
      <View className="flex-row items-start gap-2.5">
        <View className="mt-0.5">
          <Icono size={18} className={color.texto} />
        </View>
        <Text className={`flex-1 text-body ${color.texto}`}>{mensaje}</Text>
      </View>
    </Animated.View>
  );
}
