import { IconoBolsa } from '../../src/components/iconos';
import { PantallaPendiente } from '../../src/components/ui/PantallaPendiente';
import { PANTALLAS_PENDIENTES } from '../../src/lib/textos';

/**
 * Mis pedidos — PAN-PED-05.
 *
 * Pendiente de codificación: pertenece al módulo de Pedidos, que se desarrolla
 * en un sprint posterior al de los módulos transversales. La pantalla anuncia
 * su código y qué va a hacer, para que el destino exista y se pueda navegar el
 * shell completo sin encontrarse con una pantalla en blanco.
 */
export default function PedidosDelCliente() {
  const ficha = PANTALLAS_PENDIENTES.pedidosCliente;

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
