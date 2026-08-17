import { Modal, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { useDuracion } from '../../hooks/useMovimientoReducido';
import { IconoTildeCirculo } from '../iconos';
import { Boton } from './Boton';
import { FondoTenue } from './FondoTenue';

/**
 * Modal de confirmación de éxito de una operación ("¡Publicación creada con
 * éxito!" de US-PUB-01, y los análogos de US-PUB-02 y US-PUB-03).
 *
 * Es el complemento en tono positivo de `DialogoSevero`: mismo patrón visual
 * -modal centrado y bloqueante, ver ese componente para el porqué de la
 * elección frente a una hoja inferior- pero con el círculo verde de éxito en
 * vez del rojo de alerta y un solo botón. Un solo botón porque acá no hay nada
 * que cancelar: el criterio de aceptación solo define "cerrar esta ventana",
 * normalmente seguido de una redirección que decide quien usa este componente.
 */
export function DialogoExito({
  abierto,
  mensaje,
  textoBoton,
  onCerrar,
}: {
  abierto: boolean;
  mensaje: string;
  textoBoton: string;
  onCerrar: () => void;
}) {
  const duracion = useDuracion(200);

  return (
    <Modal
      visible={abierto}
      transparent
      animationType="none"
      onRequestClose={onCerrar}
      statusBarTranslucent
    >
      <Animated.View
        entering={FadeIn.duration(duracion)}
        className="flex-1 items-center justify-center px-6"
      >
        <FondoTenue className="bg-text-primary" opacidad="opacity-50" />

        <Animated.View
          entering={ZoomIn.duration(duracion)}
          className="w-full rounded-lg bg-surface p-6"
          accessibilityViewIsModal
          accessibilityRole="alert"
        >
          <View className="mb-4 h-14 w-14 items-center justify-center self-center overflow-hidden rounded-full">
            <FondoTenue className="bg-success" />
            <IconoTildeCirculo size={26} className="text-success" />
          </View>

          <Text
            className="text-center text-h2 font-bold text-text-primary"
            accessibilityRole="header"
          >
            {mensaje}
          </Text>

          <Boton onPress={onCerrar} className="mt-6">
            {textoBoton}
          </Boton>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
