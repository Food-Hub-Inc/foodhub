import { IconoBolsa } from '../../src/components/iconos';
import { PantallaPendiente } from '../../src/components/ui/PantallaPendiente';
import { PANTALLAS_PENDIENTES } from '../../src/lib/textos';

/**
 * Pedidos recibidos — PAN-PED-04.
 *
 * Pendiente de codificación: pertenece al módulo de Pedidos, que se desarrolla
 * en un sprint posterior al de los módulos transversales. La pantalla anuncia
 * su código y qué va a hacer, para que el destino exista y se pueda navegar el
 * shell completo sin encontrarse con una pantalla en blanco.
 */
export default function PedidosDelCocinero() {
  const ficha = PANTALLAS_PENDIENTES.pedidosCocinero;

  return (
    <PantallaPendiente
      codigo={ficha.codigo}
      descripcion={ficha.descripcion}
      icono={<IconoBolsa size={34} className="text-primary" />}
      modulo={ficha.modulo}
      titulo={ficha.titulo}
    />
  );
}
