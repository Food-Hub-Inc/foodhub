import { ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import type { EstadoPublicacion, PublicacionDetalle } from '@foodhub/shared';
import {
  IconoBolsa,
  IconoCocinero,
  IconoEstrella,
} from '../../components/iconos';
import { Boton } from '../../components/ui/Boton';
import { EncabezadoPantalla } from '../../components/ui/EncabezadoPantalla';
import { Esqueleto } from '../../components/ui/Esqueleto';
import { EstadoDeError } from '../../components/ui/EstadoDeError';
import { SafeAreaView } from '../../components/SafeAreaView';
import { mensajeDeError } from '../../lib/api';
import { usePublicacionPropia } from '../../hooks/usePublicaciones';
import { formatearFecha, formatearPrecio } from '../../lib/formato';
import { TEXTOS_PUBLICACIONES } from '../../lib/textos';

const ETIQUETA_ESTADO: Record<EstadoPublicacion, string> = {
  DISPONIBLE: TEXTOS_PUBLICACIONES.estadoDisponible,
  ULTIMAS_UNIDADES: TEXTOS_PUBLICACIONES.estadoUltimasUnidades,
  NO_DISPONIBLE: TEXTOS_PUBLICACIONES.estadoNoDisponible,
};

const COLOR_ESTADO: Record<EstadoPublicacion, string> = {
  DISPONIBLE: 'text-success',
  ULTIMAS_UNIDADES: 'text-warning',
  NO_DISPONIBLE: 'text-text-disabled',
};

/**
 * PAN-PUB-01 · Detalle de una publicación — US-PUB-05.
 *
 * Los botones "Editar" y "Eliminar" se muestran acá porque el criterio de
 * aceptación de US-PUB-05 los exige en esta pantalla ("desde donde puedo ver
 * toda la información del plato y los botones 'Editar' y 'Eliminar'"), pero
 * NO están conectados todavía: US-PUB-02 conecta "Editar" a la navegación de
 * edición y US-PUB-03 conecta "Eliminar" al diálogo de baja. Cablearlos acá
 * sería adelantarse al trabajo de esas dos historias.
 */
export function DetallePublicacion() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const publicacion = usePublicacionPropia(id);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <EncabezadoPantalla titulo={publicacion.data?.nombre ?? ''} />

      {publicacion.isPending ? <EsqueletoDetalle /> : null}

      {publicacion.isError ? (
        <EstadoDeError
          mensaje={mensajeDeError(publicacion.error)}
          onReintentar={() => {
            void publicacion.refetch();
          }}
        />
      ) : null}

      {publicacion.data ? <Contenido publicacion={publicacion.data} /> : null}
    </SafeAreaView>
  );
}

function EsqueletoDetalle() {
  return (
    <View className="px-4 pt-4">
      <Esqueleto className="h-56 rounded-md" />
      <Esqueleto className="mt-4 h-8 w-2/3 rounded-sm" />
      <Esqueleto className="mt-2 h-24 rounded-sm" />
    </View>
  );
}

function Contenido({ publicacion }: { publicacion: PublicacionDetalle }) {
  return (
    <ScrollView contentContainerClassName="px-4 pb-10 pt-4">
      <Encabezado publicacion={publicacion} />
      <Metricas publicacion={publicacion} />

      <Text className="mt-5 text-label font-semibold text-text-primary">
        {TEXTOS_PUBLICACIONES.descripcion}
      </Text>
      <Text className="mt-1 text-body text-text-secondary">
        {publicacion.descripcion}
      </Text>

      {publicacion.tiempoEstimadoPreparacion !== null ? (
        <TiempoEstimado minutos={publicacion.tiempoEstimadoPreparacion} />
      ) : null}

      <Fechas publicacion={publicacion} />
      <Acciones />
    </ScrollView>
  );
}

function Encabezado({ publicacion }: { publicacion: PublicacionDetalle }) {
  const imagen =
    publicacion.imagenUrl ?? publicacion.categoria.imagenPredeterminadaUrl;

  return (
    <>
      <View className="h-56 items-center justify-center overflow-hidden rounded-md bg-surface">
        {imagen ? (
          <Image
            contentFit="cover"
            source={{ uri: imagen }}
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          <IconoCocinero className="text-text-disabled" size={48} />
        )}
      </View>

      <Text className="mt-4 text-h1 font-extrabold text-text-primary">
        {publicacion.nombre}
      </Text>
      <Text className="mt-1 text-body text-text-secondary">
        {publicacion.categoria.nombre}
      </Text>

      <View className="mt-3 flex-row items-center justify-between">
        <Text className="text-h1 font-extrabold text-text-primary">
          {formatearPrecio(publicacion.precio)}
        </Text>
        <Text
          className={`text-label font-semibold ${COLOR_ESTADO[publicacion.estadoPublicacion]}`}
        >
          {ETIQUETA_ESTADO[publicacion.estadoPublicacion]}
        </Text>
      </View>
    </>
  );
}

function Metricas({ publicacion }: { publicacion: PublicacionDetalle }) {
  return (
    <View className="mt-4 flex-row items-center gap-4">
      <View className="flex-row items-center gap-1.5">
        <IconoBolsa size={16} className="text-text-disabled" />
        <Text className="text-body text-text-secondary">
          {TEXTOS_PUBLICACIONES.pedidosRecibidos(publicacion.cantidadPedidos)}
        </Text>
      </View>

      {/* Decisión 1 del plan del módulo: siempre null hasta que se corrija el
          modelo de datos (ver el mismo comentario en `TarjetaDePublicacion`). */}
      {publicacion.valoracionPromedio !== null ? (
        <View className="flex-row items-center gap-1.5">
          <IconoEstrella size={16} className="text-warning" />
          <Text className="text-body text-text-secondary">
            {publicacion.valoracionPromedio.toFixed(1)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function TiempoEstimado({ minutos }: { minutos: number }) {
  return (
    <>
      <Text className="mt-4 text-label font-semibold text-text-primary">
        {TEXTOS_PUBLICACIONES.tiempoEstimado}
      </Text>
      <Text className="mt-1 text-body text-text-secondary">
        {TEXTOS_PUBLICACIONES.tiempoEstimadoMinutos(minutos)}
      </Text>
    </>
  );
}

function Fechas({ publicacion }: { publicacion: PublicacionDetalle }) {
  return (
    <>
      <Text className="mt-5 text-caption text-text-disabled">
        {TEXTOS_PUBLICACIONES.publicadoEl(
          formatearFecha(publicacion.fechaCreacion),
        )}
      </Text>
      {publicacion.fechaUltimaEdicion ? (
        <Text className="mt-0.5 text-caption text-text-disabled">
          {TEXTOS_PUBLICACIONES.editadoEl(
            formatearFecha(publicacion.fechaUltimaEdicion),
          )}
        </Text>
      ) : null}
    </>
  );
}

/**
 * Sin conectar todavía: ver el comentario de `DetallePublicacion`. US-PUB-02
 * conecta "Editar" y US-PUB-03 conecta "Eliminar".
 */
function Acciones() {
  return (
    <View className="mt-6 flex-row gap-3">
      <Boton className="flex-1" onPress={() => undefined} variante="secundario">
        {TEXTOS_PUBLICACIONES.editar}
      </Boton>
      <Boton
        className="flex-1"
        onPress={() => undefined}
        variante="destructivo"
      >
        {TEXTOS_PUBLICACIONES.eliminar}
      </Boton>
    </View>
  );
}
