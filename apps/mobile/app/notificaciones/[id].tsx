import { useLocalSearchParams } from 'expo-router';
import { DetalleDeAviso } from '../../src/screens/notificaciones/DetalleDeAviso';

/**
 * PAN-NOT-03 · Detalle del aviso (US-NOT-04). Cuelga de `/notificaciones`
 * porque el criterio lo ubica "dentro del historial de notificaciones".
 */
export default function DetalleDeAvisoRuta() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <DetalleDeAviso id={id} />;
}
