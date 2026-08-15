import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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

  useEffect(() => {
    // También se oculta el splash si las fuentes fallan: es preferible mostrar
    // la app con la tipografía del sistema antes que dejarla trabada.
    if (fuentesListas || errorFuentes) {
      void SplashScreen.hideAsync();
    }
  }, [fuentesListas, errorFuentes]);

  if (!fuentesListas && !errorFuentes) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HeroUINativeProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          {/* El gate va DENTRO del proveedor de consultas y por encima del
              Stack: necesita React Query para preguntar el perfil, y tiene que
              poder redirigir antes de que se dibuje ninguna pantalla. */}
          <GateDeSesion>
            <Stack screenOptions={{ headerShown: false }} />
          </GateDeSesion>
        </QueryClientProvider>
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}
