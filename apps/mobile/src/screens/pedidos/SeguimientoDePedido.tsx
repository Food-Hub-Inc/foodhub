import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  MENSAJES_PEDIDO,
  rangoHorarioEstimado,
  type PedidoDetalle,
} from '@foodhub/shared';
import { IconoChevronDerecha, IconoReloj } from '../../components/iconos';
import { SafeAreaView } from '../../components/SafeAreaView';
import { Aviso } from '../../components/ui/Aviso';
import { Boton } from '../../components/ui/Boton';
import { EncabezadoPantalla } from '../../components/ui/EncabezadoPantalla';
import { Esqueleto } from '../../components/ui/Esqueleto';
import { EstadoDeError } from '../../components/ui/EstadoDeError';
import { FondoTenue } from '../../components/ui/FondoTenue';
import { HojaInferior } from '../../components/ui/HojaInferior';
import { useCancelarPedido, usePedido } from '../../hooks/usePedidos';
import { mensajeDeError } from '../../lib/api';
import { formatearHora } from '../../lib/formato';
import { TEXTOS_PEDIDOS } from '../../lib/textos';
import { indicadorDeCierre, motivoVisible } from './estados';
import { BotonMensajesDelPedido } from '../mensajeria/BotonDeMensajes';
import { FichaDeParticipante, FilaDeItem, PasosDelPedido } from './Piezas';
import { SelectorDeMotivo } from './SelectorDeMotivo';

/**
 * Seguimiento del pedido — PAN-PED-03, 03.0, 03.1 y 03.2 · US-PED-02 y
 * US-PED-09.
 *
 * ES LA PANTALLA A LA QUE LLEGA EL CLIENTE AL CONFIRMAR (US-PED-01) y a la que
 * vuelve desde la pestaña "En curso" de su historial. Muestra "el estado
 * actualizado en tiempo real": la consulta se revalida sola cada diez segundos
 * mientras el pedido puede cambiar, y deja de hacerlo en cuanto llega a un
 * estado terminal (ver `usePedido`).
 *
 * CUATRO CARAS DE LA MISMA PANTALLA, según el estado:
 *
 *   CREADO      banner de confirmación + línea de tiempo con "Recibido" activo
 *               + botón "Cancelar pedido"      (PAN-PED-03.0)
 *   ACEPTADO    + el rango horario estimado    (PAN-PED-03)
 *   LISTO       la línea avanza a "Listo"
 *   RECHAZADO   banner con el origen y el motivo, sin línea de tiempo ni botón
 *               de cancelar                    (PAN-PED-03.1 y 03.2)
 *
 * La línea de tiempo de cuatro pasos NO se dibuja para un pedido rechazado: un
 * pedido que no va a avanzar no tiene pasos pendientes que anunciar.
 */
export function SeguimientoDePedido() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const consulta = usePedido(id, true);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <EncabezadoPantalla
        destinoAlternativo="/(cliente)/pedidos"
        titulo={MENSAJES_PEDIDO.seguimiento}
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
          <Esqueleto className="mb-4 h-24 rounded-md" />
          <Esqueleto className="mb-3 h-16 rounded-md" />
          <Esqueleto className="h-40 rounded-md" />
        </View>
      ) : (
        <Contenido pedido={consulta.data} />
      )}
    </SafeAreaView>
  );
}

