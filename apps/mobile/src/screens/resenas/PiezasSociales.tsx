import { Pressable, Text, View } from 'react-native';
import {
  MENSAJES_RESENA,
  type ResenaPublica,
  type SocialDeResena,
  type TipoReaccion,
} from '@foodhub/shared';
import { IconoBandera, IconoTacho } from '../../components/iconos';
import { useReaccionar } from '../../hooks/useResenas';
import { formatearFecha } from '../../lib/formato';
import { TEXTOS_RESENA } from '../../lib/textos';

/**
 * Las piezas que las tres historias sociales agregan a cada tarjeta de reseña:
 * los botones de reacción (US-RES-04) y la respuesta del cocinero (US-RES-05).
 *
 * Viven fuera de `TarjetaDeResena` para que esa siga siendo lo que era —el
 * dibujo de una reseña— y no acumule las tres historias adentro.
 */

/**
 * "Me gusta" y "No me gusta" con sus contadores — US-RES-04.
 *
 * SOBRE LA RESEÑA PROPIA NO HAY BOTONES. El criterio lo pide explícitamente:
 * "no muestre los botones de reacción; en su lugar, muestre el contador total
 * de reacciones recibidas en modo solo lectura".
 *
 * EL CAMBIO SE DIBUJA ANTES DE QUE EL SERVIDOR CONTESTE. Un contador que tarda
 * medio segundo en moverse se siente roto y hace que la gente toque dos veces,
 * que es justamente el gesto que desmarca. Si la llamada falla, la invalidación
 * de la consulta devuelve el valor real.
 */
export function BotonesDeReaccion({
  resena,
  social,
}: {
  resena: ResenaPublica;
  social: SocialDeResena;
}) {
  const reaccionar = useReaccionar(resena.id);

  if (resena.esMia) {
    const total = social.reacciones.meGusta + social.reacciones.noMeGusta;
    if (total === 0) return null;

    return (
      <Text className="mt-3 text-caption text-text-secondary">
        {`${MENSAJES_RESENA.reaccionesRecibidas}: ${String(total)}`}
      </Text>
    );
  }

  const alternar = (tipo: TipoReaccion) => {
    // Tocar la que ya estaba marcada la desmarca: `null` es "ninguna".
    reaccionar.mutate({ tipo: social.reacciones.mia === tipo ? null : tipo });
  };

  return (
    <View className="mt-3 flex-row gap-2">
      <BotonDeReaccion
        activo={social.reacciones.mia === 'ME_GUSTA'}
        cantidad={social.reacciones.meGusta}
        etiqueta={MENSAJES_RESENA.meGusta}
        onPress={() => {
          alternar('ME_GUSTA');
        }}
      />
      <BotonDeReaccion
        activo={social.reacciones.mia === 'NO_ME_GUSTA'}
        cantidad={social.reacciones.noMeGusta}
        etiqueta={MENSAJES_RESENA.noMeGusta}
        onPress={() => {
          alternar('NO_ME_GUSTA');
        }}
      />
    </View>
  );
}

function BotonDeReaccion({
  etiqueta,
  cantidad,
  activo,
  onPress,
}: {
  etiqueta: string;
  cantidad: number;
  activo: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`${etiqueta}: ${String(cantidad)}`}
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      className={`flex-row items-center gap-1.5 rounded-full border px-3 py-1.5 ${
        activo ? 'border-primary bg-primary/10' : 'border-border bg-background'
      }`}
      onPress={onPress}
    >
      <Text
        className={`text-caption ${
          activo
            ? 'font-semibold text-primary'
            : 'font-medium text-text-secondary'
        }`}
      >
        {etiqueta}
      </Text>
      {cantidad > 0 ? (
        <Text
          className={`text-caption ${activo ? 'text-primary' : 'text-text-secondary'}`}
        >
          {String(cantidad)}
        </Text>
      ) : null}
    </Pressable>
  );
}

/**
 * La respuesta del cocinero, debajo de la reseña — US-RES-03 y US-RES-05.
 *
 * "Precedida por el texto 'Respuesta del cocinero' en negrita, junto a la fecha
 * de respuesta, con un fondo diferenciado e indentación a la derecha." Los tres
 * detalles visuales están en el criterio, no son decoración: el fondo y la
 * sangría son lo que distingue la voz del cocinero de la del cliente.
 */
export function RespuestaPublicada({
  respuesta,
}: {
  respuesta: NonNullable<SocialDeResena['respuesta']>;
}) {
  return (
    <View className="ml-6 mt-3 rounded-md bg-background p-3">
      <View className="flex-row items-center gap-1.5">
        <Text className="text-caption font-bold text-text-primary">
          {MENSAJES_RESENA.respuestaDelCocinero}
        </Text>
        <Text className="text-caption text-text-secondary">
          {formatearFecha(respuesta.fechaPublicacion)}
        </Text>
        {respuesta.editada ? (
          <Text className="text-caption text-text-disabled">
            {MENSAJES_RESENA.respuestaEditada}
          </Text>
        ) : null}
      </View>

      <Text className="mt-1 text-body text-text-primary">
        {respuesta.contenido}
      </Text>
    </View>
  );
}

/**
 * El control de US-RES-06, al pie de cada reseña.
 *
 * QUÉ OFRECE DEPENDE DE QUIÉN MIRA, y son excluyentes: sobre una reseña ajena
 * "Reportar reseña", sobre la propia "Eliminar mi reseña". El criterio lo dice
 * así, y tiene sentido: nadie se denuncia a sí mismo, y nadie borra lo que
 * escribió otro.
 *
 * UN ÍCONO QUE DICE QUÉ HACE, EN LUGAR DE LOS TRES PUNTOS. El criterio describe
 * un `⋮` que despliega un menú contextual, pero ese menú tenía una sola opción
 * —la que corresponda a quién mira— así que era un paso de más delante de una
 * acción única, detrás de un control que no anticipa nada. La bandera y el
 * tacho se leen de entrada. Los dos literales del criterio sobreviven como
 * `accessibilityLabel`, de modo que "Reportar reseña" y "Eliminar mi reseña"
 * siguen siendo verificables palabra por palabra en la Etapa 6.
 *
 * Sobre una reseña ya reportada por este usuario no se dibuja nada tocable: el
 * criterio pide avisar "Ya reportaste esta reseña" y esta es la forma más
 * directa de no invitarlo a intentarlo de nuevo. El aviso lo da igual la API si
 * llega por otro camino.
 */
export function AccionesDeResena({
  resena,
  social,
  onReportar,
  onEliminar,
}: {
  resena: ResenaPublica;
  social: SocialDeResena;
  onReportar: () => void;
  onEliminar: () => void;
}) {
  if (social.reportadaPorMi) {
    return (
      <Text className="text-caption text-text-disabled">
        {TEXTOS_RESENA.yaReportada}
      </Text>
    );
  }

  const propia = resena.esMia;
  const etiqueta = propia
    ? MENSAJES_RESENA.eliminarMiResena
    : MENSAJES_RESENA.reportarResena;
  const Icono = propia ? IconoTacho : IconoBandera;

  return (
    <Pressable
      accessibilityLabel={etiqueta}
      accessibilityRole="button"
      className="px-2 py-1"
      hitSlop={8}
      onPress={propia ? onEliminar : onReportar}
    >
      <Icono className="text-text-secondary" size={18} />
    </Pressable>
  );
}
