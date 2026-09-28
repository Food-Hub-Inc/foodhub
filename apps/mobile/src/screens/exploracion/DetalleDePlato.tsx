import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  MENSAJES_EXPLORACION,
  MENSAJES_RESENA,
  type PublicacionPublica,
} from '@foodhub/shared';
import { IconoAlerta, IconoCocinero } from '../../components/iconos';
import { SafeAreaView } from '../../components/SafeAreaView';
import { Aviso } from '../../components/ui/Aviso';
import { Boton } from '../../components/ui/Boton';
import { DialogoExito } from '../../components/ui/DialogoExito';
import { DialogoSevero } from '../../components/ui/DialogoSevero';
import { EncabezadoPantalla } from '../../components/ui/EncabezadoPantalla';
import { Esqueleto } from '../../components/ui/Esqueleto';
import { EstadoDeError } from '../../components/ui/EstadoDeError';
import { useAgregarAlCarrito } from '../../hooks/useCarrito';
import { usePublicacionPublica } from '../../hooks/useExploracion';
import { useAlternarPublicacionFavorita } from '../../hooks/useFavoritos';
import { esErrorApi, mensajeDeError } from '../../lib/api';
import { formatearPrecio } from '../../lib/formato';
import { TEXTOS_EXPLORACION, TEXTOS_RESENA } from '../../lib/textos';
import { ListaDeResenas } from '../resenas/ListaDeResenas';
import { BotonFlotanteDelCarrito } from './BotonFlotanteDelCarrito';
import {
  AvatarDeCocinero,
  BadgeDeDisponibilidad,
  BotonDeFavorito,
  Valoracion,
} from './Piezas';

/**
 * PAN-EXP-05 · Detalle de la publicación — US-EXP-05.
 *
 * El primer criterio enumera lo que muestra: "imagen del plato, nombre,
 * descripción completa, precio, categoría, tiempo estimado de preparación, estado
 * de disponibilidad con color diferenciado, nombre del cocinero con enlace a su
 * perfil y valoración promedio del plato".
 *
 * DEBAJO VA EL LISTADO DE RESEÑAS DEL PLATO (RF019). Vivían en el perfil del
 * cocinero, que era el lugar equivocado: ahí opinaban sobre comida colgando de
 * un perfil sobre una persona, y con su propio promedio al lado del de la
 * ficha. Acá son lo que un cliente lee justo antes de decidir si lo pide.
 *
 * Esta es la pantalla donde el módulo se cruza con el carrito, y donde vive la
 * parte más delicada: el cuarto criterio exige preguntar antes de reemplazar un
 * carrito de otro cocinero. Ese flujo NO lo decide el servidor por su cuenta -la
 * API responde 409 y espera-, así que la pregunta y la confirmación son
 * responsabilidad de esta pantalla.
 */
export function DetalleDePlato({ id }: { id: string | undefined }) {
  const consulta = usePublicacionPublica(id);

  /**
   * Alto real del pie de "Agregar al carrito", para que el botón flotante del
   * carrito quede por encima y no le coma el toque.
   *
   * Se MIDE en vez de fijarse: el pie crece cuando aparece el aviso de error o
   * la leyenda "Sin unidades disponibles", y un número fijo se volvería a
   * solapar justo en esos casos.
   */
  const [altoDelPie, setAltoDelPie] = useState(0);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <EncabezadoPantalla
        destinoAlternativo="/(cliente)/inicio"
        titulo={consulta.data?.nombre ?? ''}
      />

      {consulta.isError ? (
        <EstadoDeError
          mensaje={mensajeDeError(consulta.error)}
          onReintentar={() => {
            void consulta.refetch();
          }}
        />
      ) : null}

      {!consulta.isError && (consulta.isPending || !consulta.data) ? (
        <EsqueletoDelDetalle />
      ) : null}

      {consulta.data ? (
        <Detalle onAltoDelPie={setAltoDelPie} plato={consulta.data} />
      ) : null}

      <BotonFlotanteDelCarrito separacionInferior={altoDelPie} />
    </SafeAreaView>
  );
}

