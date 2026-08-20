import { ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  MENSAJES_PEDIDO,
  type EventoPedido,
  type PedidoDetalle,
} from '@foodhub/shared';
import { IconoTildeCirculo } from '../../components/iconos';
import { SafeAreaView } from '../../components/SafeAreaView';
import { Aviso } from '../../components/ui/Aviso';
import { Boton } from '../../components/ui/Boton';
import { EncabezadoPantalla } from '../../components/ui/EncabezadoPantalla';
import { Esqueleto } from '../../components/ui/Esqueleto';
import { EstadoDeError } from '../../components/ui/EstadoDeError';
import { usePedido } from '../../hooks/usePedidos';
import { usePerfil } from '../../hooks/usePerfil';
import { mensajeDeError } from '../../lib/api';
import { formatearFecha, formatearPrecio } from '../../lib/formato';
import { TEXTOS_PEDIDOS } from '../../lib/textos';
import {
  PASOS_DEL_SEGUIMIENTO,
  encabezadoDeCierre,
  indicadorDeCierre,
  motivoVisible,
} from './estados';
import { FichaDeParticipante, FilaDeItem, LineaDeTiempo } from './Piezas';

/**
 * Detalle del pedido — PAN-PED-06 y sus cuatro variantes (US-PED-07) para el
 * cliente, PAN-PED-04.6 (US-PED-08) para el cocinero.
 *
 * UNA SOLA PANTALLA PARA LOS DOS ROLES. Los dos criterios enumeran lo mismo
 * -número de pedido, la otra parte con su calificación, los platos con su
 * cantidad y precio, la línea de tiempo con horarios y el precio final-, y lo
 * único que cambia es el botón del final: "Dejar reseña" para el cliente,
 * "Calificar cliente" para el cocinero. Dos pantallas gemelas se habrían ido
 * separando en cuanto una de las dos recibiera un ajuste.
 *
 * LAS CUATRO VARIANTES DEL CLIENTE se resuelven con el encabezado y el banner,
 * no con cuatro pantallas:
 *
 *   Completado sin reseña   botón "Dejar reseña" prominente     (PAN-PED-06)
 *   Completado con reseña   "Ya calificaste este pedido"        (PAN-PED-06.1)
 *   Rechazado por cocinero  encabezado "Pedido rechazado" + motivo íntegro
 *                                                               (PAN-PED-06.2)
 *   Cancelado por el cliente "Pedido cancelado" + su motivo      (PAN-PED-06.3)
 *   Expirado                "Pedido expirado" + el evento en la línea de tiempo
 *                                                               (PAN-PED-06.4)
 *
 * NO REFRESCA SOLO: es la vista de rendición de cuentas de un pedido, no el
 * seguimiento. Un pedido activo abierto desde acá se puede ver igual, pero quien
 * quiere ver el estado moverse entra por PAN-PED-03.
 */
export function DetalleDePedido() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const consulta = usePedido(id);
  const perfil = usePerfil();
  const esCocinero = perfil.data?.tipo === 'COCINERO';

  return (
    <SafeAreaView className="flex-1 bg-background">
      <EncabezadoPantalla
        destinoAlternativo={
          esCocinero ? '/(cocinero)/pedidos' : '/(cliente)/pedidos'
        }
        titulo={
          consulta.data
            ? tituloDelDetalle(consulta.data)
            : MENSAJES_PEDIDO.misPedidos
        }
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
          <Esqueleto className="mb-3 h-24 rounded-md" />
          <Esqueleto className="h-40 rounded-md" />
        </View>
      ) : (
        <Contenido esCocinero={esCocinero} pedido={consulta.data} />
      )}
    </SafeAreaView>
  );
}

/**
 * Título de la pantalla.
 *
 * Un pedido que terminó mal lleva el encabezado que fija US-PED-07 ("Pedido
 * rechazado", "Pedido cancelado", "Pedido expirado"); el resto muestra el número
 * de pedido, como PAN-PED-06.
 */
function tituloDelDetalle(pedido: PedidoDetalle): string {
  return pedido.estado === 'RECHAZADO'
    ? encabezadoDeCierre(pedido)
    : pedido.numeroPedido;
}

