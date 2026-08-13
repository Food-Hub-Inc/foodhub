/**
 * Tipos de `className` para los componentes de React Native.
 *
 * ⚠️ Uniwind REGENERA este archivo la primera vez que se levanta Metro
 * (`pnpm --filter @foodhub/mobile run start`), leyendo las clases que
 * realmente existen en global.css. Lo que sigue es una declaración mínima para
 * que `tsc --noEmit` y el editor funcionen ANTES de esa primera ejecución —
 * por ejemplo en un clon recién hecho o en el job de CI, que no levanta Metro.
 *
 * No hace falta mantenerlo a mano: si Metro lo sobrescribe, el resultado es
 * más preciso que esto.
 */

import 'react-native';
import 'react-native-safe-area-context';

declare module 'react-native' {
  interface ViewProps {
    className?: string;
  }
  interface TextProps {
    className?: string;
  }
  interface ImageProps {
    className?: string;
  }
  interface ScrollViewProps {
    className?: string;
  }
  interface TextInputProps {
    className?: string;
  }
  interface PressableProps {
    className?: string;
  }
  interface TouchableOpacityProps {
    className?: string;
  }
  interface SwitchProps {
    className?: string;
  }
  interface FlatListProps<ItemT> {
    className?: string;
    contentContainerClassName?: string;
  }
}

declare module 'react-native-safe-area-context' {
  interface NativeSafeAreaViewProps {
    className?: string;
  }
}