function EsqueletoDelDetalle() {
  return (
    <View className="px-4 pt-4">
      <Esqueleto className="mb-4 h-56 rounded-md" />
      <Esqueleto className="mb-2 h-6 w-2/3 rounded-sm" />
      <Esqueleto className="mb-4 h-6 w-1/3 rounded-sm" />
      <Esqueleto className="h-24 rounded-md" />
    </View>
  );
}

function Detalle({
  plato,
  onAltoDelPie,
}: {
  plato: PublicacionPublica;
  onAltoDelPie: (alto: number) => void;
}) {
  const noDisponible = plato.estadoPublicacion === 'NO_DISPONIBLE';

  /**
   * TODO EL DETALLE VIAJA COMO ENCABEZADO DE LA LISTA, y no al revés.
   *
   * El listado de reseñas es un `FlatList` y esta pantalla era un `ScrollView`:
   * meter uno dentro del otro anida dos scrolls verticales, rompe la
   * virtualización y la guía lo prohíbe. La salida es la misma que ya usa el
   * perfil del cocinero —la lista manda y el contenido fijo es su cabecera— y
   * de paso el `pb-24` deja de hacer falta: lo pone la lista.
   */
  const detalle = (
    <>
      <FotoDelPlato
        imagenUrl={plato.imagenUrl ?? plato.categoria.imagenPredeterminadaUrl}
      />

      <EncabezadoDelPlato plato={plato} />

      <SeccionDeCocinero plato={plato} />

      <View className="mt-3 bg-surface px-4 py-4">
        <Text className="mb-1.5 text-label font-semibold text-text-primary">
          {TEXTOS_EXPLORACION.descripcion}
        </Text>
        <Text className="text-body text-text-secondary">
          {plato.descripcion}
        </Text>

        {plato.tiempoEstimadoPreparacion !== null ? (
          <>
            <Text className="mb-1.5 mt-4 text-label font-semibold text-text-primary">
              {TEXTOS_EXPLORACION.tiempoEstimado}
            </Text>
            <Text className="text-body text-text-secondary">
              {TEXTOS_EXPLORACION.tiempoEstimadoMinutos(
                plato.tiempoEstimadoPreparacion,
              )}
            </Text>
          </>
        ) : null}
      </View>
    </>
  );

  return (
    <>
      {/* RF019 — las reseñas de ESTE plato, con sus filtros, su galería y su
          paginación de a diez. */}
      <ListaDeResenas
        encabezado={detalle}
        origen={{ tipo: 'PLATO', publicacionId: plato.id }}
        textosVacio={{
          titulo: MENSAJES_RESENA.platoSinResenasTitulo,
          subtitulo: MENSAJES_RESENA.platoSinResenasSubtitulo,
        }}
        titulo={TEXTOS_RESENA.tituloResenasDelPlato}
      />

      {/* FUERA DE LA LISTA, y no se mueve de acá: mide su propio alto para que
          el botón flotante del carrito no le coma el toque, y es el camino más
          delicado de la app. */}
      <PieDeAccion
        noDisponible={noDisponible}
        onAlto={onAltoDelPie}
        plato={plato}
      />
    </>
  );
}

/** Imagen del plato, con la de la categoría como respaldo (US-PUB-02). */
function FotoDelPlato({ imagenUrl }: { imagenUrl: string | null }) {
  return (
    <View className="h-56 w-full items-center justify-center overflow-hidden bg-background">
      {imagenUrl ? (
        <Image
          contentFit="cover"
          source={{ uri: imagenUrl }}
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        <IconoCocinero className="text-text-disabled" size={48} />
      )}
    </View>
  );
}

/**
 * Nombre, categoría, precio, favorito, disponibilidad y valoración.
 *
 * Es el bloque con comportamiento del detalle -la mutación del favorito-, por eso
 * está separado del resto, que es presentación pura.
 */