function Contenido({ pedido }: { pedido: PedidoDetalle }) {
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const rechazado = pedido.estado === 'RECHAZADO';

  return (
    <>
      <ScrollView contentContainerClassName="px-4 py-4 gap-4">
        {rechazado ? (
          <BannerDeCierre pedido={pedido} />
        ) : (
          <BannerDeConfirmacion pedido={pedido} />
        )}

        <FichaDeParticipante conValoracion participante={pedido.participante} />

        <View className="overflow-hidden rounded-md border border-border bg-surface">
          {pedido.items.map((item) => (
            <FilaDeItem item={item} key={item.id} />
          ))}
        </View>

        <TiempoEstimado pedido={pedido} />

        {rechazado ? null : (
          <PasosDelPedido alcanzados={pasosAlcanzados(pedido)} />
        )}

        <Pressable
          accessibilityRole="link"
          className="min-h-11 flex-row items-center justify-center gap-1"
          onPress={() => {
            router.push({
              pathname: '/pedidos/[id]/detalle',
              params: { id: pedido.id },
            });
          }}
        >
          <Text className="text-body font-bold text-primary">
            {MENSAJES_PEDIDO.verDetalleDelPedido}
          </Text>
          <IconoChevronDerecha className="text-primary" size={18} />
        </Pressable>

        {/* "Mensaje en chat con cocinero → PAN-MSG-02" (PAN-PED-03) y primer
            criterio de US-MSG-06: "Muestre un botón 'Mensajes del pedido' que
            redirige al hilo de chat asociado a ese pedido específico", con el
            contador de no leídos encima. El hilo es el del par cliente-cocinero
            del pedido: sigue accesible cuando el pedido se completa o se
            cancela, que es el cuarto criterio de la misma historia. */}
        <BotonMensajesDelPedido participanteId={pedido.participante.id} />
      </ScrollView>

      {/* "Muestre el botón 'Cancelar pedido' visible y habilitado, siempre que no
          haya transcurrido el tiempo máximo de cancelación" (US-PED-09). Lo
          decide el servidor con `puedeCancelar`: el reloj del teléfono se puede
          adelantar. */}
      {pedido.puedeCancelar ? (
        <View className="border-t border-border bg-surface px-4 pb-2 pt-3">
          <Boton
            onPress={() => {
              setDialogoAbierto(true);
            }}
            variante="destructivo"
          >
            {MENSAJES_PEDIDO.cancelarPedido}
          </Boton>
        </View>
      ) : null}

      <DialogoDeCancelacion
        abierto={dialogoAbierto}
        onCerrar={() => {
          setDialogoAbierto(false);
        }}
        pedidoId={pedido.id}
      />
    </>
  );
}

/**
 * Cuántos de los cuatro pasos ya ocurrieron.
 *
 * Se calcula del ESTADO ACTUAL y no contando el historial: la línea de tiempo de
 * PAN-PED-03 marca hasta dónde llegó el pedido, y el historial puede tener más
 * filas que pasos (por ejemplo si alguna vez se agrega una transición
 * intermedia).
 */
function pasosAlcanzados(pedido: PedidoDetalle): number {
  switch (pedido.estado) {
    case 'CREADO':
      return 1;
    case 'ACEPTADO':
      return 2;
    case 'LISTO':
      return 3;
    case 'COMPLETADO':
      return 4;
    case 'RECHAZADO':
      return 0;
  }
}

/**
 * Banner de la parte de arriba mientras el pedido vive (PAN-PED-03.0).
 *
 * El literal es "¡Pedido confirmado!" en los dos estados iniciales: la
 * maquetación escribe "¡Pedido enviado!" en PAN-PED-03.0, pero el criterio de
 * aceptación de US-PED-02 fija el otro y manda el documento.
 */
