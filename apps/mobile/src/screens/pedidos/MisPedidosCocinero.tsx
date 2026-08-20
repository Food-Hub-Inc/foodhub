import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  MENSAJES_PEDIDO,
  PESTANA_PEDIDOS_COCINERO,
  type ContadoresPedido,
  type PedidoResumen,
  type PestanaPedidosCocinero,
} from '@foodhub/shared';
import { IconoBolsa, IconoChevronDerecha } from '../../components/iconos';
import { SafeAreaView } from '../../components/SafeAreaView';
import { Boton } from '../../components/ui/Boton';
import { DialogoSevero } from '../../components/ui/DialogoSevero';
import { EncabezadoPantalla } from '../../components/ui/EncabezadoPantalla';
import { Esqueleto } from '../../components/ui/Esqueleto';
import { EstadoDeError } from '../../components/ui/EstadoDeError';
import { EstadoVacio } from '../../components/ui/EstadoVacio';
import {
  useCompletarPedido,
  useMarcarListo,
  usePedidosRecibidos,
} from '../../hooks/usePedidos';
import { mensajeDeError } from '../../lib/api';
import {
  formatearFecha,
  formatearPrecio,
  tiempoTranscurrido,
} from '../../lib/formato';
import { TEXTOS_PEDIDOS } from '../../lib/textos';
import { EtiquetaDeEstado, FichaDeParticipante, Pestanas } from './Piezas';

/**
 * Bandeja de pedidos del cocinero — PAN-PED-04, 04.1, 04.2 y 04.3 · US-PED-03,
 * US-PED-05 y US-PED-08.
 *
 * "Muestre la pantalla de gestión de pedidos activos con cinco pestañas: Nuevos
 * (pedidos en estado Creado), Preparando (Aceptado), Listos (Listo),
 * Completados y Rechazados. Cada pestaña muestre un contador con la cantidad de
 * pedidos en ese estado."
 *
 * CADA PESTAÑA TIENE SU ACCIÓN, y esa es toda la diferencia entre ellas:
 *
 *   Nuevos       "Ver detalle" → la pantalla de gestión (PAN-PED-04.4), donde
 *                se acepta o se rechaza. La decisión NO se toma desde la lista:
 *                aceptar exige elegir el tiempo de preparación.
 *   Preparando   botón "Listo", directo desde la tarjeta.
 *   Listos       botón "Entregado", con diálogo de confirmación.
 *   Completados  "Calificar cliente" si todavía no lo calificó.
 *   Rechazados   sin acción: el pedido terminó.
 *
 * El tiempo que muestra cada tarjeta es distinto según la pestaña -"desde que el
 * pedido fue recibido" en Nuevos, "desde la aceptación" en Preparando, "desde el
 * último cambio de estado" en Listos-, y los tres criterios lo dicen
 * explícitamente. Se resuelve con `fechaCreacion` para la primera y
 * `fechaUltimaTransicion` para las otras dos.
 */

const ETIQUETA_DE_PESTANA: Record<PestanaPedidosCocinero, string> = {
  NUEVOS: MENSAJES_PEDIDO.pestanaNuevos,
  PREPARANDO: MENSAJES_PEDIDO.pestanaPreparando,
  LISTOS: MENSAJES_PEDIDO.pestanaListos,
  COMPLETADOS: MENSAJES_PEDIDO.pestanaCompletados,
  RECHAZADOS: MENSAJES_PEDIDO.pestanaRechazados,
};

/**
 * Estado vacío de cada pestaña. Los de Preparando (US-PED-05) y los dos del
 * historial (US-PED-08) son literales del documento; los otros dos siguen el
 * mismo tono porque el criterio solo pide "un mensaje acorde".
 */
const VACIO_DE_PESTANA: Record<PestanaPedidosCocinero, string> = {
  NUEVOS: MENSAJES_PEDIDO.sinPedidosNuevos,
  PREPARANDO: MENSAJES_PEDIDO.sinPedidosPreparandose,
  LISTOS: MENSAJES_PEDIDO.sinPedidosListos,
  COMPLETADOS: MENSAJES_PEDIDO.cocineroSinPedidosCompletados,
  RECHAZADOS: MENSAJES_PEDIDO.cocineroSinPedidosRechazados,
};

const ESTADO_DE_PESTANA: Record<
  PestanaPedidosCocinero,
  keyof ContadoresPedido
> = {
  NUEVOS: 'CREADO',
  PREPARANDO: 'ACEPTADO',
  LISTOS: 'LISTO',
  COMPLETADOS: 'COMPLETADO',
  RECHAZADOS: 'RECHAZADO',
};

