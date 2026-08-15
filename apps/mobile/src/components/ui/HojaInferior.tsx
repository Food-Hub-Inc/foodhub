import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { View } from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useResolveClassNames } from 'uniwind';

/**
 * Hoja inferior del sistema. La usa PAN-AUT-05 (cerrar sesión).
 *
 * POR QUÉ HOJA Y NO MODAL CENTRADO
 * ---------------------------------------------------------------------------
 * Así lo dibuja la maquetación, y la razón es ergonómica: en un teléfono el
 * pulgar llega cómodo a la mitad inferior de la pantalla. Un diálogo centrado
 * pone la acción justo donde la mano no llega sin recolocar el aparato.
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
  const referencia = useRef<BottomSheet>(null);
  const estiloBorde = useResolveClassNames('bg-border');
  const estiloSuperficie = useResolveClassNames('bg-surface');

  useEffect(() => {
    if (abierta) referencia.current?.expand();
    else referencia.current?.close();
  }, [abierta]);

  const fondo = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        // Tocar fuera cierra: es la salida que el usuario intenta primero.
        pressBehavior="close"
      />
    ),
    [],
  );

  if (!abierta) return null;

  return (
    <BottomSheet
      ref={referencia}
      index={0}
      enablePanDownToClose
      enableDynamicSizing
      onClose={onCerrar}
      backdropComponent={fondo}
      backgroundStyle={estiloSuperficie}
      handleIndicatorStyle={estiloBorde}
      accessibilityLabel={etiquetaAccesible}
    >
      <BottomSheetView>
        <View className="px-6 pb-10 pt-2">{children}</View>
      </BottomSheetView>
    </BottomSheet>
  );
}
