import { ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  MENSAJES_EXPLORACION,
  MENSAJES_PEDIDO,
  MENSAJES_RESENA,
  type EventoPedido,
  type PedidoDetalle,
} from '@foodhub/shared';
import { IconoEstrella } from '../../components/iconos';
import { SafeAreaView } from '../../components/SafeAreaView';
import { Aviso } from '../../components/ui/Aviso';
import { Boton } from '../../components/ui/Boton';
import { EncabezadoPantalla } from '../../components/ui/EncabezadoPantalla';
import { Esqueleto } from '../../components/ui/Esqueleto';
import { EstadoDeError } from '../../components/ui/EstadoDeError';
import { usePedido } from '../../hooks/usePedidos';
import { usePerfil } from '../../hooks/usePerfil';
import {
  useEstadoDeCalificacion,
  useEstadoDeResenas,
  useReputacionDeCliente,
} from '../../hooks/useResenas';
import { mensajeDeError } from '../../lib/api';
import { formatearFecha, formatearPrecio } from '../../lib/formato';
import { TEXTOS_PEDIDOS, TEXTOS_RESENA } from '../../lib/textos';
import {
  PASOS_DEL_SEGUIMIENTO,
  encabezadoDeCierre,
  indicadorDeCierre,
  type VistaDePedido,
  motivoVisible,
} from './estados';
import { BotonMensajesDelPedido } from '../mensajeria/BotonDeMensajes';
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
  const vista: VistaDePedido = esCocinero ? 'COCINERO' : 'CLIENTE';

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

      {pedido.estado === 'RECHAZADO' ? (
        <BannerDeCierre pedido={pedido} vista={vista} />
      ) : null}

      {/*
        DOS REGLAS SOBRE LA MISMA FICHA, y las dos dependen de quién mira.

        US-EXP-04: la ficha del cocinero lleva a su perfil público, que es donde
        están sus publicaciones. Del otro lado NO es tocable: `/clientes/[id]`
        todavía es una pantalla pendiente, y un toque que no hace nada se lee
        como que la app está rota.

        US-RES-02: la tarjeta pinta el promedio crudo, sin la regla de "Cliente
        nuevo". Para el cocinero se apaga y la reputación va debajo con esa
        regla aplicada: mostrar las dos sería contradecirse en la misma
        pantalla.
      */}
      <FichaDeParticipante
        conValoracion={!esCocinero}
        participante={pedido.participante}
        rotulo={esCocinero ? TEXTOS_PEDIDOS.cliente : TEXTOS_PEDIDOS.cocinero}
        {...(esCocinero
          ? {}
          : {
              onPress: () => {
                router.push({
                  pathname: '/cocineros/[id]',
                  params: { id: pedido.participante.id },
                });
              },
            })}
      />

      {esCocinero ? (
        <ReputacionDelCliente clienteId={pedido.participante.id} />
      ) : null}

      <BotonMensajesDelPedido participanteId={pedido.participante.id} />

      <PlatosDelPedido esCocinero={esCocinero} pedido={pedido} />

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
        nombreDelEvento={nombreDelEventoPara(vista)}
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
 * Cómo terminó el pedido, con el motivo que dejó quien lo cerró.
 *
 * "El mensaje de motivo enviado por el cocinero de forma íntegra y destacada"
 * (US-PED-07). Va arriba de todo: es la primera pregunta que el usuario trae al
 * abrir un pedido que no llegó a destino.
 */
