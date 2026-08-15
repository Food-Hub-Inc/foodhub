import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { TEXTOS_NAVEGACION } from '../../lib/textos';
import { IconoCampana } from '../iconos';

/**
 * Campana con contador, en el header (PAN-EXP-01).
 *
 * POR QUÉ NO ES UNA SOLAPA DE LA BARRA INFERIOR
 * ---------------------------------------------------------------------------
 * Así lo resuelve la maquetación del feed, y tiene sentido: la barra inferior
 * es para los lugares donde el usuario trabaja, y las notificaciones son un
 * aviso al que se entra y del que se vuelve. Ponerlas ahí gastaría una de las
 * cinco posiciones que ya están ocupadas.
 *
 * El contador viene por prop y no de una consulta propia: el módulo de
 * notificaciones (PAN-NOT-01) todavía no tiene endpoint en
 * `docs/API-TRANSVERSALES.md`, así que hoy siempre llega en cero y el globo no
 * se dibuja. Cuando exista, el dato entra por acá sin tocar el componente.
 */
export function BotonDeNotificaciones({ cantidad = 0 }: { cantidad?: number }) {
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
