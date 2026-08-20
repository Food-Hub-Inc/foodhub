import { IconoEstrella } from '../../src/components/iconos';
import { PantallaPendiente } from '../../src/components/ui/PantallaPendiente';
import { PANTALLAS_PENDIENTES } from '../../src/lib/textos';

/**
 * Dejar reseña — PAN-RES-01 · US-RES-01.
 *
 * Pendiente de codificación: pertenece al módulo de Reseñas. Existe como destino
 * porque el de Pedidos ya la necesita: US-PED-06 y US-PED-07 exigen el botón
 * "Dejar reseña" sobre un pedido completado sin reseñar.
 */
export default function DejarResenaRuta() {
  const ficha = PANTALLAS_PENDIENTES.dejarResena;

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
