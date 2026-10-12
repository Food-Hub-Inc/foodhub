import { Text, View } from 'react-native';
import { TEXTOS_PERFIL } from '../../lib/textos';
import { IconoAlerta } from '../iconos';
import { Boton } from './Boton';
import { FondoTenue } from './FondoTenue';

/**
 * Estado de error de una pantalla con datos, con acción de reintentar.
 *
 * El quinto criterio de aceptación de US-GURP-01 lo pide textualmente: "muestre
 * un mensaje de error claro y permita reintentar la consulta". Un error sin
 * salida deja al usuario mirando una pantalla muerta; con el botón, el caso más
 * común —el subte, el ascensor, los dos segundos sin señal— se resuelve solo.
 */
export function EstadoDeError({
  mensaje,
  onReintentar,
}: {
  mensaje: string;
  onReintentar: () => void;
}) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <View className="mb-4 h-16 w-16 items-center justify-center overflow-hidden rounded-full">
        <FondoTenue className="bg-error" />
        <IconoAlerta size={28} className="text-error" />
      </View>

      <Text
        className="text-center text-body text-text-secondary"
        accessibilityLiveRegion="polite"
      >
        {mensaje}
      </Text>

      <Boton
        variante="secundario"
        tamano="sm"
        onPress={onReintentar}
        className="mt-5 flex-row items-center justify-center gap-2"
      >
        {TEXTOS_PERFIL.reintentar}
      </Boton>
    </View>
  );
}