function EncabezadoDelPlato({ plato }: { plato: PublicacionPublica }) {
  const alternarFavorito = useAlternarPublicacionFavorita();

  return (
    <View className="bg-surface px-4 py-4">
      <View className="flex-row items-start gap-3">
        <View className="flex-1">
          <Text className="text-h1 font-extrabold text-text-primary">
            {plato.nombre}
          </Text>
          <Text className="mt-0.5 text-caption text-text-secondary">
            {plato.categoria.nombre}
          </Text>
          <Text className="mt-2 text-h2 font-bold text-text-primary">
            {formatearPrecio(plato.precio)}
          </Text>
        </View>

        {/* Sexto criterio: el ícono de favorito sobre la publicación. */}
        <BotonDeFavorito
          esFavorito={plato.esFavorito}
          onPress={() => {
            alternarFavorito.mutate({
              id: plato.id,
              esFavorito: plato.esFavorito,
            });
          }}
        />
      </View>

      <View className="mt-3 flex-row items-center justify-between">
        <BadgeDeDisponibilidad estado={plato.estadoPublicacion} />
        <Valoracion
          cantidadResenas={plato.cantidadResenas}
          promedio={plato.valoracionPromedio}
        />
      </View>

      {/* Segundo criterio: "Últimas unidades" lleva ADEMÁS del badge una
          advertencia visual de stock reducido.

          `tono="informativo"` y no uno nuevo: es el único de los tres de `Aviso`
          que se dibuja en `--color-warning`, que es exactamente el token que la
          guía visual reserva para "alertas / últimas unidades". Agregar un cuarto
          tono sería sumar al sistema de diseño algo que ya existe con otro
          nombre. */}
      {plato.estadoPublicacion === 'ULTIMAS_UNIDADES' ? (
        <Aviso
          className="mt-4"
          mensaje={TEXTOS_EXPLORACION.advertenciaUltimasUnidades}
          tono="informativo"
        />
      ) : null}
    </View>
  );
}

/**
 * Séptimo criterio: el nombre del cocinero lleva a su perfil público.
 */
function SeccionDeCocinero({ plato }: { plato: PublicacionPublica }) {
  const { cocinero } = plato;

  return (
    <Pressable
      accessibilityLabel={`${cocinero.nombre} ${cocinero.apellido}`}
      accessibilityRole="button"
      className="mt-3 min-h-14 flex-row items-center gap-3 bg-surface px-4 py-3"
      onPress={() => {
        router.push({
          pathname: '/cocineros/[id]',
          params: { id: cocinero.id },
        });
      }}
    >
      <AvatarDeCocinero fotoPerfilUrl={cocinero.fotoPerfilUrl} />
      <Text className="flex-1 text-body font-semibold text-text-primary">
        {`${cocinero.nombre} ${cocinero.apellido}`}
      </Text>
    </Pressable>
  );
}

/**
 * Pie con el botón "Agregar al carrito" y los tres diálogos del flujo.
 *
 * TRES CAMINOS, todos del cuarto y quinto criterio de US-EXP-05:
 *
 *   1. El carrito está vacío o es del mismo cocinero → se agrega. Si el plato ya
 *      estaba, la API devuelve `eraNuevoItem: false` y se muestra el literal
 *      "Cantidad actualizada en tu carrito. Cantidad actual [nro]."
 *   2. El carrito es de otro cocinero → la API responde 409
 *      `CARRITO_DE_OTRO_COCINERO` y se abre el diálogo con la pregunta. "Sí,
 *      vaciar" repite la operación con `reemplazarCarrito`; "No, cancelar" no
 *      hace ningún cambio.
 *   3. El plato está "No disponible" → el botón queda deshabilitado con la
 *      indicación "Sin unidades disponibles", y el flujo no arranca (tercer
 *      criterio).
 *
 * El 409 se detecta por su CÓDIGO y no por el status: un 409 podría llegar
 * también por `CANTIDAD_MAXIMA_ALCANZADA`, y ese no es una pregunta sino un
 * error que hay que mostrar tal cual.
 */
/**
 * "Muestre el botón 'Agregar al carrito' deshabilitado con la indicación 'Sin
 * unidades disponibles'" (US-EXP-05, tercer criterio).
 */
function LeyendaSinUnidades() {
  return (
    <View className="flex-row items-center justify-center gap-2 pb-2">
      <IconoAlerta size={16} className="text-text-disabled" />
      <Text className="text-body text-text-disabled">
        {MENSAJES_EXPLORACION.sinUnidadesDisponibles}
      </Text>
    </View>
  );
}

