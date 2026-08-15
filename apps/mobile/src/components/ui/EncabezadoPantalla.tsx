import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { TEXTOS_NAVEGACION } from '../../lib/textos';
import { IconoChevronIzquierda } from '../iconos';

/**
 * Encabezado con flecha de volver y título (PAN-AUT-01 a PAN-AUT-04.1,
 * PAN-GURP-01).
 *
 * Se dibuja acá y no con el header nativo del Stack porque el header de
 * react-navigation se estiliza con objetos de estilo sueltos, y eso obligaría a
 * escribir colores y tipografías fuera de los tokens.
 *
 * El botón de volver comprueba que haya a dónde volver: si la pantalla se abrió
 * por deep link —el caso de PAN-AUT-04.1— la pila está vacía y `back()` no hace
 * nada, dejando al usuario encerrado.
 */
export function EncabezadoPantalla({
  titulo,
  destinoAlternativo,
  accion,
}: {
  titulo: string;
  /** A dónde ir cuando no hay pantalla anterior en la pila. */
  destinoAlternativo?: Href;
  /** Contenido alineado a la derecha: el engranaje de PAN-GURP-01. */
  accion?: ReactNode;
}) {
  const volver = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    if (destinoAlternativo !== undefined) {
      router.replace(destinoAlternativo);
    }
  };

  const puedeVolver = router.canGoBack() || destinoAlternativo !== undefined;

  return (
    <View className="h-14 flex-row items-center border-b border-border bg-surface px-2">
      {puedeVolver ? (
        <Pressable
          onPress={volver}
          className="h-11 w-11 items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel={TEXTOS_NAVEGACION.volver}
        >
          <IconoChevronIzquierda size={22} className="text-text-primary" />
        </Pressable>
      ) : (
        <View className="w-2" />
      )}

      <Text
        className="flex-1 text-h2 font-bold text-text-primary"
        numberOfLines={1}
        accessibilityRole="header"
      >
        {titulo}
      </Text>

      {accion}
    </View>
  );
}
