import type { ComponentType } from 'react';
import { Platform } from 'react-native';
import { useResolveClassNames } from 'uniwind';

/**
 * Configuración común de las dos barras de tabs.
 *
 * El cliente y el cocinero tienen destinos distintos pero la MISMA barra: si
 * cada layout definiera sus colores y medidas por su cuenta, alcanzaría con
 * tocar uno para que las dos mitades de la app dejaran de parecerse.
 *
 * NOTA SOBRE LOS COLORES: `Tabs` de expo-router recibe colores como valores y
 * no como clases de Tailwind, así que los tokens hay que resolverlos a su valor
 * real. `useResolveClassNames` es el puente que da uniwind para eso; escribir
 * `#EC6829` acá sería justamente el literal que la guía visual prohíbe.
 */

/** Los íconos de la guía visual reciben tamaño y clase de color. */
export type IconoDeTab = ComponentType<{ size?: number; className?: string }>;

/**
 * Construye el `tabBarIcon` de un destino.
 *
 * El ícono recibe el color como CLASE y no como el valor que entrega
 * `tabBarIcon`: el sistema de iconografía resuelve el token por su cuenta y
 * pasarle un color suelto sería meter por la ventana el literal que la guía
 * visual prohíbe. `tabBarActiveTintColor` sigue tiñendo la etiqueta de texto,
 * que sí recibe valores.
 */
export function iconoDeTab(Icono: IconoDeTab) {
  return function IconoDelDestino({ focused }: { focused: boolean }) {
    return (
      <Icono
        className={focused ? 'text-primary' : 'text-text-secondary'}
        size={24}
      />
    );
  };
}

export function useOpcionesDeTabs() {
  const activo = useResolveClassNames('text-primary');
  const inactivo = useResolveClassNames('text-text-secondary');
  const superficie = useResolveClassNames('bg-surface');
  const borde = useResolveClassNames('border-border');

  return {
    headerShown: false,
    tabBarActiveTintColor: comoColor(activo.color),
    tabBarInactiveTintColor: comoColor(inactivo.color),
    tabBarStyle: {
      backgroundColor: comoColor(superficie.backgroundColor),
      borderTopColor: comoColor(borde.borderColor),
      borderTopWidth: 1,
      // 60 px de contenido más el respiro de la barra de gestos. Por debajo de
      // esto los destinos quedan con menos de los 44 px de área táctil mínima.
      height: Platform.OS === 'ios' ? 84 : 64,
      paddingTop: 6,
      paddingBottom: Platform.OS === 'ios' ? 26 : 8,
    },
    tabBarLabelStyle: {
      fontFamily: 'PlusJakartaSans_600SemiBold',
      fontSize: 11,
    },
  } as const;
}

/** `useResolveClassNames` devuelve `unknown`; solo sirve si resolvió a color. */
function comoColor(valor: unknown): string | undefined {
  return typeof valor === 'string' ? valor : undefined;
}
