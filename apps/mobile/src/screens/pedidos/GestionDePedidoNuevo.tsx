import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  MENSAJES_PEDIDO,
  TIEMPOS_ESTIMADOS_PREPARACION,
  type PedidoDetalle,
} from '@foodhub/shared';
import { IconoReloj } from '../../components/iconos';
import { SafeAreaView } from '../../components/SafeAreaView';
import { Aviso } from '../../components/ui/Aviso';
import { Boton } from '../../components/ui/Boton';
import { EncabezadoPantalla } from '../../components/ui/EncabezadoPantalla';
import { Esqueleto } from '../../components/ui/Esqueleto';
import { EstadoDeError } from '../../components/ui/EstadoDeError';
import { FondoTenue } from '../../components/ui/FondoTenue';
import { MensajeDeCampo } from '../../components/ui/MensajeDeCampo';
import { useAceptarPedido, usePedido } from '../../hooks/usePedidos';
import { mensajeDeError } from '../../lib/api';
import { formatearHora, formatearPrecio } from '../../lib/formato';
import { FichaDeParticipante, FilaDeItem } from './Piezas';

/**
 * Gestión de un pedido nuevo — PAN-PED-04.4 y 04.4.1 · US-PED-03.
 *
 * "Navegue a la pantalla de gestión del pedido mostrando: número de pedido, foto
 * y nombre del cliente, nombre e imagen del plato pedido con precio, cantidad y
 * nota opcional del cliente (si fue ingresada), selector de tiempo estimado de
 * preparación, precio final de pedido y los botones Rechazar y Aceptar."
 *
 * EL BOTÓN "ACEPTAR" NO SE DESHABILITA SIN TIEMPO ELEGIDO, y eso es deliberado:
 * el quinto criterio pide que al presionarlo sin haber seleccionado nada
 * "muestre un mensaje de validación: 'Seleccioná el tiempo estimado de
 * preparación'. El pedido no se acepte y el cocinero permanezca en la pantalla"
 * (PAN-PED-04.4.1). Un botón gris no muestra ningún mensaje: el cocinero se
 * quedaría mirando la pantalla sin saber qué le falta.
 *
 * EL PEDIDO SE SIGUE EN VIVO mientras esta pantalla está abierta. Si el cliente
 * lo cancela (US-PED-09) o expira (US-PED-10) mientras el cocinero decide, la
 * pantalla lo detecta sola y reemplaza las acciones por el aviso de que ya no
 * está en Creado, en lugar de dejarlo aceptar algo que ya no existe.
 */
export function GestionDePedidoNuevo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const consulta = usePedido(id, true);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <EncabezadoPantalla
        destinoAlternativo="/(cocinero)/pedidos"
        titulo={consulta.data?.numeroPedido ?? MENSAJES_PEDIDO.nuevoPedido}
      />

      {consulta.isError ? (
        <EstadoDeError
          mensaje={mensajeDeError(consulta.error)}
          onReintentar={() => {
            void consulta.refetch();
          }}
        />
      ) : consulta.isPending ? (
        <View className="px-4 pt-3">
          <Esqueleto className="mb-3 h-16 rounded-md" />
          <Esqueleto className="mb-3 h-20 rounded-md" />
          <Esqueleto className="h-32 rounded-md" />
        </View>
      ) : (
        <Contenido pedido={consulta.data} />
      )}
    </SafeAreaView>
  );
}

/**
 * Lo que el cocinero eligió en el selector.
 *
 * `horaListo` se calcula EN EL MOMENTO DE ELEGIR y se guarda con el valor: es
 * una referencia para dimensionar el compromiso ("Listo aproximadamente a las
 * 14:42 hs"), no un reloj que deba correr. Calcularla en cada render además
 * leería `Date.now()` durante el renderizado, que React trata como impureza.
 */
interface TiempoElegido {
  minutos: number;
  horaListo: string;
}

function Contenido({ pedido }: { pedido: PedidoDetalle }) {
  const [elegido, setElegido] = useState<TiempoElegido | null>(null);
  const [errorDeTiempo, setErrorDeTiempo] = useState<string | undefined>();
  const aceptar = useAceptarPedido();

  const esNuevo = pedido.estado === 'CREADO';

  const confirmarAceptacion = () => {
    if (elegido === null) {
      setErrorDeTiempo(MENSAJES_PEDIDO.seleccionaTiempoPreparacion);
      return;
    }

    aceptar.mutate(
      { pedidoId: pedido.id, tiempoEstimadoPreparacionMin: elegido.minutos },
      {
        onSuccess: () => {
          router.replace('/(cocinero)/pedidos');
        },
      },
    );
  };

  return (
    <>
      <ScrollView contentContainerClassName="px-4 py-4 gap-4">
        <Text className="text-caption text-text-secondary">
          {MENSAJES_PEDIDO.nuevoPedido}
        </Text>

        <FichaDeParticipante conValoracion participante={pedido.participante} />

        <View className="overflow-hidden rounded-md border border-border bg-surface">
          {pedido.items.map((item) => (
            <FilaDeItem item={item} key={item.id} />
          ))}
        </View>

        <NotaDelCliente nota={pedido.instruccionesCliente} />

        {esNuevo ? (
          <SelectorDeTiempo
            elegido={elegido}
            error={errorDeTiempo}
            onCambiar={(valor) => {
              setElegido(valor);
              setErrorDeTiempo(undefined);
            }}
          />
        ) : (
          /* El pedido dejó de estar en Creado mientras esta pantalla estaba
             abierta: lo canceló el cliente o lo expiró el sistema. */
          <Aviso mensaje={MENSAJES_PEDIDO.transicionInvalida} tono="error" />
        )}

        <View className="flex-row items-center justify-between rounded-md border border-border bg-surface p-3">
          <Text className="text-body text-text-secondary">
            {MENSAJES_PEDIDO.totalDelPedido}
          </Text>
          <Text className="text-h2 font-extrabold text-text-primary">
            {formatearPrecio(pedido.total)}
          </Text>
        </View>

        {aceptar.isError ? (
          <Aviso mensaje={mensajeDeError(aceptar.error)} tono="error" />
        ) : null}
      </ScrollView>

      {esNuevo ? (
        <AccionesDelPedidoNuevo
          aceptando={aceptar.isPending}
          onAceptar={confirmarAceptacion}
          pedidoId={pedido.id}
        />
      ) : null}
    </>
  );
}

