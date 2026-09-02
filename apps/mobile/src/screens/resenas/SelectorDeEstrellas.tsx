import { Pressable, Text, View } from 'react-native';
import { ETIQUETAS_CALIFICACION } from '@foodhub/shared';
import { IconoEstrella, IconoEstrellaRellena } from '../../components/iconos';

/**
 * Selector de calificación de 1 a 5 estrellas — US-RES-01 y US-RES-02.
 *
 * "Permita seleccionar un valor entre 1 y 5, rellenando progresivamente las
 * estrellas y mostrando al lado la etiqueta correspondiente."
 *
 * PROGRESIVO significa que al elegir 4 quedan rellenas las CUATRO primeras, no
 * solo la cuarta: es una escala, no una opción entre cinco. De ahí que la
 * condición sea `valor >= n` y no `valor === n`.
 *
 * El mismo componente sirve a las dos historias porque la escala es idéntica;
 * lo único que cambia entre PAN-RES-01 y PAN-RES-02 es qué se está calificando.
 */

const ESTRELLAS = [1, 2, 3, 4, 5] as const;

export function SelectorDeEstrellas({
  valor,
  onCambiar,
  deshabilitado = false,
}: {
  valor: number | null;
  onCambiar: (valor: number) => void;
  deshabilitado?: boolean;
}) {
  return (
    <View className="items-center">
      <View className="flex-row">
        {ESTRELLAS.map((estrella) => {
          const rellena = valor !== null && valor >= estrella;
          const Estrella = rellena ? IconoEstrellaRellena : IconoEstrella;

          return (
            <Pressable
              accessibilityLabel={`${String(estrella)} ${estrella === 1 ? 'estrella' : 'estrellas'}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: valor === estrella }}
              className="p-1"
              disabled={deshabilitado}
              key={estrella}
              onPress={() => {
                onCambiar(estrella);
              }}
            >
              <Estrella
                className={rellena ? 'text-warning' : 'text-text-disabled'}
                size={40}
              />
            </Pressable>
          );
        })}
      </View>

      {/*
        La etiqueta ocupa su lugar desde el principio, con una cadena vacía
        mientras no haya selección: si apareciera recién al elegir, el
        formulario entero saltaría hacia abajo en el primer toque.
      */}
      <Text className="mt-2 h-6 text-body font-semibold text-text-primary">
        {valor === null ? '' : ETIQUETAS_CALIFICACION[valor]}
      </Text>
    </View>
  );
}
