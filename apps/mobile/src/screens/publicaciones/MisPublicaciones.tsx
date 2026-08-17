import { useState, type ReactNode } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useResolveClassNames } from 'uniwind';
import {
  MENSAJES_PUBLICACION,
  PUBLICACIONES_POR_PAGINA,
  type FiltrosPublicacion,
  type OrdenPublicacion,
  type PublicacionListado,
} from '@foodhub/shared';
import {
  IconoBuscar,
  IconoChevronAbajo,
  IconoCocinero,
  IconoFiltro,
  IconoMas,
} from '../../components/iconos';
import { SafeAreaView } from '../../components/SafeAreaView';
import { Boton } from '../../components/ui/Boton';
import { EncabezadoPantalla } from '../../components/ui/EncabezadoPantalla';
import { Esqueleto } from '../../components/ui/Esqueleto';
import { EstadoDeError } from '../../components/ui/EstadoDeError';
import { EstadoVacio } from '../../components/ui/EstadoVacio';
import { usePublicacionesPropias } from '../../hooks/usePublicaciones';
import { useValorDebounced } from '../../hooks/useValorDebounced';
import { mensajeDeError } from '../../lib/api';
import { TEXTOS_PUBLICACIONES } from '../../lib/textos';
import { HojaDeFiltros } from './HojaDeFiltros';
import { HojaDeOrden } from './HojaDeOrden';
import {
  OPCIONES_ORDEN,
  SIN_FILTROS,
  type FiltrosSeleccionados,
} from './listado';
import { TarjetaDePublicacion } from './TarjetaDePublicacion';

/** Traduce el borrador de filtros de la pantalla al contrato de la API. */
function aFiltrosPublicacion(
  busqueda: string,
  filtros: FiltrosSeleccionados,
  orden: OrdenPublicacion,
  pagina: number,
): FiltrosPublicacion {
  const precioMinimo = Number(filtros.precioMinimo);
  const precioMaximo = Number(filtros.precioMaximo);

  return {
    orden,
    pagina,
    ...(busqueda ? { busqueda } : {}),
    ...(filtros.categoriaIds.length > 0
      ? { categoriaIds: filtros.categoriaIds }
      : {}),
    ...(filtros.estados.length > 0 ? { estados: filtros.estados } : {}),
    ...(filtros.precioMinimo !== '' && !Number.isNaN(precioMinimo)
      ? { precioMinimo }
      : {}),
    ...(filtros.precioMaximo !== '' && !Number.isNaN(precioMaximo)
      ? { precioMaximo }
      : {}),
  };
}

function hayFiltrosActivos(filtros: FiltrosSeleccionados): boolean {
  return (
    filtros.categoriaIds.length > 0 ||
    filtros.estados.length > 0 ||
    filtros.precioMinimo !== '' ||
    filtros.precioMaximo !== ''
  );
}

/**
 * PAN-PUB-01 · Mis publicaciones — US-PUB-05.
 *
 * Coordina: guarda el estado de búsqueda, filtros, orden y página, y delega
 * en `TarjetaDePublicacion`, `HojaDeFiltros` y `HojaDeOrden` el resto. Ninguna
 * de esas tres implementa la consulta; solo avisan qué cambió.
 *
 * Cambiar QUÉ se está preguntando vuelve a la página 1 (la 3 puede no existir
 * con el filtro nuevo). Ese reinicio se hace en el mismo handler que cambia el
 * filtro —no en un `useEffect` separado— para no encadenar un segundo render.
 */
