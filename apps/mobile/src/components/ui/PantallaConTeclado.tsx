import type { ReactNode } from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useResolveClassNames } from 'uniwind';

/**
 * Contenedor con scroll de las pantallas que tienen formulario.
 *
 * POR QUÉ NO ALCANZA CON UN ScrollView
 * ---------------------------------------------------------------------------
 * Con el teclado abierto, Android no achica la ventana de una app que dibuja
 * de borde a borde: el teclado se superpone. El `ScrollView` no se entera, así
 * que el campo enfocado y el botón de enviar quedaban tapados en casi todos los
 * formularios de la app. El `KeyboardAvoidingView` del core tampoco lo resuelve
 * —en Android su `behavior` no hace nada útil— y por eso el proyecto pasó a
 * `react-native-keyboard-controller`, que sí lee la altura real del teclado.
 *
 * POR QUÉ EL ESTILO SE RESUELVE A MANO
 * ---------------------------------------------------------------------------
 * `contentContainerClassName` lo entienden los componentes de React Native que
 * uniwind parchea, y este viene de una librería de terceros. Se traduce la
 * clase a estilo con `useResolveClassNames` —el mismo camino que ya usa
 * `HojaInferior` para el fondo de la hoja— y se pasa como `contentContainerStyle`.
 */

/**
 * Aire entre el campo enfocado y el borde del teclado. Sin esto el input queda
 * pegado a la tecla de arriba y no se ve qué se está escribiendo.
 */
const AIRE_SOBRE_EL_TECLADO = 24;

export function PantallaConTeclado({
  children,
  contentContainerClassName = '',
}: {
  children: ReactNode;
  contentContainerClassName?: string;
}) {
  const estiloDelContenido = useResolveClassNames(contentContainerClassName);

  return (
    <KeyboardAwareScrollView
      bottomOffset={AIRE_SOBRE_EL_TECLADO}
      contentContainerStyle={estiloDelContenido}
      /* Un toque sobre un botón con el teclado abierto tiene que activarlo, y
         no consumirse en cerrar el teclado. */
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </KeyboardAwareScrollView>
  );
}
