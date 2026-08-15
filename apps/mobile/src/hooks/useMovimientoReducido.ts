import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * `true` si el usuario pidió menos movimiento en las opciones de accesibilidad
 * de Android.
 *
 * No es una preferencia estética: para alguien con sensibilidad vestibular una
 * transición que desliza o escala puede provocar mareo. Toda animación de la
 * app consulta este valor y, si está activo, aplica el cambio de estado sin
 * transición en lugar de acortarla.
 *
 * Se suscribe al cambio en caliente porque la opción se puede activar con la
 * app abierta y no debería hacer falta reiniciarla para que tenga efecto.
 */
export function useMovimientoReducido(): boolean {
  const [reducido, setReducido] = useState(false);

  useEffect(() => {
    let vigente = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((valor) => {
      if (vigente) setReducido(valor);
    });

    const suscripcion = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReducido,
    );

    return () => {
      vigente = false;
      suscripcion.remove();
    };
  }, []);

  return reducido;
}

/**
 * Duración de una animación respetando la preferencia del sistema.
 *
 * Devolver 0 y no simplemente "no animar" mantiene el mismo camino de código en
 * los dos casos: el valor final es idéntico, solo cambia el tiempo que tarda en
 * llegar. Así no hay dos versiones del componente que puedan divergir.
 */
export function useDuracion(milisegundos: number): number {
  return useMovimientoReducido() ? 0 : milisegundos;
}
