import type { ReactNode } from 'react';
import type { Edge } from 'react-native-safe-area-context';
import { SafeAreaView } from './SafeAreaView';

/**
 * `SafeAreaView` de toda pantalla raíz de una tab (cocinero y cliente).
 *
 * Sin `bottom` en los `edges`: esa franja ya la reserva y pinta `NativeTabs`
 * (ver `app/(cocinero)/_layout.tsx` y `app/(cliente)/_layout.tsx`), con su
 * propio fondo blanco (`bg-surface`). Con el edge por defecto, `SafeAreaView`
 * suma ADEMÁS su propio padding inferior -del alto del inset del gesto del
 * sistema- pintado con el fondo de la pantalla (`bg-background`): una franja
 * del fondo general pegada arriba de la barra, encima del blanco que ya la
 * cubre.
 *
 * Las pantallas SIN tab (detalle, edición, alta, etc.) siguen usando
 * `SafeAreaView` directo: a esas no las cubre ninguna barra propia, así que
 * sí necesitan su propio inset inferior.
 */
const EDGES_SIN_BARRA_DE_TAB: Edge[] = ['top', 'left', 'right'];

export function PantallaDeTab({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView
      className="flex-1 bg-background"
      edges={EDGES_SIN_BARRA_DE_TAB}
    >
      {children}
    </SafeAreaView>
  );
}
