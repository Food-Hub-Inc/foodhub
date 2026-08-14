import { SafeAreaView as SafeAreaViewNativa } from 'react-native-safe-area-context';
import { withUniwind } from 'uniwind';

/**
 * SafeAreaView con soporte de `className`.
 *
 * POR QUÉ EXISTE ESTE ARCHIVO
 * ---------------------------------------------------------------------------
 * Uniwind habilita `className` reemplazando en tiempo de bundling los
 * componentes que exporta `react-native` por versiones propias. Esa lista
 * cubre solo el core: View, Text, Pressable, ScrollView, etc.
 *
 * `react-native-safe-area-context` es un paquete de terceros y uniwind no lo
 * conoce. Su `SafeAreaView` acepta la prop `className` sin quejarse —React la
 * ignora por ser desconocida— y la DESCARTA en silencio: no hay error de
 * compilación, ni advertencia en Metro, ni nada en los logs. La pantalla
 * simplemente se queda sin estilos.
 *
 * El sintoma es dificil de leer: sin `flex-1` el contenedor raiz colapsa a la
 * altura de su contenido, los hijos con `flex-1` quedan en cero, y Android
 * recorta el desborde. Se ve una pantalla en blanco con algun pedazo suelto
 * arriba, como si el JavaScript hubiera fallado, cuando en realidad bundleo
 * perfecto.
 *
 * `withUniwind` conecta la prop `className` con la prop `style` del componente
 * envuelto, así que a partir de acá SafeAreaView se usa igual que un View.
 *
 * La alternativa es poner `style={{ flex: 1 }}` inline en cada pantalla —que es
 * lo que hace app/_layout.tsx con GestureHandlerRootView, otro componente de
 * terceros—, pero eso obliga a recordarlo 30 veces y contradice la regla de
 * mantener los estilos en los tokens.
 */
export const SafeAreaView = withUniwind(SafeAreaViewNativa);
