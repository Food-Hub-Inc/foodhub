import { useLocalSearchParams } from 'expo-router';
import { CapituloManual } from '../../../src/screens/ayuda/CapituloManual';

/**
 * Detalle del capítulo del manual de usuario (US-AYU-01).
 */
export default function CapituloManualRuta() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CapituloManual capituloId={id} />;
}
