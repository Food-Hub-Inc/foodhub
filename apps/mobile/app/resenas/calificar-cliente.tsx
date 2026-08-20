import { IconoEstrella } from '../../src/components/iconos';
import { PantallaPendiente } from '../../src/components/ui/PantallaPendiente';
import { PANTALLAS_PENDIENTES } from '../../src/lib/textos';

/**
 * Calificar al cliente — US-RES-02.
 *
 * Pendiente de codificación: pertenece al módulo de Reseñas. Existe como destino
 * porque US-PED-08 exige el botón "Calificar cliente" sobre un pedido completado
 * que el cocinero todavía no calificó.
 */
export default function CalificarClienteRuta() {
  const ficha = PANTALLAS_PENDIENTES.calificarCliente;

  return (
    <PantallaPendiente
      codigo={ficha.codigo}
      descripcion={ficha.descripcion}
      icono={<IconoEstrella size={34} className="text-primary" />}
      modulo={ficha.modulo}
      titulo={ficha.titulo}
    />
  );
}
