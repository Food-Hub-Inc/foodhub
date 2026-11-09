import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useResolveClassNames } from 'uniwind';
import { MENSAJES_EXPLORACION, type PublicacionFeed } from '@foodhub/shared';
import {
  IconoBuscar,
  IconoCorazon,
  IconoFiltro,
  IconoTilde,
} from '../../components/iconos';
import { PantallaDeTab } from '../../components/PantallaDeTab';
import { BotonDeNotificaciones } from '../../components/ui/BotonDeNotificaciones';
import { Esqueleto } from '../../components/ui/Esqueleto';
import { EstadoDeError } from '../../components/ui/EstadoDeError';
import { EstadoVacio } from '../../components/ui/EstadoVacio';
import { useCategorias } from '../../hooks/useCategorias';
import { useFeed } from '../../hooks/useExploracion';
import { useFavoritos } from '../../hooks/useFavoritos';
import { useUbicacionActual } from '../../hooks/useUbicacionActual';
import { useValorDebounced } from '../../hooks/useValorDebounced';
import { mensajeDeError } from '../../lib/api';
import { TEXTOS_EXPLORACION } from '../../lib/textos';
import { BotonFlotanteDelCarrito } from './BotonFlotanteDelCarrito';
import {
  aFiltrosDelFeed,
  chipsDeFiltro,
  hayFiltrosDelFeedActivos,
  SIN_FILTROS_DEL_FEED,
  type FiltrosDelFeedSeleccionados,
} from './filtros';
import { HojaDeFiltrosDelFeed } from './HojaDeFiltrosDelFeed';
import { TarjetaDeFeed } from './TarjetaDeFeed';

/**
 * PAN-EXP-01 · Feed — US-EXP-01, US-EXP-03 y el filtro de US-EXP-06.
 *
 * Coordina: guarda el texto del buscador y los filtros, y delega el resto en
 * `TarjetaDeFeed`, `HojaDeFiltrosDelFeed` y los chips. La consulta la resuelve
 * `useFeed`; esta pantalla solo decide QUÉ se está preguntando.
 *
 * DOS DIFERENCIAS CON PAN-PUB-01, las dos exigidas por los criterios:
 *
 *   - Los filtros se aplican de inmediato (US-EXP-03), sin botón "Aplicar".
 *   - El scroll infinito reemplaza al paginador numerado (US-EXP-01): más
 *     publicaciones "sin redirigir al usuario ni recargar la pantalla completa".
 *
 * La ubicación es opcional en toda la pantalla. Sin permiso, el feed sigue
 * funcionando: pierde el orden por cercanía y la distancia de cada tarjeta, y el
 * filtro de distancia no se ofrece. No se bloquea nada ni se pide el permiso dos
 * veces: US-EXP-01 no lo lista como precondición, a diferencia de US-EXP-02.
 */
export function Feed() {
  const [busqueda, setBusqueda] = useState('');
  const busquedaDiferida = useValorDebounced(busqueda);
  const [filtros, setFiltros] =
    useState<FiltrosDelFeedSeleccionados>(SIN_FILTROS_DEL_FEED);
  const [hojaAbierta, setHojaAbierta] = useState(false);

  const ubicacion = useUbicacionActual();
  const categorias = useCategorias();
  const favoritos = useFavoritos();

  const consulta = useFeed(
    aFiltrosDelFeed({
      busqueda: busquedaDiferida,
      filtros,
      coordenadas: ubicacion.coordenadas,
    }),
  );

  // `pages` es una página por cada tanda que trajo el scroll infinito; la lista
  // las quiere como un solo arreglo plano.
  const datos = consulta.data?.pages.flatMap((pagina) => pagina.datos) ?? [];
  const chips = chipsDeFiltro(filtros, categorias.data ?? []);
  const tieneCocinerosFavoritos = (favoritos.data?.cocineros.length ?? 0) > 0;

  const limpiarTodo = () => {
    setBusqueda('');
    setFiltros(SIN_FILTROS_DEL_FEED);
  };

  return (
    <PantallaDeTab>
      <BarraSuperior
        busqueda={busqueda}
        filtrosActivos={hayFiltrosDelFeedActivos(filtros)}
        onAbrirFiltros={() => {
          setHojaAbierta(true);
        }}
        onCambiarBusqueda={setBusqueda}
      />

      {chips.length > 0 || busquedaDiferida !== '' ? (
        <ChipsActivos
          chips={chips}
          onLimpiarTodo={limpiarTodo}
          onQuitar={setFiltros}
        />
      ) : null}

      <Contenido
        consulta={consulta}
        datos={datos}
        estadoVacio={
          <FeedVacio
            conBusquedaOFiltros={
              busquedaDiferida !== '' || hayFiltrosDelFeedActivos(filtros)
            }
            sinFavoritosParaFiltrar={
              filtros.soloFavoritos && !tieneCocinerosFavoritos
            }
          />
        }
      />

      <HojaDeFiltrosDelFeed
        abierta={hojaAbierta}
        filtros={filtros}
        hayUbicacion={ubicacion.coordenadas !== null}
        onCambiar={setFiltros}
        onCerrar={() => {
          setHojaAbierta(false);
        }}
        tieneCocinerosFavoritos={tieneCocinerosFavoritos}
      />

      <BotonFlotanteDelCarrito />
    </PantallaDeTab>
  );
}

