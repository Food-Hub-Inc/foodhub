import { useMemo, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { router } from 'expo-router';
import Supercluster, {
  type ClusterFeature,
  type ClusterProperties,
  type PointFeature,
} from 'supercluster';
import {
  MENSAJES_EXPLORACION,
  type CocineroMapa,
  type ZonaVisible,
} from '@foodhub/shared';
import { IconoUbicacion } from '../../components/iconos';
import { SafeAreaView } from '../../components/SafeAreaView';
import { Boton } from '../../components/ui/Boton';
import { Esqueleto } from '../../components/ui/Esqueleto';
import { EstadoVacio } from '../../components/ui/EstadoVacio';
import { useCocinerosDelMapa } from '../../hooks/useExploracion';
import { useUbicacionActual } from '../../hooks/useUbicacionActual';
import { TEXTOS_EXPLORACION, TEXTOS_UBICACION } from '../../lib/textos';
import { BotonFlotanteDelCarrito } from './BotonFlotanteDelCarrito';
import { AvatarDeCocinero, Valoracion } from './Piezas';

/**
 * PAN-EXP-02 · Mapa de cocineros — US-EXP-02.
 *
 * Es la ÚNICA pantalla del módulo que exige el permiso de ubicación: la
 * precondición de la historia lo dice ("El cliente otorgó permisos de ubicación
 * al dispositivo") y el cuarto criterio fija qué mostrar si no. El feed, en
 * cambio, funciona sin él.
 *
 * Consulta por ZONA VISIBLE y no por radio: el quinto criterio habla de "la zona
 * visible del mapa". Cada vez que el usuario suelta el mapa se vuelve a pedir con
 * los límites nuevos; `keepPreviousData` mantiene los marcadores anteriores en
 * pantalla mientras llega la respuesta.
 */

/** Zoom inicial: unas quince cuadras a la redonda, igual que `SelectorDeUbicacion`. */
const AMPLITUD_INICIAL = 0.02;

/**
 * Radio de agrupamiento en píxeles y zoom a partir del cual se dejan de agrupar.
 *
 * [PROPIO] El sexto criterio pide agrupar "los marcadores cercanos" al alejar el
 * zoom, con "un contador visible del total de cocineros agrupados", sin fijar el
 * radio. 60 px es el valor por defecto de supercluster y deja los marcadores sin
 * pisarse; a partir de zoom 16 -media cuadra en pantalla- ya no tiene sentido
 * agrupar porque los cocineros se ven separados.
 */
const RADIO_DE_AGRUPAMIENTO = 60;
const ZOOM_SIN_AGRUPAMIENTO = 16;

/** Lo que cada cocinero lleva adentro de su punto de supercluster. */
interface PuntoDeCocinero {
  cocinero: CocineroMapa;
}

type Agrupacion =
  ClusterFeature<ClusterProperties> | PointFeature<PuntoDeCocinero>;

/**
 * Latitud y longitud de una agrupación.
 *
 * Un punto GeoJSON siempre trae `[lng, lat]`, pero la librería tipa
 * `coordinates` como `number[]` y `noUncheckedIndexedAccess` obliga a contemplar
 * que falte alguno. Devuelve `null` en ese caso -que no puede darse con datos
 * que salieron de `ST_Y`/`ST_X`- en lugar de sustituir por 0, que pondría el
 * marcador en el golfo de Guinea.
 */
function coordenadasDe(
  agrupacion: Agrupacion,
): { lat: number; lng: number } | null {
  const [lng, lat] = agrupacion.geometry.coordinates;
  if (lng === undefined || lat === undefined) return null;
  return { lat, lng };
}

/**
 * Distingue un grupo de marcadores de un cocinero suelto.
 *
 * El guardia se declara sobre la FEATURE y no sobre sus `properties`: un
 * `'cluster' in agrupacion.properties` estrecha el tipo de `properties` pero no
 * el de la feature que lo contiene, así que el acceso siguiente vuelve a caer en
 * la unión.
 */
function esGrupo(
  agrupacion: Agrupacion,
): agrupacion is ClusterFeature<ClusterProperties> {
  return 'cluster' in agrupacion.properties;
}

/**
 * Traduce la región del mapa a los cuatro límites que espera la API.
 *
 * Los valores se recortan a los rangos válidos: con el mapa alejado al máximo,
 * `latitudeDelta` puede pasarse de los polos y `zonaVisibleSchema` rechazaría la
 * consulta por una latitud de 95 grados.
 */
function aZonaVisible(region: Region): ZonaVisible {
  const mitadLat = region.latitudeDelta / 2;
  const mitadLng = region.longitudeDelta / 2;

  return {
    latMin: Math.max(-90, region.latitude - mitadLat),
    latMax: Math.min(90, region.latitude + mitadLat),
    lngMin: Math.max(-180, region.longitude - mitadLng),
    lngMax: Math.min(180, region.longitude + mitadLng),
  };
}

/**
 * Nivel de zoom de teselas equivalente a la región.
 *
 * Supercluster razona en niveles de zoom (0 = mundo entero) y `react-native-maps`
 * en grados de apertura. La conversión es la estándar: el mundo son 360 grados y
 * cada nivel de zoom los divide en dos.
 */
function zoomDeLaRegion(region: Region): number {
  return Math.round(Math.log2(360 / region.longitudeDelta));
}

export function MapaDeCocineros() {
  const ubicacion = useUbicacionActual();
  const [region, setRegion] = useState<Region | null>(null);
  const [seleccionado, setSeleccionado] = useState<CocineroMapa | null>(null);

  const consulta = useCocinerosDelMapa(region ? aZonaVisible(region) : null);

  // El `?? []` va en su propio `useMemo`: sin esto crea un arreglo nuevo en cada
  // render y el índice de agrupamiento se reconstruiría siempre.
  const cocineros = useMemo(() => consulta.data ?? [], [consulta.data]);
  const grupos = useAgrupamiento(cocineros, region);

  if (ubicacion.estado === 'pidiendo') {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <Esqueleto className="flex-1" />
      </SafeAreaView>
    );
  }

  if (ubicacion.coordenadas === null) {
    return <SinPermiso onReintentar={ubicacion.reintentar} />;
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View
        accessible
        accessibilityLabel={TEXTOS_EXPLORACION.etiquetaMapa}
        className="flex-1"
      >
        <MapView
          initialRegion={{
            latitude: ubicacion.coordenadas.lat,
            longitude: ubicacion.coordenadas.lng,
            latitudeDelta: AMPLITUD_INICIAL,
            longitudeDelta: AMPLITUD_INICIAL,
          }}
          // Tocar el mapa fuera de un marcador cierra la tarjeta emergente.
          onPress={() => {
            setSeleccionado(null);
          }}
          onRegionChangeComplete={setRegion}
          showsUserLocation
          style={{ flex: 1 }}
          toolbarEnabled={false}
          userInterfaceStyle="light"
        >
          <Marcadores grupos={grupos} onSeleccionar={setSeleccionado} />
        </MapView>

        {/* El aviso de "sin cocineros" va SUPERPUESTO sobre el mapa, como pide el
            quinto criterio, y no lo reemplaza: el usuario tiene que poder seguir
            moviéndolo para buscar en otra zona. */}
        {consulta.isSuccess && cocineros.length === 0 ? (
          <View className="absolute left-4 right-4 top-4 rounded-md bg-surface p-3">
            <Text className="text-center text-body text-text-secondary">
              {MENSAJES_EXPLORACION.mapaSinCocineros}
            </Text>
          </View>
        ) : null}

        {seleccionado ? (
          <TarjetaDelCocinero
            cocinero={seleccionado}
            onVerPerfil={() => {
              router.push({
                pathname: '/cocineros/[id]',
                params: { id: seleccionado.id },
              });
            }}
          />
        ) : null}
      </View>

      <BotonFlotanteDelCarrito />
    </SafeAreaView>
  );
}

