import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  MENSAJES_RESENA,
  type PedidoResumen,
  type PerfilPublicoCliente,
} from '@foodhub/shared';
import { IconoBolsa, IconoUsuario } from '../../components/iconos';
import { SafeAreaView } from '../../components/SafeAreaView';
import { EncabezadoPantalla } from '../../components/ui/EncabezadoPantalla';
import { Esqueleto } from '../../components/ui/Esqueleto';
import { EstadoDeError } from '../../components/ui/EstadoDeError';
import { EstadoVacio } from '../../components/ui/EstadoVacio';
import { usePerfil } from '../../hooks/usePerfil';
import {
  usePedidosConCliente,
  usePerfilDeCliente,
} from '../../hooks/useResenas';
import { mensajeDeError } from '../../lib/api';
import {
  formatearFecha,
  formatearMesYAnio,
  formatearPrecio,
} from '../../lib/formato';
import { TEXTOS_PERFIL_CLIENTE, TEXTOS_RESENA } from '../../lib/textos';
import { EtiquetaDeEstado, Pestanas } from '../pedidos/Piezas';
import { MiniaturaDePlato } from '../exploracion/Piezas';
import { EstrellasDelPromedio } from '../resenas/ResumenDeResenas';
import { ListaDeResenas } from '../resenas/ListaDeResenas';

/**
 * Perfil público del cliente — cuarto criterio de US-DASH-03.
 *
 * "El cocinero presiona sobre un cliente del listado → Navegue al perfil
 * público del cliente mostrando su información básica y el historial de pedidos
 * realizados a ese cocinero."
 *
 * NO ESTÁ EN LA MAQUETACIÓN DE LA ETAPA 5 ni tiene criterios propios: el
 * inventario dibuja el perfil público del COCINERO (PAN-EXP-04) y no el del
 * cliente. El equipo la definió al corregir el módulo de Reseñas, y hasta que
 * le asignen un código PAN el layout replica el del perfil del cocinero: ficha
 * arriba, dos solapas, y la lista mandando el scroll.
 *
 * SOLO PARA COCINEROS. Las reseñas de un cliente son información entre
 * cocineros (US-RES-02: "no es visible para el cliente calificado ni para otros
 * clientes"), y con las tres reseñas en una sola tabla esa privacidad ya no la
 * da el modelo. El endpoint responde 403 a un CLIENTE, y acá hay además una
 * guarda por rol: la ruta vive fuera del grupo `(cocinero)` para poder apilarse
 * sobre las tabs, así que es alcanzable por enlace directo, y un 403 crudo no
 * le explica nada a quien lo recibe.
 *
 * NUNCA MUESTRA LA UBICACIÓN NI EL CORREO. Tampoco viajan en el contrato, que
 * es donde de verdad se decide: ocultarlos solo en la pantalla dejaría el dato
 * viajando en la respuesta.
 */
type SolapaDelCliente = 'RESENAS' | 'PEDIDOS';

export function PerfilDeCliente({ id }: { id: string | undefined }) {
  const perfilPropio = usePerfil();
  const consulta = usePerfilDeCliente(id ?? '');
  const [solapa, setSolapa] = useState<SolapaDelCliente>('RESENAS');

  // La guarda por rol va antes que la consulta: si quien mira no es cocinero,
  // el listado de abajo tampoco tiene por qué pedirse.
  if (perfilPropio.data && perfilPropio.data.tipo !== 'COCINERO') {
    return (
      <Marco>
        <EstadoVacio
          icono={<IconoUsuario className="text-text-disabled" size={28} />}
          titulo={TEXTOS_PERFIL_CLIENTE.soloParaCocineros}
        />
      </Marco>
    );
  }

  if (consulta.isError) {
    return (
      <Marco>
        <EstadoDeError
          mensaje={mensajeDeError(consulta.error)}
          onReintentar={() => {
            void consulta.refetch();
          }}
        />
      </Marco>
    );
  }

  if (!consulta.data) {
    return (
      <Marco>
        <EsqueletoDelPerfil />
      </Marco>
    );
  }

  const cliente = consulta.data;

  const cabecera = (
    <>
      <FichaDelCliente cliente={cliente} />
      <Pestanas
        activa={solapa}
        onCambiar={setSolapa}
        opciones={[
          { valor: 'RESENAS', etiqueta: TEXTOS_PERFIL_CLIENTE.solapaResenas },
          { valor: 'PEDIDOS', etiqueta: TEXTOS_PERFIL_CLIENTE.solapaPedidos },
        ]}
      />
    </>
  );

  if (solapa === 'RESENAS') {
    return (
      <Marco>
        <ListaDeResenas
          encabezado={cabecera}
          origen={{ tipo: 'CLIENTE', clienteId: cliente.id }}
          textosVacio={{ titulo: MENSAJES_RESENA.clienteSinResenas }}
          titulo={TEXTOS_RESENA.tituloResenasDelCliente}
        />
      </Marco>
    );
  }

  return (
    <Marco>
      <PedidosDelCliente cabecera={cabecera} clienteId={cliente.id} />
    </Marco>
  );
}

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <EncabezadoPantalla
        destinoAlternativo="/(cocinero)/actividad"
        titulo={TEXTOS_PERFIL_CLIENTE.titulo}
      />
      {children}
    </SafeAreaView>
  );
}