export function MisPedidosCocinero() {
  const [pestana, setPestana] = useState<PestanaPedidosCocinero>('NUEVOS');
  const consulta = usePedidosRecibidos(pestana);
  const contadores = consulta.data?.pages[0]?.contadores;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <EncabezadoPantalla titulo={MENSAJES_PEDIDO.misPedidos} />

      <Pestanas
        activa={pestana}
        onCambiar={setPestana}
        opciones={PESTANA_PEDIDOS_COCINERO.map((valor) => ({
          valor,
          etiqueta: ETIQUETA_DE_PESTANA[valor],
          cantidad: contadores?.[ESTADO_DE_PESTANA[valor]] ?? 0,
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
  consulta: ReturnType<typeof usePedidosRecibidos>;
  pestana: PestanaPedidosCocinero;
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
        <Esqueleto className="mb-3 h-32 rounded-md" />
        <Esqueleto className="mb-3 h-32 rounded-md" />
      </View>
    );
  }

  const pedidos = consulta.data.pages.flatMap((pagina) => pagina.datos);

  if (pedidos.length === 0) {
    return (
      <EstadoVacio
        icono={<IconoBolsa className="text-primary" size={34} />}
        titulo={VACIO_DE_PESTANA[pestana]}
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
 * Tarjeta de un pedido recibido.
 *
 * "Foto y nombre del cliente, número de pedido, nombre del plato, cantidad,
 * tiempo transcurrido desde que el pedido fue recibido (ej. 'hace 3 min') y el
 * botón Ver detalle" (US-PED-03), con la acción de la pestaña al pie.
 */
function TarjetaDePedido({
  pedido,
  pestana,
}: {
  pedido: PedidoResumen;
  pestana: PestanaPedidosCocinero;
}) {
  const cerrado = pestana === 'COMPLETADOS' || pestana === 'RECHAZADOS';
  const platosRestantes = pedido.cantidadItems - 1;

  return (
    <View className="overflow-hidden rounded-md border border-border bg-surface">
      <Pressable
        accessibilityLabel={TEXTOS_PEDIDOS.abrirPedido(pedido.numeroPedido)}
        accessibilityRole="button"
        onPress={() => {
          /*
           * Un pedido nuevo abre la pantalla de gestión, donde se acepta o se
           * rechaza (PAN-PED-04.4); cualquier otro abre el detalle de solo
           * lectura (PAN-PED-04.6). Es la misma distinción que hace el criterio
           * al mandar "Ver detalle" a una pantalla y el "tap tarjeta" de
           * Completados a otra.
           */
          router.push({
            pathname:
              pestana === 'NUEVOS'
                ? '/pedidos/[id]/gestionar'
                : '/pedidos/[id]/detalle',
            params: { id: pedido.id },
          });
        }}
      >
        <FichaDeParticipante
          accion={
            <View className="items-end">
              <Text className="text-caption text-text-disabled">
                {cerrado
                  ? formatearFecha(pedido.fechaUltimaTransicion)
                  : tiempoTranscurrido(
                      pestana === 'NUEVOS'
                        ? pedido.fechaCreacion
                        : pedido.fechaUltimaTransicion,
                    )}
              </Text>
              <IconoChevronDerecha className="text-text-disabled" size={18} />
            </View>
          }
          participante={pedido.participante}
          rotulo={pedido.numeroPedido}
        />

        <View className="flex-row items-center justify-between gap-3 px-3 pb-3 pt-1">
          <View className="flex-1">
            <Text className="text-body text-text-primary" numberOfLines={2}>
              {`${String(pedido.primerItem.cantidad)}× ${pedido.primerItem.nombre}`}
            </Text>
            {platosRestantes > 0 ? (
              <Text className="text-caption text-text-secondary">
                {TEXTOS_PEDIDOS.platosAdicionales(platosRestantes)}
              </Text>
            ) : null}
          </View>

          {cerrado ? (
            <EtiquetaDeEstado pedido={pedido} />
          ) : (
            <Text className="text-body font-bold text-text-primary">
              {formatearPrecio(pedido.total)}
            </Text>
          )}
        </View>
      </Pressable>

      <AccionDePestana pedido={pedido} pestana={pestana} />
    </View>
  );
}

/**
 * El botón que corresponde a la pestaña, al pie de la tarjeta.
 *
 * Las pestañas de Preparando y Listos avanzan el pedido SIN salir de la lista,
 * como piden los criterios de US-PED-05 ("presiona 'Listo' en un pedido de la
 * pestaña 'Preparando'"). Rechazados no tiene acción: el pedido terminó.
 */
function AccionDePestana({
  pedido,
  pestana,
}: {
  pedido: PedidoResumen;
  pestana: PestanaPedidosCocinero;
}) {
  switch (pestana) {
    case 'NUEVOS':
      return <AccionVerDetalle pedido={pedido} />;
    case 'PREPARANDO':
      return <AccionMarcarListo pedido={pedido} />;
    case 'LISTOS':
      return <AccionMarcarEntregado pedido={pedido} />;
    case 'COMPLETADOS':
      return <AccionCalificarCliente pedido={pedido} />;
    case 'RECHAZADOS':
      return null;
  }
}

/** Envuelve el botón de acción con la separación del resto de la tarjeta. */
function PieDeAccion({ children }: { children: React.ReactNode }) {
  return <View className="border-t border-border p-3">{children}</View>;
}

/**
 * "El botón Ver detalle" (US-PED-03). Lleva a la pantalla de gestión y no
 * acepta desde acá: aceptar exige elegir el tiempo de preparación.
 */
function AccionVerDetalle({ pedido }: { pedido: PedidoResumen }) {
  return (
    <PieDeAccion>
      <Boton
        onPress={() => {
          router.push({
            pathname: '/pedidos/[id]/gestionar',
            params: { id: pedido.id },
          });
        }}
        tamano="sm"
        variante="secundario"
      >
        {MENSAJES_PEDIDO.verDetalle}
      </Boton>
    </PieDeAccion>
  );
}

/**
 * "El cocinero presiona 'Listo' en un pedido de la pestaña 'Preparando'"
 * (US-PED-05). Sin confirmación: la transición es hacia adelante y no cierra el
 * pedido, así que un toque de más se corrige avanzando o hablando con el
 * cliente. La que sí confirma es la entrega, que es terminal.
 */
function AccionMarcarListo({ pedido }: { pedido: PedidoResumen }) {
  const marcarListo = useMarcarListo();

  return (
    <PieDeAccion>
      <Boton
        cargando={marcarListo.isPending}
        onPress={() => {
          marcarListo.mutate(pedido.id);
        }}
        tamano="sm"
      >
        {MENSAJES_PEDIDO.marcarListo}
      </Boton>
    </PieDeAccion>
  );
}

/**
 * "El cocinero presiona 'Entregado' → muestra en pantalla diálogo de
 * confirmación ('¿Confirmar entrega? opciones: Confirmar, Cancelar')"
 * (US-PED-05).
 *
 * Diálogo severo porque COMPLETADO es terminal: un pedido entregado por error no
 * se puede volver atrás.
 */
function AccionMarcarEntregado({ pedido }: { pedido: PedidoResumen }) {
  const [confirmando, setConfirmando] = useState(false);
  const completar = useCompletarPedido();

  return (
    <PieDeAccion>
      <Boton
        cargando={completar.isPending}
        onPress={() => {
          setConfirmando(true);
        }}
        tamano="sm"
      >
        {MENSAJES_PEDIDO.marcarEntregado}
      </Boton>

      <DialogoSevero
        abierto={confirmando}
        onCancelar={() => {
          setConfirmando(false);
        }}
        onConfirmar={() => {
          completar.mutate(pedido.id, {
            onSettled: () => {
              setConfirmando(false);
            },
          });
        }}
        procesando={completar.isPending}
        textoCancelar={MENSAJES_PEDIDO.confirmarEntregaCancelar}
        textoConfirmar={MENSAJES_PEDIDO.confirmarEntregaConfirmar}
        titulo={MENSAJES_PEDIDO.confirmarEntregaTitulo}
        {...(completar.isError
          ? { error: mensajeDeError(completar.error) }
          : {})}
      />
    </PieDeAccion>
  );
}

/**
 * "Muestre el botón 'Calificar cliente' si el pedido aún no fue calificado"
 * (US-PED-08, PAN-PED-04.3). El módulo de Reseñas todavía no está codificado,
 * así que lleva a su pantalla anunciada.
 */
function AccionCalificarCliente({ pedido }: { pedido: PedidoResumen }) {
  if (!pedido.puedeCalificar) return null;

  return (
    <PieDeAccion>
      <Boton
        onPress={() => {
          router.push('/resenas/calificar-cliente');
        }}
        tamano="sm"
        variante="secundario"
      >
        {MENSAJES_PEDIDO.calificarCliente}
      </Boton>
    </PieDeAccion>
  );
}
