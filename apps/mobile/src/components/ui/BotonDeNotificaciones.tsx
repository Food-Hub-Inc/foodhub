import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useNoLeidas } from '../../hooks/useNotificaciones';
import { TEXTOS_NAVEGACION } from '../../lib/textos';
import { IconoCampana } from '../iconos';

/**
 * Campana con contador, en el header del menú de inicio (PAN-EXP-01 para el
 * cliente, PAN-PUB-01 para el cocinero). Abre PAN-NOT-01 (US-NOT-07).
 *
 * POR QUÉ NO ES UNA SOLAPA DE LA BARRA INFERIOR
 * ---------------------------------------------------------------------------
 * Así lo resuelve la maquetación, y tiene sentido: la barra inferior es para
 * los lugares donde el usuario trabaja, y las notificaciones son un aviso al
 * que se entra y del que se vuelve. Ponerlas ahí gastaría una de las cinco
 * posiciones.
 *
 * El contador sale de `useNoLeidas` (GET /notificaciones/no-leidas), no de una
 * prop: la campana aparece en dos pantallas distintas y ninguna debería tener
 * que pasarle el dato. Al abrir PAN-NOT-01 el contador vuelve a 0 (US-NOT-07,
 * segundo criterio).
 */
export function BotonDeNotificaciones() {
  const { data: cantidad = 0 } = useNoLeidas();

  const etiqueta =
    cantidad > 0
      ? `${TEXTOS_NAVEGACION.notificaciones}, ${String(cantidad)} sin leer`
      : TEXTOS_NAVEGACION.notificaciones;

  return (
    <Pressable
      onPress={() => {
        router.push('/notificaciones');
      }}
      className="h-11 w-11 items-center justify-center"
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
    >
      <IconoCampana size={22} className="text-text-primary" />
      {cantidad > 0 ? (
        <View className="absolute right-1.5 top-1.5 h-4 min-w-4 items-center justify-center rounded-full bg-error px-1">
          <Text className="text-caption font-bold text-surface">
            {cantidad > 9 ? '9+' : String(cantidad)}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
