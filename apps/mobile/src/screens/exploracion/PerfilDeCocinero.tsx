import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { router } from 'expo-router';
import { MENSAJES_EXPLORACION, type CocineroPublico } from '@foodhub/shared';
import { IconoCocinero, IconoMensaje } from '../../components/iconos';
import { SafeAreaView } from '../../components/SafeAreaView';
import { Boton } from '../../components/ui/Boton';
import { EncabezadoPantalla } from '../../components/ui/EncabezadoPantalla';
import { Esqueleto } from '../../components/ui/Esqueleto';
import { EstadoDeError } from '../../components/ui/EstadoDeError';
import { EstadoVacio } from '../../components/ui/EstadoVacio';
import { useCocineroPublico } from '../../hooks/useExploracion';
import { useAlternarCocineroFavorito } from '../../hooks/useFavoritos';
import { useUbicacionActual } from '../../hooks/useUbicacionActual';
import { mensajeDeError } from '../../lib/api';
import { formatearPrecio } from '../../lib/formato';
import { TEXTOS_EXPLORACION, TEXTOS_RESENA } from '../../lib/textos';
import { Pestanas } from '../pedidos/Piezas';
import { ListaDeResenas } from '../resenas/ListaDeResenas';
import { BotonFlotanteDelCarrito } from './BotonFlotanteDelCarrito';
import {
  AvatarDeCocinero,
  BadgeDeDisponibilidad,
  BotonDeFavorito,
  MiniaturaDePlato,
  Valoracion,
} from './Piezas';

/**
 * PAN-EXP-04 · Perfil público del cocinero — US-EXP-04.
 *
 * El primer criterio enumera lo que muestra: "foto de perfil, nombre completo,
 * descripción, ubicación, valoración promedio con cantidad de reseñas y listado
 * de publicaciones activas del cocinero".
 *
 * "Ubicación" se dibuja como un mapa chico centrado en el punto del cocinero, más
 * la distancia al cliente si compartió la suya. Es lo único que el modelo permite
 * mostrar con honestidad: `usuario.ubicacion` es un punto PostGIS y no hay
 * dirección ni localidad -la tabla `ciudad` se eliminó en la migración 0001 por
 * estar fuera de alcance-.
 *
 * El listado de platos usa un `FlatList` con la ficha del cocinero como
 * `ListHeaderComponent` y no un `ScrollView` con la lista adentro: anidar dos
 * scrolls verticales rompe la virtualización y la guía pide listas virtualizadas.
 */
export function PerfilDeCocinero({ id }: { id: string | undefined }) {
  const ubicacion = useUbicacionActual();
  const consulta = useCocineroPublico(id, ubicacion.coordenadas);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <EncabezadoPantalla
        destinoAlternativo="/(cliente)/inicio"
        titulo={TEXTOS_EXPLORACION.tituloPerfil}
      />

      <Contenido consulta={consulta} />

      <BotonFlotanteDelCarrito />
    </SafeAreaView>
  );
}

/** Los cuatro estados: error, carga, y el perfil (que trae su propio vacío). */
type SolapaDelPerfil = 'PLATOS' | 'RESENAS';

/**
 * Las dos solapas de PAN-EXP-04: "Platos disponibles" y "Reseñas".
 *
 * La maquetación las dibuja lado a lado bajo la ficha del cocinero, y la de
 * reseñas es donde US-RES-03 pide mostrar el resumen y el listado.
 *
 * `Pestanas` se importa del módulo de Pedidos en vez de duplicarlo. Es el mismo
 * componente genérico y el cruce entre módulos ya existe en la dirección
 * contraria: Pedidos usa `Valoracion` y `MiniaturaDePlato` de acá.
 */
function Contenido({
  consulta,
}: {
  consulta: {
    data: CocineroPublico | undefined;
    isPending: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => unknown;
  };
}) {
  const [solapa, setSolapa] = useState<SolapaDelPerfil>('PLATOS');

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

  if (consulta.isPending || !consulta.data) return <EsqueletoDelPerfil />;

  const cocinero = consulta.data;

  const cabecera = (
    <>
      <FichaDelCocinero cocinero={cocinero} />
      <Pestanas
        activa={solapa}
        onCambiar={setSolapa}
        opciones={[
          { valor: 'PLATOS', etiqueta: TEXTOS_EXPLORACION.solapaPlatos },
          { valor: 'RESENAS', etiqueta: TEXTOS_RESENA.tituloSeccion },
        ]}
      />
    </>
  );

  if (solapa === 'RESENAS') {
    return <ListaDeResenas cocineroId={cocinero.id} encabezado={cabecera} />;
  }

  return (
    <FlatList
      contentContainerClassName="pb-24"
      data={cocinero.publicaciones}
      keyExtractor={(plato) => plato.id}
      ListEmptyComponent={
        <EstadoVacio
          icono={<IconoCocinero className="text-text-disabled" size={28} />}
          titulo={MENSAJES_EXPLORACION.cocineroSinPlatos}
        />
      }
      ListHeaderComponent={cabecera}
      renderItem={({ item }) => (
        <TarjetaDePlatoDelPerfil
          onPress={() => {
            // Cuarto criterio: tocar una publicación abre su detalle (US-EXP-05).
            router.push({ pathname: '/platos/[id]', params: { id: item.id } });
          }}
          plato={item}
        />
      )}
    />
  );
}

function EsqueletoDelPerfil() {
  return (
    <View className="px-4 pt-4">
      <Esqueleto className="mb-4 h-24 rounded-md" />
      <Esqueleto className="mb-4 h-32 rounded-md" />
      <Esqueleto className="mb-3 h-24 rounded-md" />
      <Esqueleto className="mb-3 h-24 rounded-md" />
    </View>
  );
}

