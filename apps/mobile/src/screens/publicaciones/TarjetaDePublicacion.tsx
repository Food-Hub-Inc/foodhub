import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { EstadoPublicacion, PublicacionListado } from '@foodhub/shared';
import {
  IconoBolsa,
  IconoCocinero,
  IconoEstrella,
} from '../../components/iconos';
import { formatearFecha, formatearPrecio } from '../../lib/formato';
import { TEXTOS_PUBLICACIONES } from '../../lib/textos';

/**
 * Representación cromática de la disponibilidad (guía visual, badges de
 * `EstadoPublicacion`): éxito para disponible, advertencia para últimas
 * unidades y el gris de texto deshabilitado —nunca el rojo de error, reservado
 * a acciones destructivas— para no disponible.
 *
 * El color nunca es el único canal: cada estado lleva además su etiqueta en
 * texto, no solo el punto de color.
 */
const ESTILO_ESTADO: Record<
  EstadoPublicacion,
  { punto: string; texto: string; etiqueta: string }
> = {
  DISPONIBLE: {
    punto: 'bg-success',
    texto: 'text-success',
    etiqueta: TEXTOS_PUBLICACIONES.estadoDisponible,
  },
  ULTIMAS_UNIDADES: {
    punto: 'bg-warning',
    texto: 'text-warning',
    etiqueta: TEXTOS_PUBLICACIONES.estadoUltimasUnidades,
  },
  NO_DISPONIBLE: {
    punto: 'bg-text-disabled',
    texto: 'text-text-disabled',
    etiqueta: TEXTOS_PUBLICACIONES.estadoNoDisponible,
  },
};

/**
 * Tarjeta del listado "Mis publicaciones" (US-PUB-05): imagen, nombre,
 * categoría, precio, disponibilidad, pedidos recibidos, valoración y fecha de
 * creación — las ocho columnas que exige el criterio de aceptación.
 *
 * El indicador de disponibilidad es un BADGE ESTÁTICO en esta historia:
 * US-PUB-04 lo reemplaza por un selector interactivo
 * (`SelectorDeDisponibilidad`) sobre esta misma tarjeta. Tampoco lleva acción
 * de eliminar todavía (la agrega US-PUB-03).
 */
export function TarjetaDePublicacion({
  publicacion,
  onPress,
}: {
  publicacion: PublicacionListado;
  onPress: () => void;
}) {
  const estado = ESTILO_ESTADO[publicacion.estadoPublicacion];
  const imagen =
    publicacion.imagenUrl ?? publicacion.categoria.imagenPredeterminadaUrl;

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 flex-row gap-3 rounded-md border border-border bg-surface p-3"
      accessibilityRole="button"
      accessibilityLabel={publicacion.nombre}
    >
      <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-sm bg-background">
        {imagen ? (
          <Image
            contentFit="cover"
            source={{ uri: imagen }}
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          <IconoCocinero className="text-text-disabled" size={28} />
        )}
      </View>

      <View className="flex-1 justify-center">
        <Text className="text-h2 font-bold text-text-primary" numberOfLines={1}>
          {publicacion.nombre}
        </Text>
        <Text
          className="mt-0.5 text-caption text-text-secondary"
          numberOfLines={1}
        >
          {publicacion.categoria.nombre}
        </Text>
        <Text className="mt-1 text-body font-bold text-text-primary">
          {formatearPrecio(publicacion.precio)}
        </Text>

        <View className="mt-2 flex-row items-center justify-between">
          <View className="flex-row items-center gap-1.5">
            <View className={`h-2 w-2 rounded-full ${estado.punto}`} />
            <Text className={`text-caption font-semibold ${estado.texto}`}>
              {estado.etiqueta}
            </Text>
          </View>

          {/* Decisión 1 del plan del módulo: `valoracionPromedio` siempre
              llega null (el modelo de datos no permite atribuir una reseña a
              un plato puntual), así que hoy nunca se dibuja. Se deja resuelto
              para cuando se corrija el modelo. */}
          {publicacion.valoracionPromedio !== null ? (
            <View className="flex-row items-center gap-1">
              <IconoEstrella size={14} className="text-warning" />
              <Text className="text-caption text-text-secondary">
                {publicacion.valoracionPromedio.toFixed(1)}
              </Text>
            </View>
          ) : null}
        </View>

        <View className="mt-1.5 flex-row items-center justify-between">
          <View className="flex-row items-center gap-1.5">
            <IconoBolsa size={14} className="text-text-disabled" />
            <Text className="text-caption text-text-secondary">
              {TEXTOS_PUBLICACIONES.pedidosRecibidos(
                publicacion.cantidadPedidos,
              )}
            </Text>
          </View>
          <Text className="text-caption text-text-disabled">
            {formatearFecha(publicacion.fechaCreacion)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
