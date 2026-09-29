import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { MENSAJES_EXPLORACION, type EstadoPublicacion } from '@foodhub/shared';
import {
  IconoCocinero,
  IconoCorazon,
  IconoCorazonRelleno,
  IconoEstrella,
  IconoUsuario,
} from '../../components/iconos';
import {
  ESTILO_DISPONIBILIDAD,
  ETIQUETA_DISPONIBILIDAD,
} from '../../lib/disponibilidad';
import { TEXTOS_EXPLORACION } from '../../lib/textos';

/**
 * Piezas visuales compartidas por las cinco pantallas de Exploración.
 *
 * Van juntas en un archivo porque ninguna llega a media pantalla de código y
 * las cinco se usan en al menos tres lugares: el badge de disponibilidad
 * aparece en la tarjeta del feed, en el detalle y en el perfil del cocinero; las
 * estrellas, en el perfil, la tarjeta del mapa, las dos pestañas de favoritos y
 * la cabecera del carrito. Un archivo por pieza dejaría cinco archivos de veinte
 * líneas y un `import` por cada uno.
 *
 * Todas son PRESENTACIONALES: ninguna sabe de react-query ni de mutaciones. La
 * única con comportamiento es `BotonDeFavorito`, y lo recibe por props.
 */

/**
 * Badge de solo lectura de la disponibilidad del plato.
 *
 * El segundo criterio de US-EXP-01 exige "diferenciación visual entre
 * 'Disponible' (verde) y 'Últimas unidades' (amarillo)". El color sale de
 * `ESTILO_DISPONIBILIDAD`, el mismo mapa que usa el selector interactivo del
 * cocinero, y va SIEMPRE acompañado del texto: el color no puede ser el único
 * canal.
 *
 * Es la versión de solo lectura de `SelectorDeDisponibilidad`: el cliente ve el
 * estado, no lo cambia.
 */
export function BadgeDeDisponibilidad({
  estado,
}: {
  estado: EstadoPublicacion;
}) {
  const estilo = ESTILO_DISPONIBILIDAD[estado];

  return (
    <View className="flex-row items-center gap-1.5 self-start rounded-full border border-border px-2 py-1">
      <View className={`h-2 w-2 rounded-full ${estilo.punto}`} />
      <Text className={`text-caption font-semibold ${estilo.texto}`}>
        {ETIQUETA_DISPONIBILIDAD[estado]}
      </Text>
    </View>
  );
}

/**
 * Valoración promedio con estrella, o el literal "Sin calificaciones aún".
 *
 * El tercer criterio de US-EXP-04 fija ese texto para el caso sin reseñas: no un
 * 0, ni una estrella vacía, ni el espacio en blanco. Concentrarlo acá es lo que
 * garantiza que las cuatro pantallas que muestran una valoración lo resuelvan
 * igual.
 *
 * `cantidadResenas` es opcional porque solo el perfil del cocinero la muestra
 * ("valoración promedio con cantidad de reseñas"); la tarjeta del mapa y las
 * listas de favoritos muestran solo el promedio.
 */
export function Valoracion({
  promedio,
  cantidadResenas,
  className = '',
}: {
  promedio: number | null;
  cantidadResenas?: number;
  className?: string;
}) {
  if (promedio === null) {
    return (
      <Text className={`text-caption text-text-secondary ${className}`}>
        {MENSAJES_EXPLORACION.cocineroSinResenas}
      </Text>
    );
  }

  return (
    <View className={`flex-row items-center gap-1 ${className}`}>
      <IconoEstrella size={14} className="text-warning" />
      <Text className="text-caption font-semibold text-text-primary">
        {promedio.toFixed(1)}
      </Text>
      {cantidadResenas !== undefined ? (
        <Text className="text-caption text-text-secondary">
          {`· ${TEXTOS_EXPLORACION.cantidadResenas(cantidadResenas)}`}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Botón de favorito (US-EXP-06).
 *
 * Corazón relleno cuando está guardado, vacío cuando no: son los dos estados que
 * fijan los dos primeros criterios de la historia. El cambio inmediato lo
 * resuelve el optimismo de `useAlternarCocineroFavorito` /
 * `useAlternarPublicacionFavorita`, no este componente: acá `esFavorito` ya
 * llega actualizado.
 *
 * La etiqueta accesible cambia con el estado y describe la ACCIÓN, no el estado:
 * un lector de pantalla anuncia "Quitar de favoritos" sobre un corazón lleno,
 * que es lo que va a pasar si se toca.
 *
 * El corazón lleno va en `--color-primary` y NO en `--color-error`, aunque el
 * rojo sea el color habitual de un corazón: la guía visual reserva el error para
 * "errores y acciones destructivas", y guardar un favorito no es ninguna de las
 * dos. El vacío va en el gris de texto secundario, que lo deja legible sin
 * competir con el contenido de la tarjeta.
 */
export function BotonDeFavorito({
  esFavorito,
  onPress,
  deshabilitado = false,
}: {
  esFavorito: boolean;
  onPress: () => void;
  deshabilitado?: boolean;
}) {
  const Corazon = esFavorito ? IconoCorazonRelleno : IconoCorazon;

  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado}
      hitSlop={8}
      className="h-11 w-11 items-center justify-center rounded-full"
      accessibilityRole="button"
      accessibilityState={{ selected: esFavorito }}
      accessibilityLabel={
        esFavorito
          ? TEXTOS_EXPLORACION.quitarFavorito
          : TEXTOS_EXPLORACION.guardarFavorito
      }
    >
      <Corazon
        size={24}
        className={esFavorito ? 'text-primary' : 'text-text-secondary'}
      />
    </Pressable>
  );
}

/**
 * Miniatura de un plato, con la imagen de la categoría como respaldo.
 *
 * El orden del respaldo -imagen propia, imagen predeterminada de la categoría,
 * ícono- es el mismo que ya usa `TarjetaDePublicacion` en el módulo de
 * Publicaciones: es lo que hace que "Quitar imagen" (US-PUB-02) no deje un hueco.
 */
export function MiniaturaDePlato({
  imagenUrl,
  imagenDeCategoria,
  className = 'h-20 w-20 rounded-sm',
}: {
  imagenUrl: string | null;
  imagenDeCategoria: string | null;
  className?: string;
}) {
  const imagen = imagenUrl ?? imagenDeCategoria;

  return (
    <View
      className={`items-center justify-center overflow-hidden bg-background ${className}`}
    >
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

/** Avatar del cocinero: su foto, o el ícono de usuario si no tiene. */
export function AvatarDeCocinero({
  fotoPerfilUrl,
  tamano = 'h-10 w-10',
  onCargado,
}: {
  fotoPerfilUrl: string | null;
  tamano?: string;
  /** Avisa cuando la foto terminó de cargar (o falló): lo necesita el mapa. */
  onCargado?: () => void;
}) {
  return (
    <View
      className={`items-center justify-center overflow-hidden rounded-full bg-background ${tamano}`}
    >
      {fotoPerfilUrl ? (
        <Image
          contentFit="cover"
          onError={onCargado}
          onLoad={onCargado}
          source={{ uri: fotoPerfilUrl }}
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        <IconoUsuario className="text-text-disabled" size={20} />
      )}
    </View>
  );
}
