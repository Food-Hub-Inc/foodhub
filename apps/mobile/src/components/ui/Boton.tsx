import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useDuracion } from '../../hooks/useMovimientoReducido';

/**
 * Botón del sistema. Cubre las variantes que declara la guía visual
 * (sección 03): primario, secundario con borde, ghost, destructivo y tamaño SM.
 *
 * El estado deshabilitado no es decorativo: US-AUT-01 y US-AUT-02 exigen que
 * "Registrarse" arranque apagado y solo se encienda con el formulario válido y
 * los términos aceptados. Prevenir el error es mejor que reportarlo.
 */

export type VarianteBoton = 'primario' | 'secundario' | 'ghost' | 'destructivo';

export interface PropsBoton {
  children: string;
  onPress: () => void;
  variante?: VarianteBoton;
  /** `sm` es la altura reducida de la guía; `md` es la de un botón a lo ancho. */
  tamano?: 'md' | 'sm';
  icono?: ReactNode;
  deshabilitado?: boolean;
  /** Reemplaza el texto mientras la operación está en curso. */
  cargando?: boolean;
  textoCargando?: string;
  className?: string;
  accessibilityLabel?: string;
}

const FONDO: Record<VarianteBoton, string> = {
  primario: 'bg-primary',
  secundario: 'bg-surface border border-primary',
  ghost: 'bg-transparent',
  destructivo: 'bg-error',
};

const TEXTO: Record<VarianteBoton, string> = {
  primario: 'text-surface',
  secundario: 'text-primary',
  ghost: 'text-text-primary',
  destructivo: 'text-surface',
};

/**
 * Traduce variante, tamaño y estado a las clases de la guía visual.
 *
 * Está afuera del componente porque es una decisión de estilo, no de
 * comportamiento: dejarla adentro mezcla dos responsabilidades en la misma
 * función y la lleva por encima del umbral de complejidad que fija ESLint.
 *
 * El fondo gris del estado deshabilitado sale del token de borde, que es el
 * mismo gris cálido que usa la guía en el botón apagado.
 */
function clasesDelBoton(
  variante: VarianteBoton,
  tamano: 'md' | 'sm',
  inactivo: boolean,
): { fondo: string; color: string; alto: string } {
  return {
    fondo: inactivo ? 'bg-border' : FONDO[variante],
    color: inactivo ? 'text-text-disabled' : TEXTO[variante],
    alto: tamano === 'sm' ? 'h-11 px-4' : 'h-14 px-5',
  };
}

export function Boton({
  children,
  onPress,
  variante = 'primario',
  tamano = 'md',
  icono,
  deshabilitado = false,
  cargando = false,
  textoCargando,
  className = '',
  accessibilityLabel,
}: PropsBoton) {
  const inactivo = deshabilitado || cargando;
  const duracion = useDuracion(120);
  const escala = useSharedValue(1);

  /**
   * El valor animado se lee y se escribe con `get()` y `set()` en lugar de
   * `.value`. Es la API que Reanimated agregó a partir de la 3.6 y la única que
   * el compilador de React acepta: una asignación a `.value` dentro de un
   * manejador de eventos le parece la mutación de un valor inmutable y la
   * marca como error.
   */
  const estiloPulso = useAnimatedStyle(() => ({
    transform: [{ scale: escala.get() }],
  }));

  const pulsar = (destino: number) => {
    escala.set(withTiming(destino, { duration: duracion }));
  };

  const { fondo, color, alto } = clasesDelBoton(variante, tamano, inactivo);

  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      onPressIn={() => {
        pulsar(0.97);
      }}
      onPressOut={() => {
        pulsar(1);
      }}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactivo, busy: cargando }}
      accessibilityLabel={accessibilityLabel ?? children}
    >
      <Animated.View
        style={estiloPulso}
        className={`flex-row items-center justify-center gap-2 rounded-md ${alto} ${fondo} ${className}`}
      >
        {icono !== undefined && !cargando ? <View>{icono}</View> : null}
        <Text className={`text-body font-bold ${color}`} numberOfLines={1}>
          {cargando ? (textoCargando ?? children) : children}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

/**
 * Enlace de texto. Es el tercer nivel de acción de la maquetación: "Iniciar
 * sesión" al pie de PAN-AUT-00, "Volver al inicio de sesión" en PAN-AUT-04.
 *
 * Va como componente propio y no como variante del botón porque su área táctil
 * se calcula distinto: el texto es corto y necesita padding para llegar a los
 * 44 px que exige la guía de accesibilidad.
 */
export function BotonDeTexto({
  children,
  onPress,
  className = 'text-primary',
  accessibilityLabel,
}: {
  children: string;
  onPress: () => void;
  className?: string;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel ?? children}
      className="min-h-11 justify-center py-2"
    >
      <Text className={`text-body font-bold ${className}`}>{children}</Text>
    </Pressable>
  );
}
