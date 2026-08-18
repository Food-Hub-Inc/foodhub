import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  MENSAJES_EXPLORACION,
  type Carrito as CarritoContrato,
  type ItemCarrito,
} from '@foodhub/shared';
import {
  IconoBolsa,
  IconoMas,
  IconoMenos,
  IconoTacho,
} from '../../components/iconos';
import { SafeAreaView } from '../../components/SafeAreaView';
import { AreaTexto } from '../../components/ui/AreaTexto';
import { Aviso } from '../../components/ui/Aviso';
import { Boton } from '../../components/ui/Boton';
import { DialogoSevero } from '../../components/ui/DialogoSevero';
import { EncabezadoPantalla } from '../../components/ui/EncabezadoPantalla';
import { Esqueleto } from '../../components/ui/Esqueleto';
import { EstadoDeError } from '../../components/ui/EstadoDeError';
import { EstadoVacio } from '../../components/ui/EstadoVacio';
import {
  useCambiarCantidad,
  useCarrito,
  useQuitarItem,
  useVaciarCarrito,
} from '../../hooks/useCarrito';
import { mensajeDeError } from '../../lib/api';
import { formatearPrecio } from '../../lib/formato';
import { TEXTOS_CARRITO } from '../../lib/textos';
import { AvatarDeCocinero, MiniaturaDePlato, Valoracion } from './Piezas';

/**
 * PAN-PED-01 · Carrito — US-EXP-07.
 *
 * El primer criterio enumera todo lo que muestra: cabecera del cocinero con su
 * calificación, los ítems con imagen / nombre / precio unitario / selector de
 * cantidad con "+", "−" y "x", el campo "Notas para el cocinero", el tiempo
 * estimado como referencia y el total al pie.
 *
 * LAS NOTAS NO SE PERSISTEN. `carrito` no tiene columna para ellas y ningún
 * criterio dice que sobrevivan a salir de la pantalla: lo que el documento
 * garantiza intacto al volver de la confirmación son los ÍTEMS. Viven en el
 * estado de esta pantalla hasta que US-PED-01 las reciba y las guarde en
 * `pedido.instruccionesCliente`. Queda anotado para que sea una decisión y no un
 * olvido.
 *
 * NO LLEVA EL BOTÓN FLOTANTE DEL CARRITO: ya estamos en el carrito.
 */

/**
 * Tope de caracteres de las notas.
 *
 * Es el mismo que `crearPedidoSchema` impone a `instruccionesCliente`, que es
 * donde van a terminar: dejar escribir más de lo que el pedido acepta haría que
 * el cliente pierda texto recién al confirmar.
 */
const MAXIMO_NOTAS = 300;
export function Carrito() {
  const consulta = useCarrito();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <EncabezadoPantalla
        destinoAlternativo="/(cliente)/inicio"
        titulo={TEXTOS_CARRITO.titulo}
      />

      <Contenido consulta={consulta} />
    </SafeAreaView>
  );
}

function Contenido({ consulta }: { consulta: ReturnType<typeof useCarrito> }) {
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

  if (consulta.isPending || !consulta.data) {
    return (
      <View className="px-4 pt-3">
        <Esqueleto className="mb-4 h-16 rounded-md" />
        <Esqueleto className="mb-3 h-24 rounded-md" />
        <Esqueleto className="mb-3 h-24 rounded-md" />
      </View>
    );
  }

  const { carrito, itemsQuitados } = consulta.data;

  /**
   * El aviso de platos quitados se muestra IGUAL cuando el carrito quedó vacío
   * (último criterio de US-EXP-07: la advertencia Y el estado vacío, no una en
   * lugar de la otra). Por eso va antes de decidir cuál de los dos cuerpos se
   * dibuja, y no dentro de ninguno.
   */
  return (
    <>
      {itemsQuitados.length > 0 ? (
        <View className="px-4 pt-3">
          <Aviso
            mensaje={MENSAJES_EXPLORACION.itemQuitadoPorNoDisponible}
            tono="error"
          />
        </View>
      ) : null}

      {carrito ? <CarritoConItems carrito={carrito} /> : <CarritoVacio />}
    </>
  );
}

/** Quinto criterio: estado vacío del carrito (PAN-PED-01.1), con acceso al feed. */
function CarritoVacio() {
  return (
    <EstadoVacio
      accion={
        <Boton
          onPress={() => {
            router.replace('/(cliente)/inicio');
          }}
        >
          {TEXTOS_CARRITO.explorarPlatos}
        </Boton>
      }
      icono={<IconoBolsa className="text-text-disabled" size={28} />}
      titulo={MENSAJES_EXPLORACION.carritoVacio}
    />
  );
}