function Contenido({
  pedido,
  esCocinero,
}: {
  pedido: PedidoDetalle;
  esCocinero: boolean;
}) {
  const motivo = motivoVisible(pedido);

  return (
    <ScrollView contentContainerClassName="px-4 py-4 gap-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-body font-bold text-text-primary">
          {pedido.numeroPedido}
        </Text>
        <Text className="text-caption text-text-secondary">
          {formatearFecha(pedido.fechaCreacion)}
        </Text>
      </View>

      {/* "El mensaje de motivo enviado por el cocinero de forma íntegra y
          destacada" (US-PED-07). Va arriba de todo: es la primera pregunta que
          el cliente trae al abrir un pedido que no llegó a destino. */}
      {pedido.estado === 'RECHAZADO' ? (
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
      ) : null}

      <FichaDeParticipante
        conValoracion
        participante={pedido.participante}
        rotulo={esCocinero ? TEXTOS_PEDIDOS.cliente : TEXTOS_PEDIDOS.cocinero}
      />

      <View className="overflow-hidden rounded-md border border-border bg-surface">
        <Text className="px-3 pt-3 text-caption font-bold uppercase text-text-secondary">
          {TEXTOS_PEDIDOS.platosDelPedido}
        </Text>
        {pedido.items.map((item) => (
          <FilaDeItem item={item} key={item.id} />
        ))}
      </View>

      {/* "Nota opcional del cliente (si fue ingresada)" (US-PED-03 y US-PED-08).
          Se muestra también del lado del cliente: es lo que él mismo escribió y
          US-PED-07 pide el detalle completo de la transacción. */}
      {pedido.instruccionesCliente !== null ? (
        <View className="rounded-md border border-border bg-surface p-3">
          <Text className="mb-1 text-caption font-bold uppercase text-text-secondary">
            {MENSAJES_PEDIDO.notaDelCliente}
          </Text>
          <Text className="text-body text-text-primary">
            {pedido.instruccionesCliente}
          </Text>
        </View>
      ) : null}

      <LineaDeTiempo
        historial={pedido.historial}
        nombreDelEvento={nombreDelEvento}
      />

      <View className="flex-row items-center justify-between rounded-md border border-border bg-surface p-3">
        <Text className="text-body text-text-secondary">
          {MENSAJES_PEDIDO.totalDelPedido}
        </Text>
        <Text className="text-h2 font-extrabold text-text-primary">
          {formatearPrecio(pedido.total)}
        </Text>
      </View>

      <AccionDeCalificacion esCocinero={esCocinero} pedido={pedido} />
    </ScrollView>
  );
}

/**
 * Nombre visible de un evento de la línea de tiempo.
 *
 * Usa las leyendas del CLIENTE (US-PED-02) también en la pantalla del cocinero:
 * son las únicas que el documento define para la línea de tiempo, y PAN-PED-04.6
 * dibuja exactamente esa secuencia ("Recibido → Aceptado → Listo → Entregado").
 *
 * Un evento que no es ninguno de los cuatro pasos -el rechazo, la cancelación o
 * la expiración- se nombra por cómo terminó el pedido, que es el dato que ese
 * renglón tiene que comunicar.
 */
function nombreDelEvento(evento: EventoPedido): string {
  const paso = PASOS_DEL_SEGUIMIENTO.find(
    (candidato) => candidato.estado === evento.estado,
  );
  if (paso) return paso.leyenda;

  return indicadorDeCierre({
    estado: evento.estado,
    origenRechazo: evento.origen,
  });
}

/**
 * Lo que queda por calificar, al final del detalle.
 *
 * "Si el pedido está en estado Completado y el cliente todavía no dejó reseña,
 * muestre el botón 'Dejar reseña' de forma prominente al final del detalle"
 * (US-PED-07); "si ya dejó una, muestre en su lugar una indicación de que la
 * reseña ya fue enviada". Para el cocinero, el equivalente es "Calificar
 * cliente" (US-PED-08).
 *
 * `puedeCalificar` ya viene resuelto por la API contra `resena` o
 * `calificacion_cocinero`, así que la pantalla no interpreta nada.
 *
 * Los dos botones llevan a la pantalla anunciada del módulo de Reseñas, que
 * todavía no está codificado (decisión del equipo, 2026-08-19).
 */
function AccionDeCalificacion({
  pedido,
  esCocinero,
}: {
  pedido: PedidoDetalle;
  esCocinero: boolean;
}) {
  if (pedido.estado !== 'COMPLETADO') return null;

  if (!pedido.puedeCalificar) {
    return (
      <View className="flex-row items-center justify-center gap-2 py-2">
        <IconoTildeCirculo className="text-success" size={18} />
        <Text className="text-body text-text-secondary">
          {esCocinero
            ? MENSAJES_PEDIDO.yaCalificasteAlCliente
            : MENSAJES_PEDIDO.yaCalificasteEstePedido}
        </Text>
      </View>
    );
  }

  return (
    <Boton
      onPress={() => {
        router.push(
          esCocinero ? '/resenas/calificar-cliente' : '/resenas/dejar',
        );
      }}
    >
      {esCocinero
        ? MENSAJES_PEDIDO.calificarCliente
        : MENSAJES_PEDIDO.dejarResena}
    </Boton>
  );
}
