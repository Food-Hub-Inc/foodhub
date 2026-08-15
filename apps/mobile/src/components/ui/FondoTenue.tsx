import { View } from 'react-native';

/**
 * Capa de color al 10 % detrás de un contenido.
 *
 * POR QUÉ NO ES UN COLOR MÁS
 * ---------------------------------------------------------------------------
 * La maquetación usa varios fondos tenues —el círculo del sobre en PAN-AUT-04,
 * el del ícono de salir en PAN-AUT-05, el banner naranja de PAN-AUT-02, la zona
 * punteada de "Agregar foto"—. Ninguno de esos tintes está en la paleta de la
 * guía visual, y agregarlos como tokens nuevos sería inventar seis colores que
 * el documento de diseño no aprobó.
 *
 * En vez de eso se pinta el token que sí existe y se le baja la opacidad. El
 * resultado en pantalla es el de la maquetación y en el código no aparece
 * ningún color que no venga de la guía.
 */
export function FondoTenue({
  className = 'bg-primary',
  opacidad = 'opacity-10',
}: {
  /** Clase de fondo con un color de la paleta. */
  className?: string;
  /** Utilidad de opacidad de Tailwind. */
  opacidad?: string;
}) {
  return (
    <View
      className={`absolute inset-0 ${className} ${opacidad}`}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
