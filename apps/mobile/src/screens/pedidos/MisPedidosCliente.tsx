import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  MENSAJES_PEDIDO,
  PESTANA_PEDIDOS_CLIENTE,
  type ContadoresPedido,
  type PedidoResumen,
  type PestanaPedidosCliente,
} from '@foodhub/shared';
import { IconoBolsa, IconoChevronDerecha } from '../../components/iconos';
import { SafeAreaView } from '../../components/SafeAreaView';
import { Boton } from '../../components/ui/Boton';
import { EncabezadoPantalla } from '../../components/ui/EncabezadoPantalla';
import { Esqueleto } from '../../components/ui/Esqueleto';
import { EstadoDeError } from '../../components/ui/EstadoDeError';
import { EstadoVacio } from '../../components/ui/EstadoVacio';
import { useMisPedidos } from '../../hooks/usePedidos';
import { mensajeDeError } from '../../lib/api';
import { formatearFecha, formatearPrecio } from '../../lib/formato';
import { TEXTOS_CARRITO, TEXTOS_PEDIDOS } from '../../lib/textos';
import { MiniaturaDePlato } from '../exploracion/Piezas';
import { EtiquetaDeEstado, Pestanas } from './Piezas';

/**
 * "Mis pedidos" del cliente — PAN-PED-05 · US-PED-06.
 *
 * "Muestre la pantalla de historial con tres pestañas horizontales: Activos
 * ('En curso'), Completados y Rechazados. La pestaña 'Activos' debe estar
 * seleccionada por defecto al ingresar."
 *
 * QUÉ ABRE CADA TARJETA depende de la pestaña, y no es un detalle de navegación:
 * el criterio de "Activos" dice "al tocar un pedido activo, el sistema navega a
 * la pantalla de seguimiento del pedido", mientras que las tarjetas de
 * Completados y Rechazados van al detalle (PAN-PED-06). Son dos pantallas
 * distintas para dos momentos distintos: una acompaña, la otra rinde cuentas.
 *
 * LOS CONTADORES SALEN DE LA MISMA RESPUESTA que la lista. La API los devuelve
 * completos -los cinco estados- en cada página, así que las tres pestañas
 * muestran su número sin tres consultas extra.
 */

/** Rótulo y estados de cada pestaña, en el orden del criterio. */
const ETIQUETA_DE_PESTANA: Record<PestanaPedidosCliente, string> = {
  EN_CURSO: MENSAJES_PEDIDO.pestanaEnCurso,
  COMPLETADOS: MENSAJES_PEDIDO.pestanaCompletados,
  RECHAZADOS: MENSAJES_PEDIDO.pestanaRechazados,
};

/**
 * Estado vacío de cada pestaña (último criterio de US-PED-06: "un mensaje claro
 * y amigable acorde a la pestaña").
 */
const VACIO_DE_PESTANA: Record<PestanaPedidosCliente, string> = {
  EN_CURSO: MENSAJES_PEDIDO.sinPedidosEnCurso,
  COMPLETADOS: MENSAJES_PEDIDO.sinPedidosCompletados,
  RECHAZADOS: MENSAJES_PEDIDO.sinPedidosRechazados,
};

/** Cuántos pedidos cuenta cada pestaña, a partir de los contadores por estado. */
function cantidadDePestana(
  contadores: ContadoresPedido | undefined,
  pestana: PestanaPedidosCliente,
): number {
  if (!contadores) return 0;

  switch (pestana) {
    case 'EN_CURSO':
      return contadores.CREADO + contadores.ACEPTADO + contadores.LISTO;
    case 'COMPLETADOS':
      return contadores.COMPLETADO;
    case 'RECHAZADOS':
      return contadores.RECHAZADO;
  }
}

export function MisPedidosCliente() {
  const [pestana, setPestana] = useState<PestanaPedidosCliente>('EN_CURSO');
  const consulta = useMisPedidos(pestana);
  const contadores = consulta.data?.pages[0]?.contadores;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <EncabezadoPantalla titulo={MENSAJES_PEDIDO.misPedidos} />

      <Pestanas
        activa={pestana}
        onCambiar={setPestana}
        opciones={PESTANA_PEDIDOS_CLIENTE.map((valor) => ({
          valor,
          etiqueta: ETIQUETA_DE_PESTANA[valor],
          cantidad: cantidadDePestana(contadores, valor),
        }))}
      />

      <Contenido consulta={consulta} pestana={pestana} />
    </SafeAreaView>
  );
}