export function MisPublicaciones() {
  const [busqueda, setBusqueda] = useState('');
  const busquedaDiferida = useValorDebounced(busqueda);
  const [filtros, setFiltros] = useState<FiltrosSeleccionados>(SIN_FILTROS);
  const [orden, setOrden] = useState<OrdenPublicacion>('RECIENTES');
  const [pagina, setPagina] = useState(1);
  const [hojaFiltrosAbierta, setHojaFiltrosAbierta] = useState(false);
  const [hojaOrdenAbierta, setHojaOrdenAbierta] = useState(false);

  const consulta = usePublicacionesPropias(
    aFiltrosPublicacion(busquedaDiferida, filtros, orden, pagina),
  );
  const datos = consulta.data?.datos ?? [];
  const total = consulta.data?.total ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(total / PUBLICACIONES_POR_PAGINA));

  const irANueva = () => {
    router.push('/publicaciones/nueva');
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <EncabezadoPantalla titulo={TEXTOS_PUBLICACIONES.titulo} />

      <BarraSuperior
        busqueda={busqueda}
        filtrosActivos={hayFiltrosActivos(filtros)}
        onAbrirFiltros={() => {
          setHojaFiltrosAbierta(true);
        }}
        onAbrirOrden={() => {
          setHojaOrdenAbierta(true);
        }}
        onCambiarBusqueda={(valor) => {
          setBusqueda(valor);
          setPagina(1);
        }}
        onNueva={irANueva}
        orden={orden}
      />

      <Contenido
        conFiltros={busquedaDiferida !== '' || hayFiltrosActivos(filtros)}
        consulta={consulta}
        datos={datos}
        onNuevaPublicacion={irANueva}
      />

      {totalPaginas > 1 ? (
        <Paginador
          onCambiarPagina={setPagina}
          pagina={pagina}
          totalPaginas={totalPaginas}
        />
      ) : null}

      <HojaDeFiltros
        abierta={hojaFiltrosAbierta}
        filtros={filtros}
        onAplicar={(nuevos) => {
          setFiltros(nuevos);
          setPagina(1);
          setHojaFiltrosAbierta(false);
        }}
        onCerrar={() => {
          setHojaFiltrosAbierta(false);
        }}
      />
      <HojaDeOrden
        abierta={hojaOrdenAbierta}
        onCerrar={() => {
          setHojaOrdenAbierta(false);
        }}
        onSeleccionar={(nuevoOrden) => {
          setOrden(nuevoOrden);
          setPagina(1);
          setHojaOrdenAbierta(false);
        }}
        valor={orden}
      />
    </SafeAreaView>
  );
}

/** Botón "Nueva publicación", buscador + filtro y el desplegable "Ordenar por". */
function BarraSuperior({
  busqueda,
  orden,
  filtrosActivos,
  onCambiarBusqueda,
  onNueva,
  onAbrirFiltros,
  onAbrirOrden,
}: {
  busqueda: string;
  orden: OrdenPublicacion;
  filtrosActivos: boolean;
  onCambiarBusqueda: (valor: string) => void;
  onNueva: () => void;
  onAbrirFiltros: () => void;
  onAbrirOrden: () => void;
}) {
  const etiquetaOrden =
    OPCIONES_ORDEN.find((opcion) => opcion.valor === orden)?.etiqueta ?? '';

  return (
    <>
      <View className="px-4 pt-3">
        <Boton
          icono={<IconoMas size={18} className="text-surface" />}
          onPress={onNueva}
        >
          {TEXTOS_PUBLICACIONES.nuevaPublicacion}
        </Boton>
      </View>

      <View className="flex-row items-center gap-2 px-4 pt-3">
        <BarraDeBusqueda onCambiar={onCambiarBusqueda} valor={busqueda} />
        <BotonIcono
          accessibilityLabel={TEXTOS_PUBLICACIONES.filtros}
          activo={filtrosActivos}
          icono={<IconoFiltro size={20} className="text-text-primary" />}
          onPress={onAbrirFiltros}
        />
      </View>

      <Pressable
        accessibilityLabel={TEXTOS_PUBLICACIONES.ordenarPor}
        accessibilityRole="button"
        className="mx-4 mt-2 min-h-11 flex-row items-center gap-1.5"
        onPress={onAbrirOrden}
      >
        <Text className="text-label text-text-secondary">
          {TEXTOS_PUBLICACIONES.ordenarPor}:
        </Text>
        <Text className="text-label font-semibold text-primary">
          {etiquetaOrden}
        </Text>
        <IconoChevronAbajo size={14} className="text-primary" />
      </Pressable>
    </>
  );
}

/**
 * Los cuatro estados de la pantalla, en el orden en que hay que evaluarlos:
 * primero el error, que invalida todo lo demás; después la carga; después el
 * vacío (con dos variantes, según haya o no búsqueda/filtros); al final, los
 * datos.
 */
