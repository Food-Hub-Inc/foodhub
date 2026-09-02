import { Pressable, Text, View } from 'react-native';

/**
 * Tags positivos del formulario de reseña — US-RES-01 y US-RES-02.
 *
 * Lista CERRADA y multi-selección: el usuario elige entre las opciones que fija
 * el requisito y no puede escribir las suyas. Por eso son chips y no un campo
 * de texto.
 *
 * NO ESTÁ EN LA MAQUETACIÓN. PAN-RES-01 no dibuja los tags, pero RF080 los
 * enumera como campo del formulario; la maquetación es de la Etapa 5 y quedó
 * atrás. Se resolvió con chips por consistencia con el resto de la app —los
 * filtros del feed ya usan ese patrón— y queda pendiente contrastar el detalle
 * visual cuando la maquetación se actualice.
 *
 * Genérico en `T` para servir a las dos historias: el cliente elige entre tres
 * tags sobre el plato y el cocinero entre cuatro sobre el cliente.
 */
export function SelectorDeTags<T extends string>({
  opciones,
  seleccionados,
  onCambiar,
  deshabilitado = false,
}: {
  opciones: readonly T[];
  seleccionados: readonly T[];
  onCambiar: (tags: T[]) => void;
  deshabilitado?: boolean;
}) {
  const alternar = (tag: T) => {
    onCambiar(
      seleccionados.includes(tag)
        ? seleccionados.filter((t) => t !== tag)
        : [...seleccionados, tag],
    );
  };

  return (
    <View className="flex-row flex-wrap gap-2">
      {opciones.map((tag) => {
        const elegido = seleccionados.includes(tag);

        return (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: elegido, disabled: deshabilitado }}
            className={`rounded-full border px-3 py-2 ${
              elegido
                ? 'border-primary bg-primary/10'
                : 'border-border bg-surface'
            } ${deshabilitado ? 'opacity-50' : ''}`}
            disabled={deshabilitado}
            key={tag}
            onPress={() => {
              alternar(tag);
            }}
          >
            <Text
              className={`text-label ${
                elegido
                  ? 'font-semibold text-primary'
                  : 'font-medium text-text-secondary'
              }`}
            >
              {tag}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