function BannerDeCierre({
  pedido,
  vista,
}: {
  pedido: PedidoDetalle;
  vista: VistaDePedido;
}) {
  const motivo = motivoVisible(pedido);

  return (
    <View className="gap-2">
      <Aviso
        mensaje={indicadorDeCierre(pedido, vista)}
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

/** Los platos del pedido, cada uno con acceso a su publicación. */
function PlatosDelPedido({
  pedido,
  esCocinero,
}: {
  pedido: PedidoDetalle;
  esCocinero: boolean;
}) {
  return (
    <View className="overflow-hidden rounded-md border border-border bg-surface">
      <Text className="px-3 pt-3 text-caption font-bold uppercase text-text-secondary">
        {TEXTOS_PEDIDOS.platosDelPedido}
      </Text>
      {pedido.items.map((item) => (
        <FilaDeItem
          item={item}
          key={item.id}
          onPress={() => {
            irALaPublicacion(item.publicacionId, esCocinero);
          }}
        />
      ))}
    </View>
  );
}

/**
 * A dónde lleva tocar un plato del pedido.
 *
 * EL DESTINO DEPENDE DEL ROL y no es una preferencia de diseño: `/platos/[id]`
 * consulta el módulo de Exploración, que es `requiereRol('CLIENTE')` y le
 * respondería 403 al cocinero. Para él el equivalente es su propia publicación,
 * que puede ver porque los platos de un pedido que recibió son suyos.
 */
function irALaPublicacion(publicacionId: string, esCocinero: boolean): void {
  router.push(
    esCocinero
      ? { pathname: '/publicaciones/[id]', params: { id: publicacionId } }
      : { pathname: '/platos/[id]', params: { id: publicacionId } },
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
function nombreDelEventoPara(
  vista: VistaDePedido,
): (evento: EventoPedido) => string {
  return (evento) => {
    const paso = PASOS_DEL_SEGUIMIENTO.find(
      (candidato) => candidato.estado === evento.estado,
    );
    if (paso) return paso.leyenda;

    return indicadorDeCierre(
      { estado: evento.estado, origenRechazo: evento.origen },
      vista,
    );
  };
}

/**
 * Reputación del cliente, tal como la ve el cocinero — US-RES-02 (RF081).
 *
 * "Muestre en el detalle del pedido el promedio de estrellas del cliente y la
 * cantidad total de cocineros que lo calificaron. Si el cliente registra menos
 * de 3 pedidos completados en la plataforma, muestre el texto 'Cliente nuevo'
 * en lugar del promedio."
 *
 * EL UMBRAL SON PEDIDOS COMPLETADOS, NO CALIFICACIONES RECIBIDAS: un cliente
 * con diez compras y ninguna calificación no es nuevo, solo no tiene reputación
 * todavía. Por eso `esClienteNuevo` viene resuelto del servidor y no se deriva
 * de `cantidadCocineros`.
 *
 * Se calla si la consulta falla: es información de contexto sobre la otra
 * parte, no una acción. Un cartel de error acá le taparía al cocinero el
 * detalle del pedido, que es lo que vino a ver.
 */
function ReputacionDelCliente({ clienteId }: { clienteId: string }) {
  const reputacion = useReputacionDeCliente(clienteId);
  if (!reputacion.data) return null;

  const { promedio, cantidadCocineros, esClienteNuevo } = reputacion.data;

  return (
    <View className="flex-row items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-2">
      {esClienteNuevo || promedio === null ? (
        <Text className="text-caption text-text-secondary">
          {esClienteNuevo
            ? MENSAJES_RESENA.clienteNuevo
            : MENSAJES_EXPLORACION.cocineroSinResenas}
        </Text>
      ) : (
        <>
          <IconoEstrella className="text-warning" size={14} />
          <Text className="text-caption font-semibold text-text-primary">
            {promedio.toFixed(1)}
          </Text>
          <Text className="text-caption text-text-secondary">
            {`· ${TEXTOS_RESENA.cantidadCocinerosQueCalificaron(cantidadCocineros)}`}
          </Text>
        </>
      )}
    </View>
  );
}

/**
 * Lo que queda por calificar, al final del detalle.
 *
 * LAS DOS DIRECCIONES NO TIENEN LA MISMA FORMA, y por eso se separan:
 *
 *   cliente → plato    UN BOTÓN POR ÍTEM. RF031 lo pide explícitamente:
 *                      "reemplazar el botón único 'Dejar reseña' por un botón
 *                      por cada ítem del pedido". La reseña es por publicación
 *                      (cambio del 2026-08-18), así que un pedido de tres
 *                      platos habilita tres reseñas independientes, cada una
 *                      con su propio estado.
 *   cocinero → cliente UN SOLO BOTÓN. La calificación es una por par
 *                      cocinero-cliente, no una por pedido ni por plato.
 *
 * La maquetación de PAN-PED-06 dibuja un único botón "Dejar reseña" para todo
 * el pedido, pero es de la Etapa 5 y anterior al cambio de modelo; RF031 la
 * corrige de forma explícita.
 */
function AccionDeCalificacion({
  pedido,
  esCocinero,
}: {
  pedido: PedidoDetalle;
  esCocinero: boolean;
}) {
  /*
   * CADA DIRECCION SE HABILITA CON UN HITO DISTINTO, y confundirlos deja sin
   * cubrir justo el caso que la historia quiere resolver.
   *
   *   cliente → plato    solo si el pedido esta COMPLETADO. "Solo se resena una
   *                      publicacion que el cliente recibio en un pedido
   *                      completado" (RF080).
   *   cocinero → cliente si el pedido ALCANZO ACEPTADO alguna vez, "aun cuando
   *                      posteriormente sea cancelado" (RF081). Es literal del
   *                      requisito, y el motivo tambien: el incumplimiento
   *                      tipico -que el cliente no aparezca a retirar- termina
   *                      en un pedido cancelado, nunca en uno completado.
   *
   * El hito del cocinero se lee del HISTORIAL y no del estado actual: un pedido
   * aceptado y despues cancelado figura hoy como RECHAZADO, y mirar la cabecera
   * le sacaria el derecho justo cuando mas lo necesita. Es el mismo criterio que
   * ya usa el servidor en `hubopedidoAceptado`.
   */
  if (esCocinero) {
    return alcanzoAceptado(pedido) ? (
      <CalificarAlCliente pedido={pedido} />
    ) : null;
  }

  /*
   * EL PEDIDO CANCELADO EXPLICA POR QUE NO SE PUEDE, en vez de no mostrar nada.
   * US-RES-01 lo pide en su ultimo criterio: "no muestre el boton 'Dejar
   * resena' ... y, en su lugar, indique el motivo aplicable". Callarse deja al
   * cliente buscando un boton que no existe.
   *
   * Solo aplica a RECHAZADO, el unico estado terminal de fracaso del modelo
   * (cubre el rechazo del cocinero y la cancelacion del cliente). Un pedido en
   * curso -CREADO, ACEPTADO o LISTO- no muestra nada: todavia puede completarse
   * y decirle "no se puede resenar un pedido cancelado" seria falso.
   */
  if (pedido.estado === 'RECHAZADO') {
    return (
      <Aviso mensaje={MENSAJES_RESENA.pedidoNoCompletado} tono="informativo" />
    );
  }

  if (pedido.estado !== 'COMPLETADO') return null;

  /*
   * DOS GRUPOS DE ACCIONES, como pide la correccion de RF031: uno por ITEM para
   * las resenas de los platos, y UNO SOLO a nivel pedido para la calificacion
   * al cocinero. La separacion no es estetica: son dos cosas distintas -el
   * producto y el servicio- y un pedido de seis platos deja seis resenas pero
   * una sola calificacion de servicio.
   */
  return (
    <View className="gap-3">
      <ResenarCadaPlato pedido={pedido} />
      <CalificarAlCocinero pedido={pedido} />
    </View>
  );
}

/** `true` si el pedido pasó por ACEPTADO en algún momento de su historia. */
function alcanzoAceptado(pedido: PedidoDetalle): boolean {
  return pedido.historial.some((evento) => evento.estado === 'ACEPTADO');
}

/**
 * RF031 y US-RES-07 — la acción a nivel pedido, con sus tres estados.
 *
 * UNA SOLA PARA TODO EL PEDIDO, a diferencia de los botones por plato: la
 * calificación al cocinero valora el servicio de esa entrega y se registra una
 * por pedido, sin importar cuántos platos lo integren.
 *
 * Mientras la consulta viaja no se dibuja nada, por el mismo motivo que en
 * `ResenarCadaPlato`: mostrar "Calificar al cocinero" y cambiarlo a "Editar mi
 * calificación" un segundo después invita a tocar el botón equivocado.
 */
function CalificarAlCocinero({ pedido }: { pedido: PedidoDetalle }) {
  const estado = useEstadoDeCalificacion(pedido.id);

  if (estado.isError) {
    return <Aviso mensaje={mensajeDeError(estado.error)} tono="error" />;
  }

  if (!estado.data) return null;

  const etiqueta =
    estado.data.calificacionId === null
      ? MENSAJES_RESENA.calificarAlCocinero
      : estado.data.puedeEditar
        ? MENSAJES_RESENA.editarMiCalificacion
        : MENSAJES_RESENA.verMiCalificacion;

  return (
    <Boton
      onPress={() => {
        router.push({
          pathname: '/resenas/calificar-cocinero',
          params: {
            pedidoId: pedido.id,
            // Igual que al calificar al cliente: los datos de la cabecera
            // viajan porque esta pantalla ya los tiene y evitan otra consulta.
            nombre: `${pedido.participante.nombre} ${pedido.participante.apellido}`,
            fechaPedido: pedido.fechaCreacion,
            ...(pedido.participante.fotoPerfilUrl === null
              ? {}
              : { fotoPerfilUrl: pedido.participante.fotoPerfilUrl }),
          },
        });
      }}
      variante={estado.data.calificacionId === null ? 'primario' : 'secundario'}
    >
      {etiqueta}
    </Boton>
  );
}

/** US-PED-08 y US-RES-02 — una calificación por cliente, no por pedido. */
function CalificarAlCliente({ pedido }: { pedido: PedidoDetalle }) {
  /*
   * SIEMPRE HAY BOTON, calificado o no. US-RES-02 lo pide explicitamente: "no
   * muestre el boton 'Calificar cliente'; en su lugar, muestre 'Editar
   * calificacion' con el formulario precargado". Antes, con el cliente ya
   * calificado, esta pantalla mostraba un texto fijo y no habia forma de llegar
   * al modo edicion desde ningun lado.
   *
   * `puedeCalificar` viene resuelto por la API contra `calificacion_cocinero` y
   * es una por par cocinero-cliente: si ya lo califico en OTRO pedido, este
   * tambien ofrece editar.
   */
  return (
    <Boton
      onPress={() => {
        router.push({
          pathname: '/resenas/calificar-cliente',
          params: {
            clienteId: pedido.participante.id,
            // El nombre y la foto viajan porque no hay endpoint que le
            // permita a un cocinero consultar los datos de un cliente.
            nombre: `${pedido.participante.nombre} ${pedido.participante.apellido}`,
            ...(pedido.participante.fotoPerfilUrl === null
              ? {}
              : { fotoPerfilUrl: pedido.participante.fotoPerfilUrl }),
          },
        });
      }}
      variante={pedido.puedeCalificar ? 'primario' : 'secundario'}
    >
      {pedido.puedeCalificar
        ? MENSAJES_PEDIDO.calificarCliente
        : MENSAJES_RESENA.editarCalificacion}
    </Boton>
  );
}

/**
 * RF031 — un botón por plato, con el rótulo que corresponda a su estado.
 *
 * El estado sale del servidor porque depende de dos plazos y del historial de
 * pedidos del cliente con ese plato: "Dejar reseña" si nunca lo reseñó y está
 * a tiempo, "Editar mi reseña" si ya lo hizo y la ventana de 48 h sigue
 * abierta, "Ver mi reseña" si se cerró.
 *
 * Mientras la consulta viaja no se dibuja nada: mostrar "Dejar reseña" y
 * cambiarlo a "Editar mi reseña" un segundo después invita a tocar el botón
 * equivocado.
 */
function ResenarCadaPlato({ pedido }: { pedido: PedidoDetalle }) {
  const publicacionIds = pedido.items.map((item) => item.publicacionId);
  const estado = useEstadoDeResenas(publicacionIds);

  /**
   * El fallo se MUESTRA en lugar de devolver `null`.
   *
   * Con `null` la pantalla queda idéntica a la de un pedido sin nada por
   * reseñar, y el cliente no tiene forma de distinguir "ya no podés opinar" de
   * "algo se rompió". Es el estado de error que exige la regla de los cuatro
   * estados del proyecto, y su ausencia ya escondió un bug de navegación una
   * vez.
   */
  if (estado.isError) {
    return <Aviso mensaje={mensajeDeError(estado.error)} tono="error" />;
  }

  if (!estado.data) return null;

  const porPublicacion = new Map(
    estado.data.map((fila) => [fila.publicacionId, fila]),
  );

  return (
    <View className="gap-3">
      {pedido.items.map((item) => {
        const suEstado = porPublicacion.get(item.publicacionId);
        if (!suEstado) return null;

        // Ni reseñable ni reseñado: venció el plazo sin haber opinado. No hay
        // acción posible, así que el plato no muestra botón.
        if (suEstado.resenaId === null && !suEstado.puedeResenar) return null;

        const etiqueta =
          suEstado.resenaId === null
            ? MENSAJES_PEDIDO.dejarResena
            : suEstado.puedeEditar
              ? MENSAJES_RESENA.editarMiResena
              : MENSAJES_RESENA.verMiResena;

        return (
          <Boton
            key={item.id}
            onPress={() => {
              router.push({
                pathname: '/resenas/dejar',
                params: {
                  publicacionId: item.publicacionId,
                  // Viaja para encadenar con la calificación al cocinero al
                  // publicar (US-RES-01); no interviene en la reseña en sí.
                  pedidoId: pedido.id,
                },
              });
            }}
            variante={suEstado.resenaId === null ? 'primario' : 'secundario'}
          >
            {/*
              El nombre del plato va en el botón porque con varios ítems tres
              botones idénticos no dicen cuál es cuál.
            */}
            {pedido.items.length > 1
              ? `${etiqueta} · ${item.nombre}`
              : etiqueta}
          </Boton>
        );
      })}
    </View>
  );
}
