import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { HeroUINativeProvider } from 'heroui-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { GateDeSesion } from '../src/components/GateDeSesion';
import '../global.css';

/**
 * Layout raíz de la aplicación (expo-router).
 *
 * Monta los providers que necesita toda la app. El orden importa:
 * GestureHandlerRootView tiene que envolver a HeroUINativeProvider, porque los
 * componentes de HeroUI que usan gestos (bottom sheet, swipe) dependen de ese
 * contexto y fallan en silencio si no está por encima.
 *
 * BottomSheetModalProvider monta el portal donde aterriza cualquier
 * `HojaInferior` de la app (ver `src/components/ui/HojaInferior.tsx`), sin
 * importar qué tan anidada esté dentro de un ScrollView. Tiene que estar por
 * encima de `GateDeSesion` y del `Stack`: cualquier pantalla, en cualquier
 * ruta, puede abrir una hoja.
 *
 * Y TIENE QUE ESTAR POR DEBAJO de `HeroUINativeProvider` y
 * `QueryClientProvider`, no por encima. El portal donde @gorhom/bottom-sheet
 * monta el contenido de la hoja (`BottomSheetHostingContainer`) es HERMANO
 * de la porción del árbol que ve `children`, no descendiente: hereda el
 * contexto de lo que envuelve a `BottomSheetModalProvider` desde afuera, no
 * el de lo que está declarado adentro. Con el orden invertido, cualquier hoja
 * que use `useQuery` (como el selector de categorías de `HojaDeFiltros`)
 * revienta con "No QueryClient set" apenas se abre.
 */

// Mantiene el splash visible hasta que las fuentes estén listas: sin esto la
// primera pantalla aparece con la tipografía del sistema y salta al cargar
// Plus Jakarta Sans.
void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      // En móvil la conexión se corta seguido: reintentar al recuperar la red
      // evita que el usuario tenga que refrescar a mano.
      refetchOnReconnect: true,
    },
  },
});

export default function LayoutRaiz() {
  const [fuentesListas, errorFuentes] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  /**
   * El splash NO se oculta acá aunque las fuentes ya estén: lo oculta
   * `GateDeSesion`, y solo cuando sabe qué pantalla dibujar. Ocultarlo antes
   * deja a la vista el fondo vacío que hay debajo mientras el gate todavía
   * decide, que es la pantalla en blanco que se veía al abrir el enlace de
   * recuperación.
   *
   * También se sigue de largo si las fuentes fallan: es preferible mostrar la
   * app con la tipografía del sistema antes que dejarla trabada.
   */
  if (!fuentesListas && !errorFuentes) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Mide el teclado y publica su altura por contexto. Va lo más arriba
          posible: lo consumen `PantallaConTeclado` y el chat, que están en
          ramas distintas del árbol. */}
      <KeyboardProvider>
        <HeroUINativeProvider>
          <QueryClientProvider client={queryClient}>
            <BottomSheetModalProvider>
              <StatusBar style="dark" />
              {/* El gate va DENTRO del proveedor de consultas y por encima del
                Stack: necesita React Query para preguntar el perfil, y tiene que
                poder redirigir antes de que se dibuje ninguna pantalla. */}
              <GateDeSesion>
                <Stack screenOptions={{ headerShown: false }} />
              </GateDeSesion>
            </BottomSheetModalProvider>
          </QueryClientProvider>
        </HeroUINativeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
