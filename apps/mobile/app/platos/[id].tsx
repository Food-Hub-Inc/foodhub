import { useLocalSearchParams } from 'expo-router';
import { DetalleDePlato } from '../../src/screens/exploracion/DetalleDePlato';

/**
 * Detalle de la publicación — PAN-EXP-05 (US-EXP-05).
 *
 * La ruta es `platos/[id]` y no `publicaciones/[id]`: esa última ya existe y es
 * el detalle que el COCINERO ve de su propio plato (PAN-PUB-01), con editar y
 * eliminar. Son dos pantallas distintas para dos roles distintos.
 */
export default function DetalleDePlatoRuta() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <DetalleDePlato id={id} />;
}
