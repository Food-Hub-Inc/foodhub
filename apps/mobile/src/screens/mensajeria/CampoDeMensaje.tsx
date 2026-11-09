import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useResolveClassNames } from 'uniwind';
import { MAXIMO_CARACTERES_MENSAJE } from '@foodhub/shared';
import { IconoCamara, IconoSobre } from '../../components/iconos';
import { TEXTOS_MENSAJERIA } from '../../lib/textos';

/**
 * Campo de entrada de PAN-MSG-02 (US-MSG-02 y US-MSG-03).
 *
 * Tres criterios de aceptación viven en este componente:
 *
 *   "El usuario intenta enviar un mensaje vacío o solo con espacios en blanco →
 *   mantenga el botón 'Enviar' deshabilitado. La validación se ejecute EN TIEMPO
 *   REAL a medida que el usuario escribe."
 *
 *   "El usuario ingresa un texto que supera los 2000 caracteres → muestre un
 *   contador en la parte inferior derecha del campo EN COLOR ROJO y deshabilite
 *   el botón 'Enviar' hasta que el texto se reduzca al límite permitido."
 *
 *   "El usuario presiona el ícono de adjuntar → muestre las opciones 'Tomar
 *   foto' y 'Elegir de la galería'."
 *
 * EL CAMPO NO CORTA EL TEXTO A 2000 CARACTERES con `maxLength`. El criterio pide
 * mostrar el contador en rojo y deshabilitar el envío "hasta que el texto se
 * reduzca", lo que implica que el exceso se puede escribir y se ve: truncarlo en
 * silencio le comería palabras al usuario sin decirle nada.
 *
 * EL CONTADOR APARECE RECIÉN AL PASARSE. Un contador permanente sobre un límite
 * de 2000 caracteres es ruido en una pantalla donde el mensaje típico tiene
 * veinte.
 */
export function CampoDeMensaje({
  onEnviar,
  onAdjuntar,
  onEscribiendo,
  deshabilitado,
}: {
  onEnviar: (texto: string) => void;
  onAdjuntar: () => void;
  onEscribiendo: () => void;
  deshabilitado: boolean;
}) {
  const [texto, setTexto] = useState('');

  const estiloPlaceholder = useResolveClassNames('text-text-disabled');
  const colorPlaceholder =
    typeof estiloPlaceholder.color === 'string'
      ? estiloPlaceholder.color
      : undefined;

  /**
   * Se mide el texto RECORTADO, igual que lo valida el schema compartido: una
   * cadena de espacios no habilita el envío, y los espacios del final no
   * cuentan contra el límite porque tampoco se guardan.
   */
  const limpio = texto.trim();
  const excedido = limpio.length > MAXIMO_CARACTERES_MENSAJE;
  const puedeEnviar = limpio.length > 0 && !excedido && !deshabilitado;

  const enviar = () => {
    if (!puedeEnviar) return;
    onEnviar(limpio);
    setTexto('');
  };

  return (
    <View className="border-t border-border bg-surface px-3 py-2">
      <View className="flex-row items-end gap-2">
        <Pressable
          accessibilityLabel={TEXTOS_MENSAJERIA.adjuntarImagen}
          accessibilityRole="button"
          accessibilityState={{ disabled: deshabilitado }}
          className="h-11 w-11 items-center justify-center"
          disabled={deshabilitado}
          onPress={onAdjuntar}
        >
          <IconoCamara
            className={deshabilitado ? 'text-text-disabled' : 'text-primary'}
            size={22}
          />
        </Pressable>

        <TextInput
          accessibilityLabel={TEXTOS_MENSAJERIA.escribiUnMensaje}
          className="max-h-28 min-h-11 flex-1 rounded-md border border-border bg-background px-3 py-2 text-body text-text-primary"
          editable={!deshabilitado}
          multiline
          onChangeText={(valor) => {
            setTexto(valor);
            onEscribiendo();
          }}
          placeholder={TEXTOS_MENSAJERIA.escribiUnMensaje}
          placeholderTextColor={colorPlaceholder}
          value={texto}
        />

        <Pressable
          accessibilityLabel={TEXTOS_MENSAJERIA.enviarMensajeAccesible}
          accessibilityRole="button"
          accessibilityState={{ disabled: !puedeEnviar }}
          className="h-11 w-11 items-center justify-center"
          disabled={!puedeEnviar}
          onPress={enviar}
        >
          <IconoSobre
            className={puedeEnviar ? 'text-primary' : 'text-text-disabled'}
            size={22}
          />
        </Pressable>
      </View>

      {excedido ? (
        <Text
          accessibilityLiveRegion="polite"
          className="mt-1 text-right text-caption font-semibold text-error"
        >
          {`${String(limpio.length)} / ${String(MAXIMO_CARACTERES_MENSAJE)}`}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Barra que reemplaza al campo cuando la conversación no admite mensajes
 * nuevos (US-MSG-01 y US-MSG-07).
 *
 * Los dos criterios piden lo mismo: "no habilite el campo de entrada" y
 * "deshabilite el campo de entrada de mensajes y muestre el mensaje". Se
 * reemplaza en lugar de mostrarlo gris para que el motivo quede escrito: un
 * campo apagado sin explicación se lee como un error de la app.
 */
export function AvisoDeBloqueo({ mensaje }: { mensaje: string }) {
  return (
    <View className="border-t border-border bg-surface px-4 py-4">
      <Text
        accessibilityLiveRegion="polite"
        className="text-center text-body text-text-secondary"
      >
        {mensaje}
      </Text>
    </View>
  );
}
