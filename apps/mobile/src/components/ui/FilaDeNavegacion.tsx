import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { IconoChevronDerecha } from '../iconos';

/**
 * Fila de navegación con ícono, texto y chevron (PAN-GURP-01).
 *
 * `expandida` sirve a las filas que despliegan contenido en la misma pantalla
 * —"Cambiar contraseña"— y no navegan a otra: el chevron gira para anunciar
 * que el contenido está abierto, y `accessibilityRole` pasa de botón a
 * combinación expandible para que el lector lo cuente igual.
 */
export function FilaDeNavegacion({
  etiqueta,
  icono,
  onPress,
  expandible = false,
  expandida = false,
  destructiva = false,
}: {
  etiqueta: string;
  icono: ReactNode;
  onPress: () => void;
  expandible?: boolean;
  expandida?: boolean;
  destructiva?: boolean;
}) {
  const color = destructiva ? 'text-error' : 'text-text-primary';

  return (
    <Pressable
      onPress={onPress}
      className="min-h-14 flex-row items-center gap-3 border-b border-border px-4"
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={expandible ? { expanded: expandida } : undefined}
    >
      {icono}
      <Text className={`flex-1 text-body font-medium ${color}`}>
        {etiqueta}
      </Text>
      <View style={{ transform: [{ rotate: expandida ? '90deg' : '0deg' }] }}>
        <IconoChevronDerecha size={18} className="text-text-disabled" />
      </View>
    </Pressable>
  );
}
