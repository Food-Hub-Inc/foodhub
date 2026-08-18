import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  MENSAJES_EXPLORACION,
  type CocineroFavorito,
  type PublicacionFavorita,
} from '@foodhub/shared';
import { IconoCorazon } from '../../components/iconos';
import { SafeAreaView } from '../../components/SafeAreaView';
import { EncabezadoPantalla } from '../../components/ui/EncabezadoPantalla';
import { Esqueleto } from '../../components/ui/Esqueleto';
import { EstadoDeError } from '../../components/ui/EstadoDeError';
import { EstadoVacio } from '../../components/ui/EstadoVacio';
import { useFavoritos } from '../../hooks/useFavoritos';
import { mensajeDeError } from '../../lib/api';
import { formatearPrecio } from '../../lib/formato';
import { BotonFlotanteDelCarrito } from './BotonFlotanteDelCarrito';
import { AvatarDeCocinero, MiniaturaDePlato, Valoracion } from './Piezas';

/**
 * "Mis favoritos" — US-EXP-06, tercer y cuarto criterio.
 *
 * "Muestre dos pestañas: 'Cocineros' y 'Publicaciones', con el listado
 * correspondiente en cada una. Cada elemento muestra imagen, nombre y su
 * valoración promedio."
 *
 * SIN CÓDIGO PAN. La maquetación de la Etapa 5 no dibuja esta pantalla y el
 * inventario no le asigna código, aunque la historia la pide explícitamente. Se
 * entra por el corazón del encabezado del feed (decisión del equipo, 2026-08-18)
 * y la estructura sigue la de las demás pantallas de listado del sistema.
 *
 * Las dos pestañas llegan en UNA sola consulta (`useFavoritos`): son dos listas
 * que no crecen como un feed, y partirlas obligaría a una segunda vuelta a la red
 * al cambiar de pestaña.
 *
 * Un cocinero dado de baja no aparece acá y no hay nada que hacer en la interfaz:
 * el último criterio dice que se elimina "sin mostrar error" y que "la pestaña se
 * actualiza en el próximo acceso", y el backend lo resuelve filtrando al leer.
 */

type Pestana = 'cocineros' | 'publicaciones';

export function MisFavoritos() {
  const [pestana, setPestana] = useState<Pestana>('cocineros');
  const consulta = useFavoritos();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <EncabezadoPantalla
        destinoAlternativo="/(cliente)/inicio"
        titulo={MENSAJES_EXPLORACION.misFavoritos}
      />

      <Pestanas activa={pestana} onCambiar={setPestana} />

      <Contenido consulta={consulta} pestana={pestana} />

      <BotonFlotanteDelCarrito />
    </SafeAreaView>
  );
}