function Contenido({
  consulta,
  datos,
  conFiltros,
  onNuevaPublicacion,
}: {
  consulta: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => unknown;
  };
  datos: readonly PublicacionListado[];
  conFiltros: boolean;
  onNuevaPublicacion: () => void;
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

  if (consulta.isPending) return <EsqueletoListado />;

  if (datos.length === 0) {
    return (
      <ListadoVacio
        conFiltros={conFiltros}
        onNuevaPublicacion={onNuevaPublicacion}
      />
    );
  }

  return (
    <FlatList
      contentContainerClassName="px-4 pt-3 pb-6"
      data={datos}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TarjetaDePublicacion
          onPress={() => {
            // El archivo de ruta es `publicaciones/[id]/index.tsx`: expo-router
            // tipa ese destino literalmente como `/publicaciones/[id]/index`.
            router.push({
              pathname: '/publicaciones/[id]/index',
              params: { id: item.id },
            });
          }}
          publicacion={item}
        />
      )}
    />
  );
}

function ListadoVacio({
  conFiltros,
  onNuevaPublicacion,
}: {
  conFiltros: boolean;
  onNuevaPublicacion: () => void;
}) {
  if (conFiltros) {
    return (
      <EstadoVacio
        icono={<IconoBuscar className="text-text-disabled" size={28} />}
        titulo={MENSAJES_PUBLICACION.sinResultados}
      />
    );
  }

  return (
    <EstadoVacio
      accion={
        <Boton onPress={onNuevaPublicacion}>
          {TEXTOS_PUBLICACIONES.nuevaPublicacion}
        </Boton>
      }
      icono={<IconoCocinero className="text-text-disabled" size={28} />}
      subtitulo={MENSAJES_PUBLICACION.sinPublicacionesSubtitulo}
      titulo={MENSAJES_PUBLICACION.sinPublicacionesTitulo}
    />
  );
}

function EsqueletoListado() {
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
 * Barra de búsqueda simple: sin etiqueta ni mensaje de error, a diferencia de
 * `CampoTexto`, porque no es un campo de un formulario que se valide.
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
        accessibilityLabel={TEXTOS_PUBLICACIONES.buscarPlaceholder}
        autoCorrect={false}
        className="flex-1 text-body text-text-primary"
        onChangeText={onCambiar}
        placeholder={TEXTOS_PUBLICACIONES.buscarPlaceholder}
        placeholderTextColor={colorPlaceholder}
        value={valor}
      />
    </View>
  );
}

function Paginador({
  pagina,
  totalPaginas,
  onCambiarPagina,
}: {
  pagina: number;
  totalPaginas: number;
  onCambiarPagina: (pagina: number) => void;
}) {
  return (
    <View className="flex-row items-center justify-center gap-4 border-t border-border py-3">
      <Boton
        accessibilityLabel={TEXTOS_PUBLICACIONES.paginaAnterior}
        deshabilitado={pagina <= 1}
        onPress={() => {
          onCambiarPagina(pagina - 1);
        }}
        tamano="sm"
        variante="ghost"
      >
        {TEXTOS_PUBLICACIONES.paginaAnterior}
      </Boton>
      <Text className="text-label text-text-secondary">
        {TEXTOS_PUBLICACIONES.pagina(pagina, totalPaginas)}
      </Text>
      <Boton
        accessibilityLabel={TEXTOS_PUBLICACIONES.paginaSiguiente}
        deshabilitado={pagina >= totalPaginas}
        onPress={() => {
          onCambiarPagina(pagina + 1);
        }}
        tamano="sm"
        variante="ghost"
      >
        {TEXTOS_PUBLICACIONES.paginaSiguiente}
      </Boton>
    </View>
  );
}

function BotonIcono({
  icono,
  activo,
  accessibilityLabel,
  onPress,
}: {
  icono: ReactNode;
  activo: boolean;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      className="h-11 w-11 items-center justify-center rounded-sm border border-border bg-surface"
      onPress={onPress}
    >
      {icono}
      {activo ? (
        <View className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
      ) : null}
    </Pressable>
  );
}