function BannerDeConfirmacion({ pedido }: { pedido: PedidoDetalle }) {
  return (
    <View className="items-center overflow-hidden rounded-md p-4">
      <FondoTenue className="bg-primary" />
      <Text className="text-h1 font-extrabold text-primary">
        {MENSAJES_PEDIDO.pedidoConfirmado}
      </Text>
      <Text className="mt-1 text-body font-semibold text-text-primary">
        {pedido.numeroPedido}
      </Text>
      {pedido.estado === 'CREADO' ? (
        <Text className="mt-1 text-caption text-text-secondary">
          {MENSAJES_PEDIDO.esperandoConfirmacion}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Banner de un pedido que terminó (PAN-PED-03.1 y PAN-PED-03.2).
 *
 * "Muestre el estado 'Rechazado por el cocinero' con el mensaje de motivo
 * ingresado por el cocinero", o "'Cancelado por vos', el motivo ingresado por el
 * cliente si fue proporcionado".
 *
 * El tono es de error solo cuando rechazó el cocinero: una cancelación propia o
 * una expiración no son un error del que haya que alertar, y el rojo está
 * reservado para eso en la guía visual.
 */
function BannerDeCierre({ pedido }: { pedido: PedidoDetalle }) {
  const motivo = motivoVisible(pedido);

  return (
    <View className="gap-2">
      <Aviso
        mensaje={indicadorDeCierre(pedido)}
        tono={pedido.origenRechazo === 'COCINERO' ? 'error' : 'informativo'}
      />
      {motivo !== null ? (
        <View className="rounded-md border border-border bg-surface p-3">
          <Text className="text-body text-text-primary">{motivo}</Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * "Tiempo estimado de preparación como rango horario (ej. 'Estimado 9:45 – 9:55
 * hs')" (US-PED-02).
 *
 * Solo aparece con el pedido aceptado o en preparación: antes de que el cocinero
 * responda no hay nada comprometido, y una vez entregado el dato ya no sirve.
 */
function TiempoEstimado({ pedido }: { pedido: PedidoDetalle }) {
  if (pedido.estado !== 'ACEPTADO' && pedido.estado !== 'LISTO') return null;

  const rango = rangoHorarioEstimado(
    pedido.fechaAceptacion === null ? null : new Date(pedido.fechaAceptacion),
    pedido.tiempoEstimadoPreparacionMin,
  );
  if (!rango) return null;

  return (
    <View className="flex-row items-center gap-3 overflow-hidden rounded-md p-3">
      <FondoTenue className="bg-warning" />
      <IconoReloj className="text-warning" size={20} />
      <View className="flex-1">
        <Text className="text-caption font-bold uppercase text-warning">
          {MENSAJES_PEDIDO.tiempoEstimado}
        </Text>
        <Text className="text-body font-bold text-text-primary">
          {MENSAJES_PEDIDO.rangoEstimado(
            formatearHora(rango.desde),
            formatearHora(rango.hasta),
          )}
        </Text>
      </View>
    </View>
  );
}

/**
 * Diálogo de cancelación — PAN-PED-03.0.1 · US-PED-09.
 *
 * "Título '¿Cancelar pedido?', listado opcional de motivos rápidos, campo de
 * texto opcional con placeholder 'Contale al cocinero por qué cancelás
 * (opcional)', y los botones 'Sí, cancelar' y 'Volver'."
 *
 * VA COMO HOJA INFERIOR y no como modal centrado, igual que el resto de las
 * confirmaciones de la app: en un teléfono el pulgar llega cómodo a la mitad de
 * abajo (ver `HojaInferior`).
 *
 * "El cliente presiona 'Volver' → cierre el diálogo sin realizar ningún cambio":
 * por eso cerrar no dispara nada, y el motivo escrito se pierde a propósito. Un
 * borrador guardado haría que la próxima apertura mostrara un texto que el
 * cliente ya decidió no mandar.
 */
function DialogoDeCancelacion({
  abierto,
  onCerrar,
  pedidoId,
}: {
  abierto: boolean;
  onCerrar: () => void;
  pedidoId: string;
}) {
  const [motivoId, setMotivoId] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const cancelar = useCancelarPedido();

  const cerrar = () => {
    setMotivoId(null);
    setTexto('');
    cancelar.reset();
    onCerrar();
  };

  return (
    <HojaInferior
      abierta={abierto}
      etiquetaAccesible={MENSAJES_PEDIDO.cancelarPedidoTitulo}
      onCerrar={cerrar}
    >
      <View className="gap-4 px-4 pb-2">
        <Text
          accessibilityRole="header"
          className="text-h2 font-bold text-text-primary"
        >
          {MENSAJES_PEDIDO.cancelarPedidoTitulo}
        </Text>

        <SelectorDeMotivo
          etiquetaTexto={TEXTOS_PEDIDOS.motivoDeLaCancelacion}
          motivoId={motivoId}
          onCambiarMotivo={setMotivoId}
          onCambiarTexto={setTexto}
          placeholder={MENSAJES_PEDIDO.cancelarPedidoPlaceholder}
          texto={texto}
        />

        {cancelar.isError ? (
          <Aviso mensaje={mensajeDeError(cancelar.error)} tono="error" />
        ) : null}

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Boton onPress={cerrar} variante="secundario">
              {MENSAJES_PEDIDO.cancelarPedidoVolver}
            </Boton>
          </View>
          <View className="flex-1">
            <Boton
              cargando={cancelar.isPending}
              onPress={() => {
                cancelar.mutate(
                  {
                    pedidoId,
                    ...(motivoId ? { motivoCancelacionId: motivoId } : {}),
                    ...(texto.trim() ? { motivoTexto: texto.trim() } : {}),
                  },
                  { onSuccess: cerrar },
                );
              }}
              variante="destructivo"
            >
              {MENSAJES_PEDIDO.cancelarPedidoConfirmar}
            </Boton>
          </View>
        </View>
      </View>
    </HojaInferior>
  );
}