function Pestanas({
  activa,
  onCambiar,
}: {
  activa: Pestana;
  onCambiar: (pestana: Pestana) => void;
}) {
  const opciones: { valor: Pestana; etiqueta: string }[] = [
    { valor: 'cocineros', etiqueta: MENSAJES_EXPLORACION.pestanaCocineros },
    {
      valor: 'publicaciones',
      etiqueta: MENSAJES_EXPLORACION.pestanaPublicaciones,
    },
  ];

  return (
    <View className="flex-row border-b border-border bg-surface">
      {opciones.map((opcion) => {
        const seleccionada = opcion.valor === activa;
        return (
          <Pressable
            accessibilityLabel={opcion.etiqueta}
            accessibilityRole="tab"
            accessibilityState={{ selected: seleccionada }}
            className={`min-h-14 flex-1 items-center justify-center border-b-2 ${
              seleccionada ? 'border-primary' : 'border-transparent'
            }`}
            key={opcion.valor}
            onPress={() => {
              onCambiar(opcion.valor);
            }}
          >
            <Text
              className={`text-body ${
                seleccionada ? 'font-bold text-primary' : 'text-text-secondary'
              }`}
            >
              {opcion.etiqueta}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Contenido({
  consulta,
  pestana,
}: {
  consulta: ReturnType<typeof useFavoritos>;
  pestana: Pestana;
}) {
  if (consulta.isError) {
    return (
      <EstadoDeError
        mensaje={mensajeDeError(consulta.error)}
        onReintentar={() => {
          void consulta.refetch();
        }}
      />
    );
  }

  if (consulta.isPending || !consulta.data) {
    return (
      <View className="px-4 pt-3">
        <Esqueleto className="mb-3 h-20 rounded-md" />
        <Esqueleto className="mb-3 h-20 rounded-md" />
        <Esqueleto className="mb-3 h-20 rounded-md" />
      </View>
    );
  }

  if (pestana === 'cocineros') {
    return (
      <FlatList
        contentContainerClassName="px-4 pt-3 pb-24"
        data={consulta.data.cocineros}
        keyExtractor={(cocinero) => cocinero.id}
        ListEmptyComponent={
          <Vacio titulo={MENSAJES_EXPLORACION.sinCocinerosFavoritos} />
        }
        renderItem={({ item }) => <FilaDeCocinero cocinero={item} />}
      />
    );
  }

  return (
    <FlatList
      contentContainerClassName="px-4 pt-3 pb-24"
      data={consulta.data.publicaciones}
      keyExtractor={(plato) => plato.id}
      ListEmptyComponent={
        <Vacio titulo={MENSAJES_EXPLORACION.sinPublicacionesFavoritas} />
      }
      renderItem={({ item }) => <FilaDePlato plato={item} />}
    />
  );
}

/**
 * Estado vacío de una pestaña (cuarto criterio).
 *
 * El criterio escribe el texto como "...ningún cocinero/plato como favorito.":
 * la barra es la notación de las dos pestañas, así que cada una usa su variante
 * (ver `MENSAJES_EXPLORACION`).
 */
function Vacio({ titulo }: { titulo: string }) {
  return (
    <View className="pt-16">
      <EstadoVacio
        icono={<IconoCorazon className="text-text-disabled" size={28} />}
        titulo={titulo}
      />
    </View>
  );
}

/** Sexto criterio: tocar un cocinero favorito abre su perfil público. */
function FilaDeCocinero({ cocinero }: { cocinero: CocineroFavorito }) {
  return (
    <Pressable
      accessibilityLabel={`${cocinero.nombre} ${cocinero.apellido}`}
      accessibilityRole="button"
      className="mb-3 flex-row items-center gap-3 rounded-md border border-border bg-surface p-3"
      onPress={() => {
        router.push({
          pathname: '/cocineros/[id]',
          params: { id: cocinero.id },
        });
      }}
    >
      <AvatarDeCocinero
        fotoPerfilUrl={cocinero.fotoPerfilUrl}
        tamano="h-14 w-14"
      />
      <View className="flex-1">
        <Text className="text-h3 font-bold text-text-primary" numberOfLines={1}>
          {`${cocinero.nombre} ${cocinero.apellido}`}
        </Text>
        <Valoracion className="mt-1" promedio={cocinero.valoracionPromedio} />
      </View>
    </Pressable>
  );
}

/** Sexto criterio: tocar una publicación favorita abre su detalle. */
function FilaDePlato({ plato }: { plato: PublicacionFavorita }) {
  return (
    <Pressable
      accessibilityLabel={plato.nombre}
      accessibilityRole="button"
      className="mb-3 flex-row items-center gap-3 rounded-md border border-border bg-surface p-3"
      onPress={() => {
        router.push({ pathname: '/platos/[id]', params: { id: plato.id } });
      }}
    >
      <MiniaturaDePlato
        className="h-14 w-14 rounded-sm"
        imagenDeCategoria={plato.categoria.imagenPredeterminadaUrl}
        imagenUrl={plato.imagenUrl}
      />
      <View className="flex-1">
        <Text className="text-h3 font-bold text-text-primary" numberOfLines={1}>
          {plato.nombre}
        </Text>
        <Text className="mt-0.5 text-body font-bold text-text-primary">
          {formatearPrecio(plato.precio)}
        </Text>
        <Valoracion className="mt-1" promedio={plato.valoracionPromedio} />
      </View>
    </Pressable>
  );
}
