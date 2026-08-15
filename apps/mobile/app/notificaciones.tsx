import { IconoCampana } from '../src/components/iconos';
import { PantallaPendiente } from '../src/components/ui/PantallaPendiente';
import { PANTALLAS_PENDIENTES } from '../src/lib/textos';

/**
 * Notificaciones — PAN-NOT-01.
 *
 * Vive fuera de los dos grupos de tabs a propósito: la abren el cliente y el
 * cocinero por igual, desde la campana del encabezado. Ponerla como destino
 * fijo de la barra habría contradicho el mockup del feed, que la resuelve con
 * un botón en el header.
 *
 * Pendiente de codificación: el módulo de Notificaciones y Alertas se desarrolla
 * en un sprint posterior.
 */
export default function Notificaciones() {
  const ficha = PANTALLAS_PENDIENTES.notificaciones;

  return (
    <PantallaPendiente
      codigo={ficha.codigo}
      descripcion={ficha.descripcion}
      icono={<IconoCampana size={34} className="text-primary" />}
      modulo={ficha.modulo}
      titulo={ficha.titulo}
    />
  );
}
