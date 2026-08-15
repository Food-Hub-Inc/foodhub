import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nProvider } from '@heroui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App.js';
import { ProveedorDeRuteo } from './providers/ProveedorDeRuteo.js';
import { ProveedorDeSesion } from './providers/ProveedorDeSesion.js';
import './styles/global.css';

/**
 * Punto de entrada del panel de administración.
 *
 * HeroUI v3 está construido sobre React Aria Components y, a diferencia de la
 * v2, no expone un `HeroUIProvider` único: se componen los providers que hagan
 * falta. Acá se usan dos:
 *
 *   I18nProvider    fija el locale en es-AR. Determina el formato de fechas y
 *                   números de los componentes de calendario y de campo
 *                   numérico. Sin esto toman el idioma del navegador y un
 *                   administrador con Windows en inglés vería fechas MM/DD.
 *   RouterProvider  conecta la navegación de React Aria con react-router, para
 *                   que un `<Link href>` de HeroUI navegue del lado del cliente
 *                   en vez de recargar la página entera.
 */

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Los datos del panel (usuarios, publicaciones, métricas) no cambian de
      // un segundo al otro: 60 s de frescura evitan refetchs innecesarios.
      staleTime: 60_000,
      // Un 401 o un 403 no se arreglan reintentando: solo se reintentan los
      // fallos de red.
      retry: (fallos, error) => {
        const status = (error as { status?: number }).status;
        if (status === 401 || status === 403) return false;
        return fallos < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});

const contenedor = document.getElementById('root');
if (!contenedor) {
  throw new Error('No se encontró el elemento #root en index.html');
}

createRoot(contenedor).render(
  <StrictMode>
    <I18nProvider locale="es-AR">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ProveedorDeRuteo>
            {/* Va dentro del router porque el guardia de ruta consume su
                estado, y por encima de <App /> para que el perfil se consulte
                una sola vez y no en cada cambio de pantalla. */}
            <ProveedorDeSesion>
              <App />
            </ProveedorDeSesion>
          </ProveedorDeRuteo>
        </BrowserRouter>
      </QueryClientProvider>
    </I18nProvider>
  </StrictMode>,
);
