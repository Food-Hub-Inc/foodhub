import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { MENSAJES_PUBLICACION, type PublicacionListado } from '@foodhub/shared';
import {
  IconoBolsa,
  IconoCocinero,
  IconoEstrella,
  IconoTacho,
} from '../../components/iconos';
import { DialogoExito } from '../../components/ui/DialogoExito';
import { DialogoSevero } from '../../components/ui/DialogoSevero';
import {
  useCambiarDisponibilidad,
  useEliminarPublicacion,
} from '../../hooks/usePublicaciones';
import { mensajeDeError } from '../../lib/api';
import { formatearFecha, formatearPrecio } from '../../lib/formato';
import { TEXTOS_PUBLICACIONES } from '../../lib/textos';
import { SelectorDeDisponibilidad } from './SelectorDeDisponibilidad';

/**
 * Tarjeta del listado "Mis publicaciones" (US-PUB-05): imagen, nombre,
 * categoría, precio, disponibilidad, pedidos recibidos, valoración y fecha de
 * creación — las ocho columnas que exige el criterio de aceptación.
 *
 * El indicador de disponibilidad es el selector interactivo real
 * (`SelectorDeDisponibilidad`, US-PUB-04): tocarlo abre el menú de las tres
 * opciones y el cambio se aplica de inmediato, sin pasar por la pantalla de
 * detalle.
 *
 * El ícono de eliminar (US-PUB-03) es un segundo `Pressable` anidado dentro
 * del que navega al detalle -mismo patrón ya probado en esta tarjeta por
 * `SelectorDeDisponibilidad`-: el sistema de gestos de React Native resuelve
 * el toque contra el responder más interno, así que tocar el ícono nunca
 * dispara también la navegación. El criterio de aceptación exige el botón
 * "Eliminar" en esta tarjeta Y en el detalle (`DetallePublicacion`); cada uno
 * mantiene su propio diálogo porque cada uno decide algo distinto al
 * terminar (ver `useEliminarPublicacion`).
 */
export function TarjetaDePublicacion({
  publicacion,
  onPress,
}: {
  publicacion: PublicacionListado;
  onPress: () => void;
}) {
  const cambiarDisponibilidad = useCambiarDisponibilidad();
  const imagen =
    publicacion.imagenUrl ?? publicacion.categoria.imagenPredeterminadaUrl;

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 flex-row gap-3 rounded-md border border-border bg-surface p-3"
      accessibilityRole="button"
      accessibilityLabel={publicacion.nombre}
    >
      <Miniatura imagen={imagen} />

      <View className="flex-1 justify-center">
        <Encabezado publicacion={publicacion} />
        <FilaDisponibilidad
          publicacion={publicacion}
          onCambiar={(estadoPublicacion) => {
            cambiarDisponibilidad.mutate({
              publicacionId: publicacion.id,
              estadoPublicacion,
            });
          }}
        />
        <FilaResumen publicacion={publicacion} />
      </View>

      <BotonEliminarTarjeta publicacion={publicacion} />
    </Pressable>
  );
}

/**
 * Ícono de eliminar + sus dos diálogos (confirmación y éxito). Se queda en el
 * listado al terminar -a diferencia del de `DetallePublicacion`, que navega-:
 * el resto de las tarjetas sigue vigente y la invalidación de
 * `useEliminarPublicacion` ya se encarga de que esta desaparezca.
 */