function PieDeAccion({
  plato,
  noDisponible,
  onAlto,
}: {
  plato: PublicacionPublica;
  noDisponible: boolean;
  onAlto: (alto: number) => void;
}) {
  const agregar = useAgregarAlCarrito();
  const [preguntandoPorOtroCocinero, setPreguntando] = useState(false);
  const [mensajeDeExito, setMensajeDeExito] = useState<string | null>(null);

  const agregarAlCarrito = (reemplazarCarrito: boolean) => {
    agregar.mutate(
      { publicacionId: plato.id, reemplazarCarrito },
      {
        onSuccess: (respuesta) => {
          setPreguntando(false);
          if (!respuesta.eraNuevoItem) {
            setMensajeDeExito(
              MENSAJES_EXPLORACION.cantidadActualizada(
                respuesta.cantidadActual,
              ),
            );
          }
        },
        onError: (error) => {
          if (
            esErrorApi(error) &&
            error.codigo === 'CARRITO_DE_OTRO_COCINERO'
          ) {
            setPreguntando(true);
          }
        },
      },
    );
  };

  // Un error que NO es la pregunta del carrito ajeno se muestra en el pie: el
  // plato pudo pasar a no disponible o alcanzarse el tope de 20 unidades.
  const errorVisible =
    agregar.isError && !preguntandoPorOtroCocinero
      ? mensajeDeError(agregar.error)
      : undefined;

  return (
    <View
      className="border-t border-border bg-surface px-4 pb-2 pt-3"
      onLayout={(evento) => {
        onAlto(evento.nativeEvent.layout.height);
      }}
    >
      {errorVisible !== undefined ? (
        <Aviso className="mb-3" mensaje={errorVisible} tono="error" />
      ) : null}

      {noDisponible ? <LeyendaSinUnidades /> : null}

      <Boton
        cargando={agregar.isPending}
        deshabilitado={noDisponible}
        onPress={() => {
          agregarAlCarrito(false);
        }}
      >
        {MENSAJES_EXPLORACION.agregarAlCarrito}
      </Boton>

      <DialogosDeAgregado
        mensajeDeExito={mensajeDeExito}
        onCancelarReemplazo={() => {
          setPreguntando(false);
          agregar.reset();
        }}
        onCerrarExito={() => {
          setMensajeDeExito(null);
        }}
        onConfirmarReemplazo={() => {
          agregarAlCarrito(true);
        }}
        preguntando={preguntandoPorOtroCocinero}
        procesando={agregar.isPending}
      />
    </View>
  );
}

/**
 * Los dos diálogos del flujo de agregado, juntos.
 *
 * `DialogoSevero` con el literal de la pregunta del cuarto criterio, y
 * `DialogoExito` con el de "Cantidad actualizada..." del quinto. Están acá y no
 * en `PieDeAccion` solo para que ninguna de las dos funciones pase del umbral de
 * líneas; toda la decisión sigue viviendo en `PieDeAccion`, que es quien conoce
 * el resultado de la mutación.
 */
function DialogosDeAgregado({
  preguntando,
  procesando,
  mensajeDeExito,
  onConfirmarReemplazo,
  onCancelarReemplazo,
  onCerrarExito,
}: {
  preguntando: boolean;
  procesando: boolean;
  mensajeDeExito: string | null;
  onConfirmarReemplazo: () => void;
  onCancelarReemplazo: () => void;
  onCerrarExito: () => void;
}) {
  return (
    <>
      <DialogoSevero
        abierto={preguntando}
        onCancelar={onCancelarReemplazo}
        onConfirmar={onConfirmarReemplazo}
        procesando={procesando}
        textoCancelar={MENSAJES_EXPLORACION.carritoDeOtroCocineroCancelar}
        textoConfirmar={MENSAJES_EXPLORACION.carritoDeOtroCocineroConfirmar}
        titulo={MENSAJES_EXPLORACION.carritoDeOtroCocinero}
      />

      <DialogoExito
        abierto={mensajeDeExito !== null}
        mensaje={mensajeDeExito ?? ''}
        onCerrar={onCerrarExito}
        textoBoton={TEXTOS_EXPLORACION.aceptar}
      />
    </>
  );
}
