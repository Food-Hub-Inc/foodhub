import { Pressable, Text, View } from 'react-native';
import type { PublicacionFeed } from '@foodhub/shared';
import { formatearPrecio } from '../../lib/formato';
import { TEXTOS_EXPLORACION } from '../../lib/textos';
import {
  AvatarDeCocinero,
  BadgeDeDisponibilidad,
  MiniaturaDePlato,
} from './Piezas';

/**
 * Tarjeta del feed — US-EXP-01.
 *
 * El segundo criterio enumera exactamente lo que muestra: "imagen del plato,
 * nombre, precio, nombre del cocinero, distancia aproximada y estado de
 * disponibilidad con diferenciación visual". Nada más: no lleva valoración ni
 * botón de favorito, que la historia ubica en el detalle y en el perfil.
 *
 * DOS DESTINOS EN LA MISMA TARJETA. El quinto criterio manda al detalle del
 * plato al tocar la tarjeta, y el sexto al perfil del cocinero al tocar "el
 * nombre o foto del cocinero". Se resuelve con un `Pressable` anidado: el sistema
 * de gestos de React Native entrega el toque al responder más interno, así que
 * tocar la fila del cocinero nunca dispara además la navegación al plato. Es el
 * mismo patrón que ya usa `TarjetaDePublicacion` con su ícono de eliminar.
 */
export function TarjetaDeFeed({
  publicacion,
  onAbrirPlato,
  onAbrirCocinero,
}: {
  publicacion: PublicacionFeed;
  onAbrirPlato: () => void;
  onAbrirCocinero: () => void;
}) {
  const { cocinero } = publicacion;

  return (
    <Pressable
      onPress={onAbrirPlato}
      className="mb-3 flex-row gap-3 rounded-md border border-border bg-surface p-3"
      accessibilityRole="button"
      accessibilityLabel={publicacion.nombre}
    >
      <MiniaturaDePlato
        imagenUrl={publicacion.imagenUrl}
        imagenDeCategoria={publicacion.categoria.imagenPredeterminadaUrl}
      />

      <View className="flex-1 justify-center">
        <Text className="text-h2 font-bold text-text-primary" numberOfLines={1}>
          {publicacion.nombre}
        </Text>
        <Text className="mt-1 text-body font-bold text-text-primary">
          {formatearPrecio(publicacion.precio)}
        </Text>

        <Pressable
          onPress={onAbrirCocinero}
          className="mt-2 min-h-11 flex-row items-center gap-2"
          accessibilityRole="button"
          accessibilityLabel={`${cocinero.nombre} ${cocinero.apellido}`}
        >
          <AvatarDeCocinero
            fotoPerfilUrl={cocinero.fotoPerfilUrl}
            tamano="h-7 w-7"
          />
          <Text
            className="flex-1 text-caption text-text-secondary"
            numberOfLines={1}
          >
            {`${cocinero.nombre} ${cocinero.apellido}`}
          </Text>
        </Pressable>

        <View className="mt-1.5 flex-row items-center justify-between">
          <BadgeDeDisponibilidad estado={publicacion.estadoPublicacion} />

          {/* La distancia se OMITE cuando no hay ubicación, en lugar de
              mostrarse como 0 km: el criterio pide "distancia aproximada", y un
              cero afirmaría que el plato está a la vuelta de la esquina. */}
          {publicacion.distanciaKm !== null ? (
            <Text className="text-caption text-text-disabled">
              {TEXTOS_EXPLORACION.distancia(publicacion.distanciaKm)}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
