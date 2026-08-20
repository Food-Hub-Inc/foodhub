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

export function useOpcionesDeTabs() {
  const activo = useResolveClassNames('text-primary');
  const inactivo = useResolveClassNames('text-text-secondary');
  const superficie = useResolveClassNames('bg-surface');
  const borde = useResolveClassNames('border-border');
  const colorActivo = comoColor(activo.color);
  const colorInactivo = comoColor(inactivo.color);
  const colorIconoActivo =
    Platform.OS === 'android'
      ? comoColor(superficie.backgroundColor)
      : colorActivo;

  return {
    backgroundColor: comoColor(superficie.backgroundColor),
    iconColor: {
      default: colorInactivo,
      selected: colorIconoActivo,
    },
    indicatorColor: colorActivo,
    labelStyle: {
      default: {
        color: colorInactivo,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 11,
      },
      selected: {
        color: colorActivo,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 11,
      },
    },
    tintColor: colorActivo,
    rippleColor: colorActivo,
    // NativeTabs no expone un borde superior multiplataforma. El color se
    // resuelve para conservar la misma superficie visual en Android e iOS.
    shadowColor: comoColor(borde.borderColor),
  };
}

/** `useResolveClassNames` devuelve `unknown`; solo sirve si resolvió a color. */
function comoColor(valor: unknown): string | undefined {
  return typeof valor === 'string' ? valor : undefined;
}
