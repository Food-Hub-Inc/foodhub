import { HistorialDeNotificaciones } from '../src/screens/notificaciones/HistorialDeNotificaciones';

/**
 * Notificaciones — PAN-NOT-01 (US-NOT-07).
 *
 * Vive fuera de los dos grupos de tabs a propósito: la abren el cliente y el
 * cocinero por igual, desde la campana del encabezado del menú de inicio. Ponerla
 * como destino fijo de la barra habría contradicho el mockup, que la resuelve
 * con un botón en el header.
 */
export default function Notificaciones() {
  return <HistorialDeNotificaciones />;
}
