import type { ReactNode } from 'react';
import { RouterProvider } from '@heroui/react';
import { useHref, useNavigate } from 'react-router-dom';

/**
 * Puente entre la navegación de React Aria (sobre la que está construido
 * HeroUI v3) y la de react-router.
 *
 * Sin esto, un `<Link href="/usuarios">` de HeroUI provoca una navegación
 * completa del navegador: se recarga el bundle entero y se pierde el estado
 * de la caché de React Query.
 *
 * Vive en su propio archivo, y no dentro de main.tsx, porque el Fast Refresh
 * de Vite solo conserva el estado si un módulo exporta únicamente componentes.
 */
export function ProveedorDeRuteo({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  return (
    <RouterProvider navigate={navigate} useHref={useHref}>
      {children}
    </RouterProvider>
  );
}
