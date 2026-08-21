import { ListaDeConversaciones } from '../../src/screens/mensajeria/ListaDeConversaciones';

/**
 * Mensajes del cliente — PAN-MSG-01 · US-MSG-04.
 *
 * `esCliente` decide una sola cosa: si el estado vacío ofrece el acceso para
 * explorar cocineros, que el criterio pide "en el caso del cliente". Todo lo
 * demás del listado es idéntico para los dos roles.
 */
export default function MensajesDelCliente() {
  return <ListaDeConversaciones esCliente />;
}