/**
 * Buscador, filtro, acceso a "Mis favoritos" y campana de notificaciones.
 *
 * La campana va acá y no en la barra de tabs porque es donde la ubica el mockup
 * del feed (ver el comentario de `(cliente)/_layout.tsx`). El corazón de "Mis
 * favoritos" se suma al lado: US-EXP-06 pide la sección pero la maquetación no le
 * asigna código PAN ni define desde dónde se entra, y este es el lugar donde el
 * cliente acaba de guardar sus favoritos (decisión del equipo).
 */
function BarraSuperior({
  busqueda,
  filtrosActivos,
  onCambiarBusqueda,
  onAbrirFiltros,
}: {
  busqueda: string;
  filtrosActivos: boolean;
  onCambiarBusqueda: (valor: string) => void;
  onAbrirFiltros: () => void;
}) {
  return (
    <>
      <View className="h-14 flex-row items-center justify-end border-b border-border bg-surface px-2">
        <Pressable
          onPress={() => {
            router.push('/favoritos');
          }}
          className="h-11 w-11 items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel={TEXTOS_EXPLORACION.irAFavoritos}
        >
          <IconoCorazon size={22} className="text-text-primary" />
        </Pressable>
        <BotonDeNotificaciones />
      </View>

      <View className="flex-row items-center gap-2 px-4 pt-3">
        <BarraDeBusqueda onCambiar={onCambiarBusqueda} valor={busqueda} />
        <Pressable
          accessibilityLabel={TEXTOS_EXPLORACION.filtros}
          accessibilityRole="button"
          className="h-11 w-11 items-center justify-center rounded-sm border border-border bg-surface"
          onPress={onAbrirFiltros}
        >
          <IconoFiltro size={20} className="text-text-primary" />
          {filtrosActivos ? (
            <View className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
          ) : null}
        </Pressable>
      </View>
    </>
  );
}

/**
 * Chips de los filtros activos — segundo y quinto criterio de US-EXP-03.
 *
 * Cada chip nombra su filtro y lo quita al tocarse ("opción de eliminarlo
 * individualmente"). El último es "Limpiar filtros", que además borra el texto
 * del buscador, como pide el quinto criterio: "elimine todos los filtros activos
 * y el texto del buscador".
 *
 * Es un `FlatList` horizontal y no un `ScrollView` con `.map()`: con muchas
 * categorías seleccionadas la fila puede crecer, y la guía pide listas
 * virtualizadas.
 */
function ChipsActivos({
  chips,
  onQuitar,
  onLimpiarTodo,
}: {
  chips: ReturnType<typeof chipsDeFiltro>;
  onQuitar: (filtros: FiltrosDelFeedSeleccionados) => void;
  onLimpiarTodo: () => void;
}) {
  return (
    // `grow-0`: un FlatList horizontal hereda `flexGrow: 1` y, dentro de la
    // columna de la pantalla, se repartía la altura con los resultados; los
    // chips se estiraban hasta ocupar media pantalla.
    <FlatList
      className="grow-0"
      contentContainerClassName="items-center gap-2 px-4 py-2"
      data={chips}
      horizontal
      keyExtractor={(chip) => chip.clave}
      ListFooterComponent={
        <Pressable
          onPress={onLimpiarTodo}
          className="h-8 justify-center rounded-full px-2"
          // 32 px de alto + 6 arriba y abajo = los 44 de área táctil mínima.
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={MENSAJES_EXPLORACION.limpiarFiltros}
        >
          <Text className="text-caption font-semibold text-primary">
            {MENSAJES_EXPLORACION.limpiarFiltros}
          </Text>
        </Pressable>
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => {
            onQuitar(item.quitar());
          }}
          className="h-8 flex-row items-center gap-1.5 self-center rounded-full bg-primary px-3"
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={TEXTOS_EXPLORACION.quitarFiltro(item.etiqueta)}
        >
          <Text
            className="text-caption font-semibold text-surface"
            numberOfLines={1}
          >
            {item.etiqueta}
          </Text>
          {/* El ícono de tilde girado 45° es la "x" del sistema: la guía visual
              no tiene un ícono de cerrar propio y no se inventa uno. */}
          <View style={{ transform: [{ rotate: '45deg' }] }}>
            <IconoTilde size={12} className="text-surface" />
          </View>
        </Pressable>
      )}
      showsHorizontalScrollIndicator={false}
    />
  );
}

