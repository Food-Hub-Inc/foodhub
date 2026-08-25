import { ScrollView, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import {
  MENSAJES_PEDIDO,
  type EventoPedido,
  type ItemPedido,
  type ParticipantePedido,
  type PedidoResumen,
} from '@foodhub/shared';
import { IconoTilde, IconoUsuario } from '../../components/iconos';
import { FondoTenue } from '../../components/ui/FondoTenue';
import { formatearHora, formatearPrecio } from '../../lib/formato';
import { TEXTOS_PEDIDOS } from '../../lib/textos';
import { MiniaturaDePlato, Valoracion } from '../exploracion/Piezas';
import {
  PASOS_DEL_SEGUIMIENTO,
  etiquetaDeEstado,
  tonoDeEstado,
} from './estados';

/**
 * Piezas visuales compartidas por las seis pantallas del módulo de Pedidos.
 *
 * Van juntas por el mismo motivo que `exploracion/Piezas.tsx`: ninguna llega a
 * media pantalla de código y todas se usan en al menos tres lugares. El badge de
 * estado aparece en las dos bandejas y en los dos detalles; la línea de tiempo,
 * en el seguimiento y en los detalles de las dos partes.
 *
 * `MiniaturaDePlato` y `Valoracion` se importan de Exploración en lugar de
 * copiarse: son exactamente el mismo componente -la miniatura con respaldo y la
 * estrella con "Sin calificaciones aún"- y duplicarlos haría que un cambio de la
 * guía visual se aplicara en un módulo y no en el otro.
 *
 * Todas son PRESENTACIONALES: ninguna sabe de react-query ni de mutaciones.
 */

/**
 * Badge del estado del pedido.
 *
 * El color NUNCA es el único canal: siempre lleva la etiqueta en texto, que
 * además es la que distingue las tres formas de terminar rechazado ("Cancelado
 * por vos", "Rechazado por el cocinero", "Expirado - sin respuesta del
 * cocinero"), indistinguibles por color porque dos de las tres comparten tono.
 */
export function EtiquetaDeEstado({ pedido }: { pedido: PedidoResumen }) {
  const tono = tonoDeEstado(pedido);

  return (
    <View className="self-start overflow-hidden rounded-full px-2.5 py-1">
      <FondoTenue className={tono.fondo} />
      <Text className={`text-caption font-semibold ${tono.texto}`}>
        {etiquetaDeEstado(pedido)}
      </Text>
    </View>
  );
}

/** Una pestaña, con su rótulo y el contador de pedidos que hay en ella. */
export interface OpcionDePestana<T extends string> {
  valor: T;
  etiqueta: string;
  /**
   * Contador que acompana a la etiqueta. OPCIONAL, por dos motivos que
   * aparecieron por separado y llevan a lo mismo:
   *
   *   Los filtros del listado de conversaciones (US-MSG-04) son dos vistas del
   *   mismo conjunto, no dos grupos con cantidades distintas: mostrarles un
   *   contador -aunque fuera cero- diria algo que el criterio no pide y que
   *   ademas seria falso.
   *
   *   El perfil publico del cocinero lo reusa para "Platos disponibles" /
   *   "Resenas" (US-RES-03), donde la maquetacion no dibuja ningun numero.
   *
   * Las cinco pestanas de la bandeja de pedidos si lo exigen: "cada pestana
   * muestre un contador con la cantidad de pedidos en ese estado".
   */
  cantidad?: number;
}

/**
 * Barra de pestañas con contador (US-PED-03: "cada pestaña muestre un contador
 * con la cantidad de pedidos en ese estado").
 *
 * DESPLAZABLE EN HORIZONTAL porque el cocinero tiene CINCO pestañas y no entran
 * en el ancho de un teléfono sin recortar los rótulos, que son literales del
 * documento y no se pueden abreviar. Así se ve también en PAN-PED-04, que dibuja
 * la barra con su indicador de desplazamiento. Con las tres del cliente no llega
 * a desplazarse, y el mismo componente sirve para las dos pantallas.
 *
 * El contador se oculta cuando es cero: una pestaña vacía ya se explica sola con
 * su estado vacío, y un "0" al lado del rótulo compite con los contadores que sí
 * importan.
 */
export function Pestanas<T extends string>({
  opciones,
  activa,
  onCambiar,
}: {
  opciones: readonly OpcionDePestana<T>[];
  activa: T;
  onCambiar: (valor: T) => void;
}) {
  return (
    <View className="border-b border-border bg-surface">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole="tablist"
        accessibilityLabel={TEXTOS_PEDIDOS.pestanasDePedidos}
      >
        {opciones.map((opcion) => {
          const seleccionada = opcion.valor === activa;
          const cantidad = opcion.cantidad;

          return (
            <Pressable
              accessibilityLabel={
                cantidad === undefined
                  ? opcion.etiqueta
                  : `${opcion.etiqueta}. ${TEXTOS_PEDIDOS.cantidadDePedidos(cantidad)}`
              }
              accessibilityRole="tab"
              accessibilityState={{ selected: seleccionada }}
              className={`min-h-14 flex-row items-center gap-2 border-b-2 px-4 ${
                seleccionada ? 'border-primary' : 'border-transparent'
              }`}
              key={opcion.valor}
              onPress={() => {
                onCambiar(opcion.valor);
              }}
            >
              <Text
                className={`text-body ${
                  seleccionada
                    ? 'font-bold text-primary'
                    : 'text-text-secondary'
                }`}
              >
                {opcion.etiqueta}
              </Text>

              {cantidad !== undefined && cantidad > 0 ? (
                <View className="min-w-6 items-center overflow-hidden rounded-full px-1.5 py-0.5">
                  <FondoTenue
                    className={seleccionada ? 'bg-primary' : 'bg-secondary'}
                  />
                  <Text
                    className={`text-caption font-bold ${
                      seleccionada ? 'text-primary' : 'text-text-secondary'
                    }`}
                  >
                    {String(cantidad)}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** Avatar de una persona: su foto, o el ícono de usuario si no tiene. */
export function AvatarDeParticipante({
  fotoPerfilUrl,
  tamano = 'h-11 w-11',
}: {
  fotoPerfilUrl: string | null;
  tamano?: string;
}) {
  return (
    <View
      className={`items-center justify-center overflow-hidden rounded-full bg-background ${tamano}`}
    >
      {fotoPerfilUrl ? (
        <Image
          contentFit="cover"
          source={{ uri: fotoPerfilUrl }}
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        <IconoUsuario className="text-text-disabled" size={22} />
      )}
    </View>
  );
}

/**
 * Ficha de la otra parte del pedido.
 *
 * Sirve para los dos sentidos -el cliente ve al cocinero, el cocinero al
 * cliente- porque las dos pantallas muestran lo mismo. La valoración es
 * opcional: PAN-PED-04.6 y PAN-PED-06 la muestran, la tarjeta de un pedido nuevo
 * no.
 */
export function FichaDeParticipante({
  participante,
  rotulo,
  conValoracion = false,
  accion,
}: {
  participante: ParticipantePedido;
  rotulo?: string;
  conValoracion?: boolean;
  accion?: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center gap-3 rounded-md border border-border bg-surface p-3">
      <AvatarDeParticipante fotoPerfilUrl={participante.fotoPerfilUrl} />

      <View className="flex-1">
        <Text className="text-body font-bold text-text-primary">
          {`${participante.nombre} ${participante.apellido}`}
        </Text>

        {conValoracion ? (
          <Valoracion promedio={participante.valoracionPromedio} />
        ) : rotulo !== undefined ? (
          <Text className="text-caption text-text-secondary">{rotulo}</Text>
        ) : null}
      </View>

      {accion}
    </View>
  );
}

/** Una línea del pedido: miniatura, nombre, cantidad y su importe. */
export function FilaDeItem({ item }: { item: ItemPedido }) {
  return (
    <View className="flex-row items-center gap-3 border-t border-border px-3 py-3">
      <MiniaturaDePlato
        className="h-14 w-14 rounded-sm"
        imagenDeCategoria={null}
        imagenUrl={item.imagenUrl}
      />

      <View className="flex-1">
        <Text className="text-body font-semibold text-text-primary">
          {item.nombre}
        </Text>
        <Text className="text-caption text-text-secondary">
          {MENSAJES_PEDIDO.cantidad(item.cantidad)}
        </Text>
      </View>

      {/* El importe de la línea, no el precio unitario: es lo que suma al total
          que el cliente ve al pie, y mostrar el unitario obligaría a multiplicar
          mentalmente para cuadrarlo. */}
      <Text className="text-body font-bold text-text-primary">
        {formatearPrecio(
          (Number(item.precioUnitario) * item.cantidad).toFixed(2),
        )}
      </Text>
    </View>
  );
}

/**
 * Línea de tiempo cronológica del pedido (US-PED-07).
 *
 * "Línea de tiempo cronológica con todos los eventos del pedido registrados
 * (nombre del evento, horario)". Muestra TODOS los eventos del historial, sin
 * filtrar: si el pedido fue rechazado o expiró, ese evento también aparece con
 * su hora, que es lo que piden PAN-PED-06.2 y PAN-PED-06.4.
 *
 * El nombre de cada evento sale de la leyenda del estado al que se pasó, con la
 * traducción del CLIENTE: es la que fija US-PED-02 y la única que el documento
 * define para la línea de tiempo.
 */
export function LineaDeTiempo({
  historial,
  nombreDelEvento,
}: {
  historial: readonly EventoPedido[];
  nombreDelEvento: (evento: EventoPedido) => string;
}) {
  return (
    <View className="rounded-md border border-border bg-surface p-3">
      <Text className="mb-2 text-caption font-bold uppercase text-text-secondary">
        {MENSAJES_PEDIDO.lineaDeTiempo}
      </Text>

      {historial.map((evento, indice) => (
        <View className="flex-row items-center gap-3 py-1.5" key={evento.id}>
          <View className="items-center">
            <View className="h-6 w-6 items-center justify-center rounded-full bg-primary">
              <IconoTilde className="text-surface" size={14} />
            </View>
            {indice < historial.length - 1 ? (
              <View className="h-3 w-0.5 bg-border" />
            ) : null}
          </View>

          <Text className="flex-1 text-body text-text-primary">
            {nombreDelEvento(evento)}
          </Text>
          <Text className="text-caption text-text-secondary">
            {`${formatearHora(evento.fecha)} hs`}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Las cuatro leyendas secuenciales del seguimiento (US-PED-02, PAN-PED-03).
 *
 * "Una línea de tiempo con cuatro leyendas visuales secuenciales: Recibido,
 * Preparando, Listo y Entregado. Los estados futuros se muestran en gris o
 * inactivos."
 *
 * Es distinta de `LineaDeTiempo`: esta muestra los cuatro pasos SIEMPRE,
 * incluidos los que todavía no pasaron, porque su función es decirle al cliente
 * qué falta. La otra muestra lo que efectivamente ocurrió, con horarios.
 *
 * NO SE DIBUJA PARA UN PEDIDO RECHAZADO: un pedido que no va a avanzar no tiene
 * pasos pendientes que anunciar, y la pantalla lo reemplaza por el banner del
 * motivo (PAN-PED-03.1 y PAN-PED-03.2).
 */
export function PasosDelPedido({ alcanzados }: { alcanzados: number }) {
  return (
    <View className="rounded-md border border-border bg-surface p-3">
      {PASOS_DEL_SEGUIMIENTO.map((paso, indice) => {
        const cumplido = indice < alcanzados;
        const actual = indice === alcanzados - 1;

        return (
          <View
            className="flex-row items-center gap-3 py-1.5"
            key={paso.estado}
          >
            <View className="items-center">
              <View
                className={`h-7 w-7 items-center justify-center rounded-full ${
                  cumplido ? 'bg-primary' : 'border border-border bg-surface'
                }`}
              >
                {cumplido ? (
                  <IconoTilde className="text-surface" size={15} />
                ) : null}
              </View>
              {indice < PASOS_DEL_SEGUIMIENTO.length - 1 ? (
                <View
                  className={`h-3 w-0.5 ${cumplido ? 'bg-primary' : 'bg-border'}`}
                />
              ) : null}
            </View>

            <Text
              className={`text-body ${
                actual
                  ? 'font-bold text-text-primary'
                  : cumplido
                    ? 'text-text-primary'
                    : 'text-text-disabled'
              }`}
            >
              {paso.leyenda}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