/**
 * Agrupa los cocineros visibles según el zoom (sexto criterio de US-EXP-02).
 *
 * El índice se reconstruye solo cuando cambia la lista de cocineros, no en cada
 * desplazamiento del mapa: `load` recorre todos los puntos y armarlo con cada
 * movimiento del dedo tiraría los FPS. El recorte por zona, en cambio, sí se
 * recalcula con la región: es una consulta sobre el índice ya armado.
 */
function useAgrupamiento(
  cocineros: readonly CocineroMapa[],
  region: Region | null,
): Agrupacion[] {
  const indice = useMemo(() => {
    const supercluster = new Supercluster<PuntoDeCocinero>({
      radius: RADIO_DE_AGRUPAMIENTO,
      maxZoom: ZOOM_SIN_AGRUPAMIENTO,
    });

    supercluster.load(
      cocineros.map((cocinero) => ({
        type: 'Feature' as const,
        properties: { cocinero },
        geometry: {
          // GeoJSON usa [lng, lat], al revés de como se nombra un par de
          // coordenadas. Mismo cuidado que `ST_MakePoint` en el backend.
          type: 'Point' as const,
          coordinates: [cocinero.lng, cocinero.lat],
        },
      })),
    );

    return supercluster;
  }, [cocineros]);

  return useMemo(() => {
    if (!region) return [];
    const zona = aZonaVisible(region);
    return indice.getClusters(
      [zona.lngMin, zona.latMin, zona.lngMax, zona.latMax],
      zoomDeLaRegion(region),
    );
  }, [indice, region]);
}