function CarritoConItems({ carrito }: { carrito: CarritoContrato }) {
  const [notas, setNotas] = useState('');
  const [vaciando, setVaciando] = useState(false);
  const vaciar = useVaciarCarrito();

  return (
    <>
      <FlatList
        contentContainerClassName="pb-4"
        data={carrito.items}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<CabeceraDelCocinero carrito={carrito} />}
        ListFooterComponent={
          <View className="px-4 pt-4">
            {/* El campo es OPCIONAL (primer criterio: "de carácter opcional"),
                así que no lleva asterisco. El máximo de 300 es el de
                `pedido.instruccionesCliente`, que es donde US-PED-01 las va a
                guardar: dejar escribir más de lo que el pedido acepta llevaría a
                perder texto recién al confirmar. */}
            <AreaTexto
              etiqueta={MENSAJES_EXPLORACION.notasParaElCocinero}
              maximo={MAXIMO_NOTAS}
              nombre="notas-para-el-cocinero"
              onChange={setNotas}
              placeholder={TEXTOS_CARRITO.notasPlaceholder}
              valor={notas}
            />

            <Boton
              className="mt-5"
              onPress={() => {
                setVaciando(true);
              }}
              variante="ghost"
            >
              {MENSAJES_EXPLORACION.vaciarCarrito}
            </Boton>
          </View>
        }
        renderItem={({ item }) => <FilaDeItem item={item} />}
      />

      <PieConTotal carrito={carrito} />

      {/* Sexto criterio: "Vaciar carrito" confirma antes de borrar. */}
      <DialogoSevero
        abierto={vaciando}
        error={vaciar.isError ? mensajeDeError(vaciar.error) : undefined}
        onCancelar={() => {
          setVaciando(false);
          vaciar.reset();
        }}
        onConfirmar={() => {
          vaciar.mutate(undefined, {
            onSuccess: () => {
              setVaciando(false);
            },
          });
        }}
        procesando={vaciar.isPending}
        textoCancelar={MENSAJES_EXPLORACION.vaciarCarritoCancelar}
        textoConfirmar={MENSAJES_EXPLORACION.vaciarCarritoConfirmar}
        titulo={MENSAJES_EXPLORACION.vaciarCarritoMensaje}
      />
    </>
  );
}

/**
 * Cabecera: "nombre, foto y calificación en estrellas del cocinero al que
 * pertenece el carrito", más el tiempo estimado como referencia.
 */
