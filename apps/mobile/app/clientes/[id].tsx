import { useLocalSearchParams } from 'expo-router';
import { PerfilDeCliente } from '../../src/screens/perfiles/PerfilDeCliente';

/**
 * Perfil público del cliente — cuarto criterio de US-DASH-03.
 *
 * Se entra desde el listado de clientes recurrentes del dashboard
 * (PAN-DASH-01) y desde la ficha del cliente en el detalle del pedido.
 *
 * Fuera del grupo `(cocinero)`: se apila sobre la barra de tabs, igual que
 * `cocineros/[id]`. Por eso mismo es alcanzable por enlace directo, y la
 * pantalla verifica el rol además del `requiereRol('COCINERO')` de la API.
 */
export default function PerfilDeClienteRuta() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  return <PerfilDeCliente id={id} />;
}
