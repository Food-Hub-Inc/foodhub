import { useLocalSearchParams } from 'expo-router';
import { Conversacion } from '../../src/screens/mensajeria/Conversacion';

/**
 * Conversación — PAN-MSG-02.
 *
 * Fuera de los grupos `(cliente)` y `(cocinero)`: la pantalla es la MISMA para
 * los dos roles —US-MSG-02, US-MSG-03 y US-MSG-05 tienen como actor a "Cliente /
 * Cocinero"— y se entra a ella desde cuatro lugares distintos (el listado de
 * mensajes de cada rol, el perfil del cocinero y el detalle del pedido).
 * Duplicarla en los dos grupos daría dos rutas para el mismo chat.
 */
export default function PantallaDeConversacion() {
  const { conversacionId } = useLocalSearchParams<{ conversacionId: string }>();

  return <Conversacion conversacionId={conversacionId} />;
}