function BotonEliminarTarjeta({
  publicacion,
}: {
  publicacion: PublicacionListado;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [eliminada, setEliminada] = useState(false);
  const eliminar = useEliminarPublicacion();

  return (
    <>
      <Pressable
        accessibilityLabel={TEXTOS_PUBLICACIONES.eliminar}
        accessibilityRole="button"
        className="h-8 w-8 items-center justify-center self-start rounded-sm"
        hitSlop={8}
        onPress={() => {
          setConfirmando(true);
        }}
      >
        <IconoTacho className="text-error" size={18} />
      </Pressable>

      <DialogoSevero
        abierto={confirmando}
        error={eliminar.isError ? mensajeDeError(eliminar.error) : undefined}
        mensaje={MENSAJES_PUBLICACION.confirmarEliminarMensaje(
          publicacion.nombre,
        )}
        onCancelar={() => {
          setConfirmando(false);
          eliminar.reset();
        }}
        onConfirmar={() => {
          eliminar.mutate(publicacion.id, {
            onSuccess: () => {
              setConfirmando(false);
              setEliminada(true);
            },
          });
        }}
        procesando={eliminar.isPending}
        textoCancelar={MENSAJES_PUBLICACION.confirmarEliminarBotonCancelar}
        textoConfirmar={MENSAJES_PUBLICACION.confirmarEliminarBotonConfirmar}
        titulo={MENSAJES_PUBLICACION.confirmarEliminarTitulo}
      />

      <DialogoExito
        abierto={eliminada}
        mensaje={MENSAJES_PUBLICACION.publicacionEliminada}
        onCerrar={() => {
          setEliminada(false);
        }}
        textoBoton={TEXTOS_PUBLICACIONES.aceptar}
      />
    </>
  );
}

function Miniatura({ imagen }: { imagen: string | null }) {
  return (
    <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-sm bg-background">
      {imagen ? (
        <Image
          contentFit="cover"
          source={{ uri: imagen }}
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        <IconoCocinero className="text-text-disabled" size={28} />
      )}
    </View>
  );
}

function Encabezado({ publicacion }: { publicacion: PublicacionListado }) {
  return (
    <>
      <Text className="text-h2 font-bold text-text-primary" numberOfLines={1}>
        {publicacion.nombre}
      </Text>
      <Text
        className="mt-0.5 text-caption text-text-secondary"
        numberOfLines={1}
      >
        {publicacion.categoria.nombre}
      </Text>
      <Text className="mt-1 text-body font-bold text-text-primary">
        {formatearPrecio(publicacion.precio)}
      </Text>
    </>
  );
}

/**
 * Selector de disponibilidad (US-PUB-04) + la etiqueta adicional "Sin
 * unidades" cuando corresponde, a la izquierda; valoración a la derecha (ver
 * la Decisión 1 del plan del módulo: siempre `null` hoy, así que no se
 * dibuja todavía).
 */
function FilaDisponibilidad({
  publicacion,
  onCambiar,
}: {
  publicacion: PublicacionListado;
  onCambiar: (estado: PublicacionListado['estadoPublicacion']) => void;
}) {
  return (
    <View className="mt-2 flex-row items-center justify-between">
      <View className="flex-row items-center gap-2">
        <SelectorDeDisponibilidad
          valor={publicacion.estadoPublicacion}
          onCambiar={onCambiar}
        />

        {/* US-PUB-04, último criterio de "No disponible": además del
            selector, la tarjeta lleva esta etiqueta adicional (ver la nota
            [PROPIO] de `sinUnidades` en `TEXTOS_PUBLICACIONES`). */}
        {publicacion.estadoPublicacion === 'NO_DISPONIBLE' ? (
          <View className="rounded-full bg-border px-2 py-1">
            <Text className="text-caption font-semibold text-text-disabled">
              {TEXTOS_PUBLICACIONES.sinUnidades}
            </Text>
          </View>
        ) : null}
      </View>

      {publicacion.valoracionPromedio !== null ? (
        <View className="flex-row items-center gap-1">
          <IconoEstrella size={14} className="text-warning" />
          <Text className="text-caption text-text-secondary">
            {publicacion.valoracionPromedio.toFixed(1)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function FilaResumen({ publicacion }: { publicacion: PublicacionListado }) {
  return (
    <View className="mt-1.5 flex-row items-center justify-between">
      <View className="flex-row items-center gap-1.5">
        <IconoBolsa size={14} className="text-text-disabled" />
        <Text className="text-caption text-text-secondary">
          {TEXTOS_PUBLICACIONES.pedidosRecibidos(publicacion.cantidadPedidos)}
        </Text>
      </View>
      <Text className="text-caption text-text-disabled">
        {formatearFecha(publicacion.fechaCreacion)}
      </Text>
    </View>
  );
}
