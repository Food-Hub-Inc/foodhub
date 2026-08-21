import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { Mensaje } from '@foodhub/shared';
import { formatearHora } from '../../lib/formato';
import { TEXTOS_MENSAJERIA } from '../../lib/textos';
import type { MensajePendiente } from '../../hooks/useEnvioDeMensajes';
import type { EstadoVisible } from './formato';
import { EstadoDelMensaje } from './Piezas';

/**
 * Una burbuja del chat (US-MSG-02 y US-MSG-03).
 *
 * "Muestre el mensaje de forma inmediata como burbuja alineada según el
 * remitente, con la hora de envío y un indicador de estado."
 *
 * EL INDICADOR SÓLO VA EN LAS BURBUJAS PROPIAS. En un mensaje recibido no
 * significa nada: el estado describe el viaje del mensaje HACIA el otro, y
 * mostrarlo en los dos lados haría que el usuario viera "Leído" sobre algo que
 * leyó él mismo.
 *
 * LA IMAGEN OCUPA UNA RELACIÓN FIJA mientras carga. Sin alto reservado, cada
 * imagen que termina de bajar empuja el hilo hacia arriba y el usuario pierde el
 * renglón que estaba leyendo.
 */

const ALTO_DE_IMAGEN = 200;

function Contenedor({
  propio,
  children,
}: {
  propio: boolean;
  children: React.ReactNode;
}) {
  return (
    <View className={`px-4 py-1 ${propio ? 'items-end' : 'items-start'}`}>
      <View
        className={`max-w-[80%] gap-1 rounded-md border p-2.5 ${
          propio ? 'border-primary bg-primary/10' : 'border-border bg-surface'
        }`}
      >
        {children}
      </View>
    </View>
  );
}

/** Pie común: la hora y, en las propias, el indicador de estado. */
function PieDeBurbuja({
  fechaEnvio,
  estado,
}: {
  fechaEnvio: string;
  estado?: EstadoVisible;
}) {
  return (
    <View className="flex-row items-center justify-end gap-2">
      <Text className="text-caption text-text-secondary">
        {formatearHora(fechaEnvio)}
      </Text>
      {estado ? <EstadoDelMensaje estado={estado} /> : null}
    </View>
  );
}

/** Una burbuja ya confirmada por la API. */
export function BurbujaDeMensaje({
  mensaje,
  propio,
  onVerImagen,
}: {
  mensaje: Mensaje;
  propio: boolean;
  onVerImagen: (imagenUrl: string) => void;
}) {
  return (
    <Contenedor propio={propio}>
      {mensaje.tipo === 'IMAGEN' && mensaje.imagenUrl ? (
        <Pressable
          accessibilityLabel={TEXTOS_MENSAJERIA.verImagenAmpliada}
          accessibilityRole="imagebutton"
          onPress={() => {
            onVerImagen(mensaje.imagenUrl!);
          }}
        >
          <Image
            contentFit="cover"
            source={{ uri: mensaje.imagenUrl }}
            style={{ width: 220, height: ALTO_DE_IMAGEN, borderRadius: 10 }}
          />
        </Pressable>
      ) : null}

      {(mensaje.contenido ?? mensaje.pieDeImagen) ? (
        <Text className="text-body text-text-primary">
          {mensaje.contenido ?? mensaje.pieDeImagen}
        </Text>
      ) : null}

      <PieDeBurbuja
        estado={propio ? mensaje.estado : undefined}
        fechaEnvio={mensaje.fechaEnvio}
      />
    </Contenedor>
  );
}

/**
 * Una burbuja que todavía no existe en la base: se dibuja desde el borrador.
 *
 * US-MSG-03: al fallar muestra "No se pudo enviar" y "al tocar el ícono,
 * reintente el envío automáticamente". Por eso toda la burbuja es tocable
 * cuando está en error, y no sólo el ícono: en un teléfono un área de 12 px es
 * imposible de acertar, y la guía del proyecto fija 44 px como mínimo.
 */
export function BurbujaPendiente({
  pendiente,
  onReintentar,
}: {
  pendiente: MensajePendiente;
  onReintentar: () => void;
}) {
  const { borrador } = pendiente;
  const enError = pendiente.estado === 'ERROR';

  const contenido = (
    <Contenedor propio>
      {borrador.tipo === 'IMAGEN' ? (
        <Image
          contentFit="cover"
          source={{ uri: borrador.foto.uri }}
          style={{ width: 220, height: ALTO_DE_IMAGEN, borderRadius: 10 }}
        />
      ) : null}

      {borrador.tipo === 'TEXTO' || borrador.pieDeImagen ? (
        <Text className="text-body text-text-primary">
          {borrador.tipo === 'TEXTO'
            ? borrador.contenido
            : borrador.pieDeImagen}
        </Text>
      ) : null}

      <PieDeBurbuja
        estado={pendiente.estado}
        fechaEnvio={pendiente.fechaEnvio}
      />
    </Contenedor>
  );

  if (!enError) return contenido;

  return (
    <Pressable
      accessibilityLabel={TEXTOS_MENSAJERIA.reintentarEnvio}
      accessibilityRole="button"
      onPress={onReintentar}
    >
      {contenido}
    </Pressable>
  );
}
