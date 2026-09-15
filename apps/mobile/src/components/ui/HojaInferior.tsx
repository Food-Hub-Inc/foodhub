import {
  useCallback,
  useEffect,
  useRef,
  type ComponentRef,
  type ReactNode,
} from 'react';
import { Keyboard, BackHandler, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useResolveClassNames } from 'uniwind';

/**
 * Hoja inferior del sistema. La usa PAN-AUT-05 (cerrar sesión) y el selector
 * de origen de foto de PAN-AUT-01/PAN-AUT-02.
 *
 * POR QUÉ HOJA Y NO MODAL CENTRADO
 * ---------------------------------------------------------------------------
 * Así lo dibuja la maquetación, y la razón es ergonómica: en un teléfono el
 * pulgar llega cómodo a la mitad inferior de la pantalla. Un diálogo centrado
 * pone la acción justo donde la mano no llega sin recolocar el aparato.
 *
 * `BottomSheetModal` Y NO `BottomSheet`
 * ---------------------------------------------------------------------------
 * `BottomSheet` a secas se posiciona de forma absoluta respecto de su
 * contenedor más cercano. Cuando este componente se invoca desde adentro de
 * un `ScrollView` —como el registro, que hace scroll de varios campos— la hoja
 * queda encerrada en el lugar del formulario donde vive el campo, en vez de
 * cubrir la pantalla entera desde el borde inferior. `BottomSheetModal` monta
 * la hoja en el portal que arma `BottomSheetModalProvider` en la raíz de la
 * app (`app/_layout.tsx`), así que siempre se superpone a toda la pantalla sin
 * importar cuán anidado esté el componente que la abre.
 *
 * `enableDynamicSizing` deja que la hoja mida lo que mide su contenido. Fijar
 * una altura obliga a elegir un número que se rompe con el cuerpo de texto
 * aumentado por accesibilidad.
 */
export function HojaInferior({
  abierta,
  onCerrar,
  children,
  etiquetaAccesible,
}: {
  abierta: boolean;
  onCerrar: () => void;
  children: ReactNode;
  etiquetaAccesible: string;
}) {
  const referencia = useRef<ComponentRef<typeof BottomSheetModal>>(null);
  // `BottomSheetModal` queda montado siempre (a diferencia de `BottomSheet`),
  // así que este componente existe desde antes de que se abra la primera vez.
  // Sin esta bandera, el efecto de abajo dispara un `dismiss()` en el montaje
  // inicial —cuando `abierta` arranca en `false`— y la librería deja el estado
  // interno trabado en "cerrándose": el `present()` de la primera apertura real
  // no hace nada porque nunca hubo una apertura previa que cerrar.
  const presentada = useRef(false);
  // Distingue un cierre que la propia hoja ya ejecutó (deslizar hacia abajo,
  // tocar el fondo) de uno que hay que ordenarle desde afuera (un botón interno
  // que pone `abierta` en `false`, como "Elegir de la galería"). Sin esto, este
  // efecto vuelve a llamar `dismiss()` sobre una hoja que ya se estaba cerrando
  // sola: la librería queda con el estado interno trabado y la apertura
  // siguiente no hace nada.
  const cerradaPorGesto = useRef(false);
  const estiloBorde = useResolveClassNames('bg-border');
  const estiloSuperficie = useResolveClassNames('bg-surface');

  useEffect(() => {
    if (!abierta) return;

    const suscripcion = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        onCerrar();
        return true;
      },
    );

    return () => {
      suscripcion.remove();
    };
  }, [abierta, onCerrar]);

  useEffect(() => {
    if (abierta) {
      // Sin esto, tocar el campo mientras el teclado está abierto (por
      // ejemplo, el de categoría con la descripción todavía enfocada) deja la
      // hoja tapada detrás del teclado en Android: `present()` no lo cierra
      // por sí solo.
      Keyboard.dismiss();
      presentada.current = true;
      referencia.current?.present();
    } else if (presentada.current && !cerradaPorGesto.current) {
      referencia.current?.dismiss();
    }
    cerradaPorGesto.current = false;
  }, [abierta]);

  const manejarCierre = useCallback(() => {
    cerradaPorGesto.current = true;
    onCerrar();
  }, [onCerrar]);

  const fondo = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        // El backdrop solo recibe los toques que quedan fuera de la hoja.
        pressBehavior="close"
      />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={referencia}
      enableDynamicSizing
      onDismiss={manejarCierre}
      backdropComponent={fondo}
      backgroundStyle={estiloSuperficie}
      handleIndicatorStyle={estiloBorde}
      accessibilityLabel={etiquetaAccesible}
      enableContentPanningGesture={false}
    >
      <BottomSheetView>
        <View className="bg-surface px-6 pb-10 pt-2">{children}</View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
