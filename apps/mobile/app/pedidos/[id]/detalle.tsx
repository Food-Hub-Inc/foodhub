import { DetalleDePedido } from '../../../src/screens/pedidos/DetalleDePedido';

/**
 * Detalle del pedido — PAN-PED-06 (cliente, US-PED-07) y PAN-PED-04.6
 * (cocinero, US-PED-08).
 *
 * Una sola ruta para las dos partes: la pantalla resuelve qué mostrar con el rol
 * de la sesión, y la API ya verifica que quien pide sea parte del pedido.
 */
export default function DetalleDePedidoRuta() {
  return <DetalleDePedido />;
}
