import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { FondoTenue } from './FondoTenue';

/**
 * Estado vacío genérico de una pantalla con datos: ilustración (ícono),
 * título, subtítulo y una acción opcional.
 *
 * Análogo a `EstadoDeError.tsx`, pero para "no hay nada que mostrar" en vez de
 * "algo falló". US-PUB-05 lo usa con DOS textos distintos sobre el MISMO
 * componente —sin publicaciones propias y sin resultados de búsqueda/
 * filtros—: lo que cambia es el texto, no la estructura.
 */
export function EstadoVacio({
  icono,
  titulo,
  subtitulo,
  accion,
}: {
  icono: ReactNode;
  titulo: string;
  /** Ausente cuando la documentación fija un único mensaje sin bajada. */
  subtitulo?: string;
  accion?: ReactNode;
}) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <View className="mb-4 h-16 w-16 items-center justify-center overflow-hidden rounded-full">
        <FondoTenue />
        {icono}
      </View>

      <Text
        className="text-center text-h2 font-bold text-text-primary"
        accessibilityRole="header"
      >
        {titulo}
      </Text>
      {subtitulo !== undefined ? (
        <Text className="mt-1.5 text-center text-body text-text-secondary">
          {subtitulo}
        </Text>
      ) : null}

      {accion !== undefined ? <View className="mt-5">{accion}</View> : null}
    </View>
  );
}