/**
 * Identidad y reputación, en una sola tarjeta.
 *
 * Replica `TarjetaDeIdentidad` de "Mi perfil" —mismo contenedor, mismo avatar
 * de 96— para que las dos fichas de persona de la app se vean iguales. Lo que
 * cambia es que acá no hay nada editable: es el perfil de otro.
 */
function FichaDelCliente({ cliente }: { cliente: PerfilPublicoCliente }) {
  return (
    <View className="items-center border-b border-border bg-surface px-4 py-6">
      <View className="h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-background">
        {cliente.fotoPerfilUrl === null ? (
          <IconoUsuario className="text-text-disabled" size={44} />
        ) : (
          <Image
            accessibilityLabel={cliente.nombre}
            contentFit="cover"
            source={{ uri: cliente.fotoPerfilUrl }}
            style={{ width: '100%', height: '100%' }}
          />
        )}
      </View>

      <Text className="mt-4 text-h2 font-bold text-text-primary">
        {`${cliente.nombre} ${cliente.apellido}`}
      </Text>

      <Text className="mt-0.5 text-caption text-text-secondary">
        {TEXTOS_PERFIL_CLIENTE.miembroDesde(
          formatearMesYAnio(cliente.fechaRegistro),
        )}
      </Text>

      {cliente.cuentaEliminada ? (
        <Text className="mt-1 text-caption text-text-disabled">
          {TEXTOS_PERFIL_CLIENTE.cuentaEliminada}
        </Text>
      ) : null}

      <Reputacion reputacion={cliente.reputacion} />
    </View>
  );
}

/**
 * El promedio, o "Cliente nuevo" — US-RES-02.
 *
 * "Si el cliente registra menos de 3 pedidos completados en la plataforma,
 * muestre el texto 'Cliente nuevo' en lugar del promedio."
 *
 * `esClienteNuevo` MANDA SOBRE EL PROMEDIO y no se deriva de la cantidad de
 * reseñas: el umbral son PEDIDOS COMPLETADOS. Un cliente con diez pedidos y
 * ninguna reseña no es nuevo, solo no tiene reputación todavía, y el servidor
 * ya manda el promedio en `null` en los dos casos.
 */
function Reputacion({
  reputacion,
}: {
  reputacion: PerfilPublicoCliente['reputacion'];
}) {
  if (reputacion.esClienteNuevo) {
    return (
      <View className="mt-3 rounded-full bg-background px-3 py-1">
        <Text className="text-caption font-semibold text-text-secondary">
          {MENSAJES_RESENA.clienteNuevo}
        </Text>
      </View>
    );
  }

  if (reputacion.promedio === null) {
    return (
      <Text className="mt-3 text-caption text-text-secondary">
        {TEXTOS_RESENA.sinResenasTodavia}
      </Text>
    );
  }

  return (
    <View className="mt-3 items-center">
      <Text className="text-h1 font-extrabold text-text-primary">
        {reputacion.promedio.toFixed(1)}
      </Text>
      <EstrellasDelPromedio promedio={reputacion.promedio} />
      <Text className="mt-1 text-caption text-text-secondary">
        {TEXTOS_PERFIL_CLIENTE.cocinerosQueLoResenaron(
          reputacion.cantidadCocineros,
        )}
      </Text>
    </View>
  );
}

