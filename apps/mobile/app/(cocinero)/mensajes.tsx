import { ListaDeConversaciones } from '../../src/screens/mensajeria/ListaDeConversaciones';

/**
 * Mensajes del cocinero — PAN-MSG-01 · US-MSG-04.
 *
 * Sin el acceso a "Explorar cocineros" del estado vacío: el criterio lo reserva
 * para el cliente. Al cocinero las conversaciones le llegan desde su perfil
 * público o desde un pedido; no las inicia él.
 */
export default function MensajesDelCocinero() {
  return <ListaDeConversaciones esCliente={false} />;
}
