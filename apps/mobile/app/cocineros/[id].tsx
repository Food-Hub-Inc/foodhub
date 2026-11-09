import { useLocalSearchParams } from 'expo-router';
import { PerfilDeCocinero } from '../../src/screens/exploracion/PerfilDeCocinero';

/**
 * Perfil público del cocinero — PAN-EXP-04 (US-EXP-04).
 *
 * Fuera del grupo `(cliente)`: se abre apilada sobre la barra de tabs, igual que
 * `publicaciones/[id]` en el flujo del cocinero, para que el encabezado tenga
 * botón de volver y la pantalla no aparezca como un destino de la barra.
 */
export default function PerfilDeCocineroRuta() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PerfilDeCocinero id={id} />;
}
