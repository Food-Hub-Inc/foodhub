import { Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { IconoAlerta } from '../iconos';
import { useDuracion } from '../../hooks/useMovimientoReducido';

/**
 * Mensaje de error debajo de un campo (maquetación PAN-AUT-01, estado de
 * errores de validación).
 *
 * Lleva SIEMPRE el triángulo además del rojo. El color no puede ser el único
 * canal por el que se comunica un estado: quien no distingue el rojo necesita
 * la forma para saber que ese texto es un error, no una ayuda.
 *
 * La aparición se anima porque el mensaje empuja el contenido de abajo: sin la
 * transición el formulario "salta" mientras se escribe.
 */
export function MensajeDeCampo({
  mensaje,
  idCampo,
}: {
  mensaje: string | undefined;
  /** Identificador del input al que pertenece, para los lectores de pantalla. */
  idCampo: string;
}) {
  const duracion = useDuracion(160);

  if (!mensaje) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(duracion)}
      exiting={FadeOut.duration(duracion)}
      className="mt-1.5 flex-row items-start gap-1.5"
      accessibilityLiveRegion="polite"
      nativeID={`${idCampo}-error`}
    >
      <View className="mt-0.5">
        <IconoAlerta size={14} className="text-error" />
      </View>
      <Text className="flex-1 text-label text-error">{mensaje}</Text>
    </Animated.View>
  );
}