function CabeceraDelCocinero({ carrito }: { carrito: CarritoContrato }) {
  const { cocinero, tiempoEstimadoMinimo, tiempoEstimadoMaximo } = carrito;

  return (
    <View className="border-b border-border bg-surface px-4 py-4">
      <View className="flex-row items-center gap-3">
        <AvatarDeCocinero
          fotoPerfilUrl={cocinero.fotoPerfilUrl}
          tamano="h-12 w-12"
        />
        <View className="flex-1">
          <Text className="text-h2 font-bold text-text-primary">
            {`${cocinero.nombre} ${cocinero.apellido}`}
          </Text>
          <Valoracion
            className="mt-0.5"
            promedio={cocinero.valoracionPromedio}
          />
        </View>
      </View>

      {tiempoEstimadoMinimo !== null && tiempoEstimadoMaximo !== null ? (
        <Text className="mt-3 text-body text-text-secondary">
          {tiempoEstimadoMinimo === tiempoEstimadoMaximo
            ? TEXTOS_CARRITO.listoEn(tiempoEstimadoMinimo)
            : TEXTOS_CARRITO.listoEnRango(
                tiempoEstimadoMinimo,
                tiempoEstimadoMaximo,
              )}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Fila de un ítem, con el selector de cantidad del primer criterio: "+", "−" y
 * "x".
 *
 * "−" con cantidad mayor a 1 decrementa (tercer criterio). Con cantidad 1, y
 * también la "x", abren el diálogo "¿Querés quitar este plato del carrito?"
 * (cuarto criterio): son el mismo camino, así que comparten el mismo estado y el
 * mismo diálogo en lugar de duplicarlo.
 */
function FilaDeItem({ item }: { item: ItemCarrito }) {
  const [quitando, setQuitando] = useState(false);
  const cambiarCantidad = useCambiarCantidad();
  const quitar = useQuitarItem();

  const restar = () => {
    if (item.cantidad > 1) {
      cambiarCantidad.mutate({ itemId: item.id, cantidad: item.cantidad - 1 });
      return;
    }
    setQuitando(true);
  };

  return (
    <View className="mx-4 mt-3 flex-row gap-3 rounded-md border border-border bg-surface p-3">
      <MiniaturaDePlato
        className="h-16 w-16 rounded-sm"
        imagenDeCategoria={null}
        imagenUrl={item.imagenUrl}
      />

      <View className="flex-1">
        <Text className="text-h3 font-bold text-text-primary" numberOfLines={2}>
          {item.nombre}
        </Text>
        <Text className="mt-0.5 text-body text-text-secondary">
          {formatearPrecio(item.precioUnitario)}
        </Text>

        <SelectorDeCantidad
          cantidad={item.cantidad}
          onQuitar={() => {
            setQuitando(true);
          }}
          onRestar={restar}
          onSumar={() => {
            cambiarCantidad.mutate({
              itemId: item.id,
              cantidad: item.cantidad + 1,
            });
          }}
        />

        {cambiarCantidad.isError ? (
          <Aviso
            className="mt-2"
            mensaje={mensajeDeError(cambiarCantidad.error)}
            tono="error"
          />
        ) : null}
      </View>

      <DialogoSevero
        abierto={quitando}
        error={quitar.isError ? mensajeDeError(quitar.error) : undefined}
        onCancelar={() => {
          setQuitando(false);
          quitar.reset();
        }}
        onConfirmar={() => {
          quitar.mutate(item.id, {
            onSuccess: () => {
              setQuitando(false);
            },
          });
        }}
        procesando={quitar.isPending}
        textoCancelar={MENSAJES_EXPLORACION.quitarItemCancelar}
        textoConfirmar={MENSAJES_EXPLORACION.quitarItemConfirmar}
        titulo={MENSAJES_EXPLORACION.quitarItemMensaje}
      />
    </View>
  );
}

/**
 * Selector de cantidad del primer criterio: "+", "−" y "x".
 *
 * Los tres controles juntos porque son una sola unidad de interacción, y separados
 * de `FilaDeItem` para que ninguna de las dos funciones pase del umbral de líneas.
 * No conoce mutaciones: recibe los tres callbacks.
 */
function SelectorDeCantidad({
  cantidad,
  onSumar,
  onRestar,
  onQuitar,
}: {
  cantidad: number;
  onSumar: () => void;
  onRestar: () => void;
  onQuitar: () => void;
}) {
  return (
    <View className="mt-2 flex-row items-center gap-3">
      <BotonDeCantidad
        etiqueta={TEXTOS_CARRITO.restarUnidad}
        icono={<IconoMenos size={16} className="text-text-primary" />}
        onPress={onRestar}
      />
      <Text className="min-w-6 text-center text-body font-bold text-text-primary">
        {String(cantidad)}
      </Text>
      <BotonDeCantidad
        etiqueta={TEXTOS_CARRITO.sumarUnidad}
        icono={<IconoMas size={16} className="text-text-primary" />}
        onPress={onSumar}
      />

      <View className="flex-1 items-end">
        <BotonDeCantidad
          etiqueta={TEXTOS_CARRITO.quitarDelCarrito}
          icono={<IconoTacho size={16} className="text-error" />}
          onPress={onQuitar}
        />
      </View>
    </View>
  );
}

/** Botón cuadrado del selector de cantidad. 44 px de área táctil mínima. */
function BotonDeCantidad({
  icono,
  etiqueta,
  onPress,
}: {
  icono: React.ReactNode;
  etiqueta: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={etiqueta}
      accessibilityRole="button"
      className="h-11 w-11 items-center justify-center rounded-sm border border-border"
      hitSlop={4}
      onPress={onPress}
    >
      {icono}
    </Pressable>
  );
}

/**
 * Pie fijo con el total y "Confirmar pedido" (séptimo criterio).
 *
 * El botón lleva a la confirmación del pedido (US-PED-01). Ese módulo todavía no
 * está codificado, así que navega a su pantalla anunciada (PAN-PED-05), igual que
 * "Enviar mensaje" en el perfil del cocinero. El carrito NO se vacía acá: el
 * octavo criterio dice que se vacía "una vez registrado el pedido en el sistema",
 * y el noveno que volver atrás sin confirmar lo deja intacto. Las dos cosas son
 * responsabilidad de US-PED-01.
 */
function PieConTotal({ carrito }: { carrito: CarritoContrato }) {
  return (
    <View className="border-t border-border bg-surface px-4 pb-2 pt-3">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-body text-text-secondary">
          {TEXTOS_CARRITO.total}
        </Text>
        <Text className="text-h1 font-extrabold text-text-primary">
          {formatearPrecio(carrito.total)}
        </Text>
      </View>

      <Boton
        onPress={() => {
          router.push('/(cliente)/pedidos');
        }}
      >
        {MENSAJES_EXPLORACION.confirmarPedido}
      </Boton>
    </View>
  );
}