function Contenido({
  consulta,
  pestana,
}: {
  consulta: ReturnType<typeof useMisPedidos>;
  pestana: PestanaPedidosCliente;
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

  if (consulta.isPending) {
    return (
      <View className="px-4 pt-3">
        <Esqueleto className="mb-3 h-24 rounded-md" />
        <Esqueleto className="mb-3 h-24 rounded-md" />
        <Esqueleto className="mb-3 h-24 rounded-md" />
      </View>
    );
  }

  const pedidos = consulta.data.pages.flatMap((pagina) => pagina.datos);

  if (pedidos.length === 0) {
    return (
      <EstadoVacio
        icono={<IconoBolsa className="text-primary" size={34} />}
        titulo={VACIO_DE_PESTANA[pestana]}
        {...(pestana === 'EN_CURSO'
          ? {
              accion: (
                <Boton
                  onPress={() => {
                    router.push('/(cliente)/inicio');
                  }}
                  tamano="sm"
                >
                  {TEXTOS_CARRITO.explorarPlatos}
                </Boton>
              ),
            }
          : {})}
      />
    );
  }

  return (
    <FlatList
      contentContainerClassName="px-4 py-3 gap-3"
      data={pedidos}
      keyExtractor={(pedido) => pedido.id}
      onEndReached={() => {
        if (consulta.hasNextPage && !consulta.isFetchingNextPage) {
          void consulta.fetchNextPage();
        }
      }}
      onEndReachedThreshold={0.4}
      refreshing={consulta.isRefetching && !consulta.isFetchingNextPage}
      onRefresh={() => {
        void consulta.refetch();
      }}
      renderItem={({ item }) => (
        <TarjetaDePedido pedido={item} pestana={pestana} />
      )}
    />
  );
}

/**
 * Tarjeta de un pedido del cliente.
 *
 * "Imagen del plato, nombre del plato, nombre del cocinero, número de pedido,
 * precio total y la leyenda visual del estado actual con color diferenciado."
 * Las pestañas de Completados y Rechazados agregan la fecha.
 *
 * MUESTRA UN SOLO PLATO aunque el pedido tenga varios, como pide el criterio
 * ("en caso de ser varios platos, que se recupere el primero"); la cantidad de
 * platos restantes se anuncia debajo para que el cliente no crea que perdió
 * parte del pedido.
 */
function TarjetaDePedido({
  pedido,
  pestana,
}: {
  pedido: PedidoResumen;
  pestana: PestanaPedidosCliente;
}) {
  const enCurso = pestana === 'EN_CURSO';
  const platosRestantes = pedido.cantidadItems - 1;

  return (
    <View className="overflow-hidden rounded-md border border-border bg-surface">
      <Pressable
        accessibilityLabel={TEXTOS_PEDIDOS.abrirPedido(pedido.numeroPedido)}
        accessibilityRole="button"
        className="flex-row items-center gap-3 p-3"
        onPress={() => {
          router.push({
            pathname: enCurso
              ? '/pedidos/[id]/seguimiento'
              : '/pedidos/[id]/detalle',
            params: { id: pedido.id },
          });
        }}
      >
        <MiniaturaDePlato
          className="h-16 w-16 rounded-sm"
          imagenDeCategoria={null}
          imagenUrl={pedido.primerItem.imagenUrl}
        />

        <View className="flex-1 gap-0.5">
          <Text
            className="text-body font-bold text-text-primary"
            numberOfLines={2}
          >
            {pedido.primerItem.nombre}
          </Text>

          {platosRestantes > 0 ? (
            <Text className="text-caption text-text-secondary">
              {TEXTOS_PEDIDOS.platosAdicionales(platosRestantes)}
            </Text>
          ) : null}

          <Text className="text-caption text-text-secondary">
            {`${pedido.participante.nombre} ${pedido.participante.apellido}`}
          </Text>

          <Text className="text-caption text-text-disabled">
            {/* En las pestañas cerradas la fecha acompaña al número: el criterio
                pide "fecha de entrega" en Completados y "fecha" en Rechazados. */}
            {enCurso
              ? pedido.numeroPedido
              : `${pedido.numeroPedido} · ${formatearFecha(pedido.fechaUltimaTransicion)}`}
          </Text>
        </View>

        <View className="items-end gap-2">
          <EtiquetaDeEstado pedido={pedido} vista="CLIENTE" />
          <Text className="text-body font-extrabold text-text-primary">
            {formatearPrecio(pedido.total)}
          </Text>
          <IconoChevronDerecha className="text-text-disabled" size={18} />
        </View>
      </Pressable>

      <AccionDejarResena pedido={pedido} />
    </View>
  );
}

/**
 * "Si el pedido completado aún no tiene reseña del cliente, mostrar el botón
 * 'Dejar reseña' sobre la tarjeta" (US-PED-06).
 *
 * LLEVA AL DETALLE, NO DIRECTO AL FORMULARIO. La reseña es por plato (cambio
 * del 2026-08-18) y esta tarjeta no sabe cuáles son: `primerItem` trae el
 * nombre y la imagen del primero, pero no su `publicacionId`, y un pedido puede
 * tener varios. RF031 puso justamente en el detalle un botón por cada ítem, así
 * que ahí es donde el cliente elige qué plato reseñar.
 *
 * Antes navegaba directo a `/resenas/dejar` sin parámetros, cuando esa ruta
 * todavía era una pantalla pendiente que no los necesitaba.
 */
function AccionDejarResena({ pedido }: { pedido: PedidoResumen }) {
  if (!pedido.puedeCalificar) return null;

  return (
    <View className="border-t border-border p-3">
      <Boton
        onPress={() => {
          router.push({
            pathname: '/pedidos/[id]/detalle',
            params: { id: pedido.id },
          });
        }}
        tamano="sm"
        variante="secundario"
      >
        {MENSAJES_PEDIDO.dejarResena}
      </Boton>
    </View>
  );
}