/**
 * Identidad, valoración, distancia y el botón de favorito.
 *
 * Está separado de `FichaDelCocinero` porque es el único bloque de la ficha que
 * tiene comportamiento -la mutación del favorito- y así el resto queda como
 * presentación pura.
 */
function IdentidadDelCocinero({ cocinero }: { cocinero: CocineroPublico }) {
  const alternar = useAlternarCocineroFavorito();

  return (
    <View className="flex-row items-center gap-3 border-b border-border bg-surface px-4 py-4">
      <AvatarDeCocinero
        fotoPerfilUrl={cocinero.fotoPerfilUrl}
        tamano="h-16 w-16"
      />

      <View className="flex-1">
        <Text className="text-h1 font-extrabold text-text-primary">
          {`${cocinero.nombre} ${cocinero.apellido}`}
        </Text>
        <Valoracion
          cantidadResenas={cocinero.cantidadResenas}
          className="mt-1"
          promedio={cocinero.valoracionPromedio}
        />
        {cocinero.distanciaKm !== null ? (
          <Text className="mt-0.5 text-caption text-text-secondary">
            {TEXTOS_EXPLORACION.distancia(cocinero.distanciaKm)}
          </Text>
        ) : null}
      </View>

      {/* Quinto criterio: el botón de favorito del perfil, con cambio de ícono
          inmediato. El optimismo lo resuelve el hook. */}
      <BotonDeFavorito
        esFavorito={cocinero.esFavorito}
        onPress={() => {
          alternar.mutate({ id: cocinero.id, esFavorito: cocinero.esFavorito });
        }}
      />
    </View>
  );
}

/**
 * "Ubicación" del primer criterio, como mapa de referencia.
 *
 * Sin gestos: es un dato, no un mapa navegable. Con el scroll y el zoom
 * habilitados, arrastrar el perfil hacia abajo movería el mapa en lugar de la
 * pantalla.
 */
function UbicacionDelCocinero({
  lat,
  lng,
}: {
  lat: number | null;
  lng: number | null;
}) {
  if (lat === null || lng === null) return null;

  return (
    <View className="border-b border-border bg-surface px-4 py-4">
      <View
        accessible
        accessibilityLabel={TEXTOS_EXPLORACION.etiquetaMapa}
        className="h-32 overflow-hidden rounded-sm border border-border"
      >
        <MapView
          initialRegion={{
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          scrollEnabled={false}
          style={{ flex: 1 }}
          toolbarEnabled={false}
          userInterfaceStyle="light"
          zoomEnabled={false}
        >
          <Marker coordinate={{ latitude: lat, longitude: lng }} />
        </MapView>
      </View>
    </View>
  );
}

/**
 * Ficha del cocinero: identidad, valoración, favorito, descripción, ubicación y
 * el acceso a la mensajería.
 */
function FichaDelCocinero({ cocinero }: { cocinero: CocineroPublico }) {
  return (
    <View>
      <IdentidadDelCocinero cocinero={cocinero} />

      {cocinero.descripcionPublica ? (
        <View className="border-b border-border bg-surface px-4 py-4">
          <Text className="mb-1.5 text-label font-semibold text-text-primary">
            {TEXTOS_EXPLORACION.sobreElCocinero}
          </Text>
          <Text className="text-body text-text-secondary">
            {cocinero.descripcionPublica}
          </Text>
        </View>
      ) : null}

      <UbicacionDelCocinero lat={cocinero.lat} lng={cocinero.lng} />

      {/* Sexto criterio: "Enviar mensaje" abre la mensajería directa. El módulo
          MSG todavía no está codificado, así que lleva a su pantalla anunciada
          (PAN-MSG-01), que es el patrón que el equipo ya usa para el shell
          navegable. Cuando exista US-MSG-01, cambia el destino y nada más. */}
      <View className="bg-surface px-4 pb-4">
        <Boton
          icono={<IconoMensaje size={18} className="text-primary" />}
          onPress={() => {
            router.push('/(cliente)/mensajes');
          }}
          variante="secundario"
        >
          {MENSAJES_EXPLORACION.enviarMensaje}
        </Boton>
      </View>

      <Text className="px-4 pb-2 pt-5 text-h2 font-bold text-text-primary">
        {TEXTOS_EXPLORACION.susPlatos}
      </Text>
    </View>
  );
}

/**
 * Tarjeta de un plato dentro del perfil. Más compacta que la del feed: no repite
 * el cocinero -es el de la ficha de arriba- ni la distancia.
 */
function TarjetaDePlatoDelPerfil({
  plato,
  onPress,
}: {
  plato: CocineroPublico['publicaciones'][number];
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={plato.nombre}
      accessibilityRole="button"
      className="mx-4 mb-3 flex-row gap-3 rounded-md border border-border bg-surface p-3"
      onPress={onPress}
    >
      <MiniaturaDePlato
        imagenDeCategoria={plato.categoria.imagenPredeterminadaUrl}
        imagenUrl={plato.imagenUrl}
      />
      <View className="flex-1 justify-center">
        <Text className="text-h2 font-bold text-text-primary" numberOfLines={1}>
          {plato.nombre}
        </Text>
        <Text className="mt-0.5 text-caption text-text-secondary">
          {plato.categoria.nombre}
        </Text>
        <Text className="mt-1 text-body font-bold text-text-primary">
          {formatearPrecio(plato.precio)}
        </Text>
        <View className="mt-1.5">
          <BadgeDeDisponibilidad estado={plato.estadoPublicacion} />
        </View>
      </View>
    </Pressable>
  );
}