/** "Nota opcional del cliente (si fue ingresada)" (US-PED-03). */
function NotaDelCliente({ nota }: { nota: string | null }) {
  if (nota === null) return null;

  return (
    <View className="overflow-hidden rounded-md p-3">
      <FondoTenue className="bg-primary" />
      <Text className="mb-1 text-caption font-bold uppercase text-warning">
        {MENSAJES_PEDIDO.notaDelCliente}
      </Text>
      <Text className="text-body text-text-primary">{nota}</Text>
    </View>
  );
}

/**
 * Pie con "Rechazar" y "Aceptar" (PAN-PED-04.4).
 *
 * "Aceptar" ocupa el doble de ancho: es la acción principal y la que el cocinero
 * usa en la mayoría de los pedidos. Rechazar abre su propia pantalla, donde el
 * motivo es obligatorio (US-PED-04).
 */
function AccionesDelPedidoNuevo({
  pedidoId,
  onAceptar,
  aceptando,
}: {
  pedidoId: string;
  onAceptar: () => void;
  aceptando: boolean;
}) {
  return (
    <View className="flex-row gap-3 border-t border-border bg-surface px-4 pb-2 pt-3">
      <View className="flex-1">
        <Boton
          onPress={() => {
            router.push({
              pathname: '/pedidos/[id]/rechazar',
              params: { id: pedidoId },
            });
          }}
          variante="destructivo"
        >
          {MENSAJES_PEDIDO.rechazar}
        </Boton>
      </View>
      <View className="flex-[2]">
        <Boton cargando={aceptando} onPress={onAceptar}>
          {MENSAJES_PEDIDO.aceptar}
        </Boton>
      </View>
    </View>
  );
}

/**
 * Selector del tiempo estimado de preparación (PAN-PED-04.4).
 *
 * Las opciones -20, 30, 45 minutos y 1 hora- salen de la ficha de la
 * maquetación; el criterio de aceptación habla de "las opciones disponibles" sin
 * enumerarlas, así que son la única fuente y viven en
 * `TIEMPOS_ESTIMADOS_PREPARACION` para que la API valide exactamente las mismas.
 *
 * Se dibuja como cuatro botones y no como la rueda del mockup: una rueda de
 * cuatro valores obliga a un gesto de arrastre para elegir entre opciones que
 * entran todas en pantalla, y además esconde las que no están centradas.
 *
 * "Listo aproximadamente a las 14:42 hs" se calcula sobre el reloj DEL MOMENTO
 * DE ELEGIR, no sobre la aceptación: es una referencia para que el cocinero
 * dimensione el compromiso antes de asumirlo. El rango definitivo que ve el
 * cliente se calcula desde la aceptación real (US-PED-02).
 */
function SelectorDeTiempo({
  elegido,
  onCambiar,
  error,
}: {
  elegido: TiempoElegido | null;
  onCambiar: (elegido: TiempoElegido) => void;
  error?: string | undefined;
}) {
  return (
    <View className="gap-2">
      <Text className="text-label font-semibold text-text-primary">
        {MENSAJES_PEDIDO.tiempoEstimadoDePreparacion}
      </Text>

      <View className="flex-row flex-wrap gap-2">
        {TIEMPOS_ESTIMADOS_PREPARACION.map((opcion) => {
          const seleccionada = opcion === elegido?.minutos;

          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: seleccionada }}
              className={`min-h-11 flex-1 items-center justify-center overflow-hidden rounded-md border px-3 ${
                seleccionada ? 'border-primary' : 'border-border'
              }`}
              key={opcion}
              onPress={() => {
                onCambiar({
                  minutos: opcion,
                  horaListo: formatearHora(
                    new Date(Date.now() + opcion * 60_000),
                  ),
                });
              }}
            >
              {seleccionada ? <FondoTenue className="bg-primary" /> : null}
              <Text
                className={`text-body ${
                  seleccionada
                    ? 'font-bold text-primary'
                    : 'text-text-secondary'
                }`}
              >
                {`${String(opcion)} min`}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {elegido !== null ? (
        <View className="flex-row items-center gap-2">
          <IconoReloj className="text-warning" size={16} />
          <Text className="text-caption text-text-secondary">
            {MENSAJES_PEDIDO.listoAproximadamenteALas(elegido.horaListo)}
          </Text>
        </View>
      ) : null}

      <MensajeDeCampo idCampo="tiempo-estimado" mensaje={error} />
    </View>
  );
}