/** Los marcadores del mapa: grupos con contador y cocineros sueltos. */
function Marcadores({
  grupos,
  onSeleccionar,
}: {
  grupos: readonly Agrupacion[];
  onSeleccionar: (cocinero: CocineroMapa | null) => void;
}) {
  return (
    <>
      {grupos.map((agrupacion) => {
        const punto = coordenadasDe(agrupacion);
        if (!punto) return null;

        if (esGrupo(agrupacion)) {
          return (
            <GrupoDeMarcadores
              cantidad={agrupacion.properties.point_count}
              key={`grupo-${String(agrupacion.properties.cluster_id)}`}
              lat={punto.lat}
              lng={punto.lng}
              onPress={() => {
                onSeleccionar(null);
              }}
            />
          );
        }

        const { cocinero } = agrupacion.properties;
        return (
          <Marker
            coordinate={{ latitude: punto.lat, longitude: punto.lng }}
            key={cocinero.id}
            onPress={() => {
              onSeleccionar(cocinero);
            }}
            title={`${cocinero.nombre} ${cocinero.apellido}`}
          />
        );
      })}
    </>
  );
}

/**
 * Cuarto criterio de US-EXP-02: sin permiso de ubicación se muestra el literal
 * "Activá la ubicación para ver cocineros cerca tuyo" con acceso directo a la
 * configuración del dispositivo.
 *
 * Se ofrecen las DOS salidas: reintentar -que sirve si el usuario negó el permiso
 * en la sesión actual y Android todavía lo puede volver a pedir- y abrir los
 * ajustes, que es lo único que queda cuando eligió "No volver a preguntar".
 */
function SinPermiso({ onReintentar }: { onReintentar: () => void }) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <EstadoVacio
        accion={
          <View className="gap-2">
            <Boton
              onPress={() => {
                void Linking.openSettings();
              }}
            >
              {TEXTOS_EXPLORACION.abrirConfiguracion}
            </Boton>
            <Boton onPress={onReintentar} variante="secundario">
              {TEXTOS_UBICACION.reintentar}
            </Boton>
          </View>
        }
        icono={<IconoUbicacion className="text-text-disabled" size={28} />}
        titulo={MENSAJES_EXPLORACION.sinPermisoUbicacion}
      />
    </SafeAreaView>
  );
}

/**
 * Marcador que representa varios cocineros agrupados, con su contador
 * (sexto criterio de US-EXP-02).
 *
 * No es un `Marker` con imagen: se dibuja como hijo del marcador, así el círculo
 * y el número usan los tokens de la guía en lugar de un PNG por cada cifra.
 */
function GrupoDeMarcadores({
  cantidad,
  lat,
  lng,
  onPress,
}: {
  cantidad: number;
  lat: number;
  lng: number;
  onPress: () => void;
}) {
  return (
    <Marker
      accessibilityLabel={TEXTOS_EXPLORACION.cocinerosAgrupados(cantidad)}
      coordinate={{ latitude: lat, longitude: lng }}
      onPress={onPress}
    >
      <View className="h-11 w-11 items-center justify-center rounded-full border-2 border-surface bg-primary">
        <Text className="text-body font-bold text-surface">
          {String(cantidad)}
        </Text>
      </View>
    </Marker>
  );
}

/**
 * Tarjeta emergente del marcador — segundo y tercer criterio de US-EXP-02.
 *
 * "Foto de perfil del cocinero, nombre, valoración promedio y cantidad de platos
 * disponibles en ese momento", más el botón "Ver perfil".
 *
 * Va anclada al pie de la pantalla y no dentro de un `Callout` del marcador: un
 * callout de react-native-maps no admite los componentes del sistema de diseño ni
 * responde bien a los toques de un botón interno en Android, y la zona baja es
 * además la más alcanzable con el pulgar.
 */
function TarjetaDelCocinero({
  cocinero,
  onVerPerfil,
}: {
  cocinero: CocineroMapa;
  onVerPerfil: () => void;
}) {
  return (
    <View className="absolute bottom-4 left-4 right-4 rounded-md border border-border bg-surface p-4">
      <View className="flex-row items-center gap-3">
        <AvatarDeCocinero
          fotoPerfilUrl={cocinero.fotoPerfilUrl}
          tamano="h-12 w-12"
        />

        <View className="flex-1">
          <Text
            className="text-h3 font-bold text-text-primary"
            numberOfLines={1}
          >
            {`${cocinero.nombre} ${cocinero.apellido}`}
          </Text>
          <Valoracion
            className="mt-0.5"
            promedio={cocinero.valoracionPromedio}
          />
          <Text className="mt-0.5 text-caption text-text-secondary">
            {TEXTOS_EXPLORACION.platosDisponibles(cocinero.platosDisponibles)}
          </Text>
        </View>
      </View>

      <Boton className="mt-4" onPress={onVerPerfil} tamano="sm">
        {MENSAJES_EXPLORACION.verPerfil}
      </Boton>
    </View>
  );
}