/**
 * El historial de pedidos de ese cliente CON EL COCINERO QUE MIRA.
 *
 * El "a ese cocinero" del criterio lo resuelve el servidor: el cocinero sale de
 * la sesión, así que no hay forma de pedir desde acá lo que ese cliente le
 * compró a la competencia.
 *
 * Trae todos los estados, no solo los completados: un pedido rechazado o
 * cancelado dice tanto de un cliente como uno que salió bien, y es justamente
 * lo que un cocinero quiere ver antes de aceptar el siguiente.
 */
function PedidosDelCliente({
  clienteId,
  cabecera,
}: {
  clienteId: string;
  cabecera: React.ReactNode;
}) {
  const consulta = usePedidosConCliente(clienteId);

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

  if (!consulta.data) return <EsqueletoDelPerfil />;

  const pedidos = consulta.data.pages.flatMap((pagina) => pagina.datos);

  return (
    <FlatList
      contentContainerClassName="pb-10"
      data={pedidos}
      keyExtractor={(pedido) => pedido.id}
      ListEmptyComponent={
        <EstadoVacio
          icono={<IconoBolsa className="text-text-disabled" size={28} />}
          subtitulo={TEXTOS_PERFIL_CLIENTE.sinPedidosConEsteClienteSubtitulo}
          titulo={TEXTOS_PERFIL_CLIENTE.sinPedidosConEsteCliente}
        />
      }
      ListFooterComponent={
        consulta.isFetchingNextPage ? (
          <View className="px-4 pt-3">
            <Esqueleto className="h-24 rounded-md" />
          </View>
        ) : null
      }
      ListHeaderComponent={<>{cabecera}</>}
      onEndReached={() => {
        if (consulta.hasNextPage && !consulta.isFetchingNextPage) {
          void consulta.fetchNextPage();
        }
      }}
      onEndReachedThreshold={0.5}
      renderItem={({ item }) => <TarjetaDePedido pedido={item} />}
    />
  );
}

/**
 * Una línea del historial: número, estado, fecha, el primer plato y el total.
 *
 * Muestra `primerItem` y no la lista entera, igual que las tarjetas de
 * PAN-PED-04 y PAN-PED-05: el detalle completo está a un toque, y en un
 * historial largo lo que se busca es reconocer el pedido, no leerlo.
 */
function TarjetaDePedido({ pedido }: { pedido: PedidoResumen }) {
  return (
    <Pressable
      className="border-b border-border bg-surface px-4 py-4"
      onPress={() => {
        router.push({
          pathname: '/pedidos/[id]/detalle',
          params: { id: pedido.id },
        });
      }}
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-body font-bold text-text-primary">
          {`#${pedido.numeroPedido}`}
        </Text>
        <EtiquetaDeEstado pedido={pedido} vista="COCINERO" />
      </View>

      <Text className="mt-0.5 text-caption text-text-secondary">
        {formatearFecha(pedido.fechaCreacion)}
      </Text>

      <View className="mt-3 flex-row items-center gap-3">
        <MiniaturaDePlato
          className="h-14 w-14 rounded-sm"
          imagenDeCategoria={null}
          imagenUrl={pedido.primerItem.imagenUrl}
        />

        <View className="flex-1">
          <Text className="text-body text-text-primary" numberOfLines={1}>
            {pedido.primerItem.nombre}
          </Text>
          {pedido.cantidadItems > 1 ? (
            <Text className="text-caption text-text-secondary">
              {TEXTOS_PERFIL_CLIENTE.masPlatos(pedido.cantidadItems - 1)}
            </Text>
          ) : null}
        </View>

        <Text className="text-body font-bold text-text-primary">
          {formatearPrecio(pedido.total)}
        </Text>
      </View>
    </Pressable>
  );
}

function EsqueletoDelPerfil() {
  return (
    <View className="px-4 pt-4">
      <Esqueleto className="mb-4 h-40 rounded-md" />
      <Esqueleto className="mb-3 h-12 rounded-md" />
      <Esqueleto className="mb-3 h-28 rounded-md" />
      <Esqueleto className="h-28 rounded-md" />
    </View>
  );
}
