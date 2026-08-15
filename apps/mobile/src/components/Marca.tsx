import { View, Text } from 'react-native';
import { Path, Svg } from 'react-native-svg';
import { useResolveClassNames } from 'uniwind';

/**
 * Isotipo y logotipo de FoodHub.
 *
 * ADVERTENCIA SOBRE EL ORIGEN DE ESTE DIBUJO
 * ---------------------------------------------------------------------------
 * El repositorio no tiene el archivo vectorial de la marca: `assets/` solo
 * trae marcadores de posición (un círculo plano). El pin de acá es una
 * reconstrucción del que muestra la maquetación —gota con una casita y
 * cubiertos adentro— redibujada con los tokens de la guía visual, no el
 * original. Cuando el archivo real entre al repositorio hay que reemplazarlo:
 * es lo único de este módulo que no sale de una fuente aprobada.
 */

/** Gota de FoodHub. El color sale de un token, nunca de un literal. */
export function PinFoodHub({
  size = 96,
  className = 'text-primary',
}: {
  size?: number;
  className?: string;
}) {
  const estiloMarca = useResolveClassNames(className);
  const estiloInterior = useResolveClassNames('text-surface');
  const marca =
    typeof estiloMarca.color === 'string' ? estiloMarca.color : undefined;
  const interior =
    typeof estiloInterior.color === 'string' ? estiloInterior.color : undefined;

  return (
    <Svg
      width={size}
      height={size * 1.22}
      viewBox="0 0 48 58"
      fill="none"
      accessibilityLabel="FoodHub"
    >
      <Path
        d="M24 1.5C11.85 1.5 2 11.35 2 23.5c0 15.4 18.6 30.8 21.05 32.75a1.5 1.5 0 0 0 1.9 0C27.4 54.3 46 38.9 46 23.5 46 11.35 36.15 1.5 24 1.5Z"
        fill={marca}
      />
      <Path
        d="M13.5 21.6 24 13.5l10.5 8.1v13.15a1.6 1.6 0 0 1-1.6 1.6H15.1a1.6 1.6 0 0 1-1.6-1.6V21.6Z"
        fill={interior}
      />
      <Path
        d="M20.4 20.4v4.2a1.7 1.7 0 0 0 3.4 0v-4.2M22.1 24.6v7.6"
        stroke={marca}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M27.6 20.4c-1.1 0-2 1.4-2 3.2s.9 3.2 2 3.2v8.4"
        stroke={marca}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Logotipo horizontal: gota chica + palabra.
 *
 * "Food" va en primario y "hub" en secundario, como en la guía. Se compone con
 * dos `Text` y no con una imagen para que escale con la tipografía del sistema
 * y siga siendo legible con el cuerpo aumentado.
 */
export function MarcaFoodHub({ size = 28 }: { size?: number }) {
  return (
    <View
      className="flex-row items-center gap-2"
      accessible
      accessibilityRole="image"
      accessibilityLabel="FoodHub"
    >
      <PinFoodHub size={size} />
      <Text className="text-h1 font-extrabold text-primary">
        Food<Text className="text-secondary">hub</Text>
      </Text>
    </View>
  );
}