/**
 * Los cuatro estados de la pantalla, en el orden en que hay que evaluarlos:
 * error, carga, vacío, datos. Mismo criterio que `MisPublicaciones`.
 */
function Contenido({
  consulta,
  datos,
  estadoVacio,
}: {
  consulta: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => unknown;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: () => unknown;
  };
  datos: readonly PublicacionFeed[];
  estadoVacio: ReactNode;
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

  if (consulta.isPending) return <EsqueletoDelFeed />;
  if (datos.length === 0) return <>{estadoVacio}</>;

  return (
    <FlatList
      contentContainerClassName="px-4 pt-3 pb-24"
      data={datos}
      keyExtractor={(item) => item.id}
      // 0.4 y no 0: dispara la carga cuando falta menos de media pantalla, así
      // la tanda siguiente suele llegar antes de que el usuario toque el fondo.
      onEndReached={() => {
        if (consulta.hasNextPage && !consulta.isFetchingNextPage) {
          void consulta.fetchNextPage();
        }
      }}
      onEndReachedThreshold={0.4}
      ListFooterComponent={
        consulta.isFetchingNextPage ? (
          <View className="py-4">
            <ActivityIndicator />
          </View>
        ) : null
      }
      renderItem={({ item }) => (
        <TarjetaDeFeed
          onAbrirCocinero={() => {
            router.push({
              pathname: '/cocineros/[id]',
              params: { id: item.cocinero.id },
            });
          }}
          onAbrirPlato={() => {
            router.push({ pathname: '/platos/[id]', params: { id: item.id } });
          }}
          publicacion={item}
        />
      )}
    />
  );
}

/**
 * Los tres estados vacíos posibles del feed, cada uno con su literal:
 *
 *   sin favoritos + filtro activo  "Guardá cocineros como favoritos..."  (US-EXP-06)
 *   con búsqueda o filtros         "No se encontraron platos..."          (US-EXP-03)
 *   feed limpio                    "No hay publicaciones disponibles..."  (US-EXP-01)
 *
 * El orden importa: el caso de los favoritos es más específico y explica algo que
 * los otros dos textos no dirían.
 */
function FeedVacio({
  conBusquedaOFiltros,
  sinFavoritosParaFiltrar,
}: {
  conBusquedaOFiltros: boolean;
  sinFavoritosParaFiltrar: boolean;
}) {
  if (sinFavoritosParaFiltrar) {
    return (
      <EstadoVacio
        icono={<IconoCorazon className="text-text-disabled" size={28} />}
        titulo={MENSAJES_EXPLORACION.sinFavoritosParaFiltrar}
      />
    );
  }

  return (
    <EstadoVacio
      icono={<IconoBuscar className="text-text-disabled" size={28} />}
      titulo={
        conBusquedaOFiltros
          ? MENSAJES_EXPLORACION.sinResultados
          : MENSAJES_EXPLORACION.feedVacio
      }
    />
  );
}

function EsqueletoDelFeed() {
  return (
    <View className="px-4 pt-3">
      <Esqueleto className="mb-3 h-28 rounded-md" />
      <Esqueleto className="mb-3 h-28 rounded-md" />
      <Esqueleto className="mb-3 h-28 rounded-md" />
      <Esqueleto className="mb-3 h-28 rounded-md" />
    </View>
  );
}

/**
 * Barra de búsqueda: sin etiqueta ni mensaje de error, a diferencia de
 * `CampoTexto`, porque no es un campo de formulario que se valide. Igual que la
 * de `MisPublicaciones`, con otro placeholder y buscando en dos campos.
 */
function BarraDeBusqueda({
  valor,
  onCambiar,
}: {
  valor: string;
  onCambiar: (valor: string) => void;
}) {
  const estiloPlaceholder = useResolveClassNames('text-text-disabled');
  const colorPlaceholder =
    typeof estiloPlaceholder.color === 'string'
      ? estiloPlaceholder.color
      : undefined;

  return (
    <View className="h-11 flex-1 flex-row items-center gap-2 rounded-sm border border-border bg-surface px-3">
      <IconoBuscar size={18} className="text-text-disabled" />
      <TextInput
        accessibilityLabel={TEXTOS_EXPLORACION.buscarPlaceholder}
        autoCorrect={false}
        className="flex-1 text-body text-text-primary"
        onChangeText={onCambiar}
        placeholder={TEXTOS_EXPLORACION.buscarPlaceholder}
        placeholderTextColor={colorPlaceholder}
        value={valor}
      />
    </View>
  );
}
