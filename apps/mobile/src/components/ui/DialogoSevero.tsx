import { Modal, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { useDuracion } from '../../hooks/useMovimientoReducido';
import { IconoAlerta } from '../iconos';
import { Boton, BotonDeTexto } from './Boton';
import { FondoTenue } from './FondoTenue';

/**
 * Diálogo de confirmación de una acción irreversible.
 *
 * Lo usa la baja de cuenta de PAN-GURP-01 (US-GURP-04). A diferencia del cierre
 * de sesión, que es una hoja inferior fácil de descartar, este es un modal
 * centrado y bloqueante: la maquetación lo llama "modal severo" justamente
 * porque la acción no se puede deshacer y el usuario tiene que detenerse a
 * leerlo.
 *
 * El botón destructivo NO es el que queda bajo el pulgar por defecto ni tiene
 * foco automático: la salida cómoda es cancelar.
 */
export function DialogoSevero({
  abierto,
  titulo,
  mensaje,
  textoConfirmar,
  textoCancelar,
  onConfirmar,
  onCancelar,
  procesando = false,
}: {
  abierto: boolean;
  titulo: string;
  mensaje: string;
  textoConfirmar: string;
  textoCancelar: string;
  onConfirmar: () => void;
  onCancelar: () => void;
  procesando?: boolean;
}) {
  const duracion = useDuracion(200);

  return (
    <Modal
      visible={abierto}
      transparent
      animationType="none"
      onRequestClose={onCancelar}
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
            <FondoTenue className="bg-error" />
            <IconoAlerta size={26} className="text-error" />
          </View>

          <Text
            className="text-center text-h2 font-bold text-text-primary"
            accessibilityRole="header"
          >
            {titulo}
          </Text>
          <Text className="mt-2 text-center text-body text-text-secondary">
            {mensaje}
          </Text>

          <Boton
            variante="destructivo"
            onPress={onConfirmar}
            cargando={procesando}
            className="mt-6"
          >
            {textoConfirmar}
          </Boton>
          <View className="mt-1 items-center">
            <BotonDeTexto onPress={onCancelar} className="text-text-primary">
              {textoCancelar}
            </BotonDeTexto>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
