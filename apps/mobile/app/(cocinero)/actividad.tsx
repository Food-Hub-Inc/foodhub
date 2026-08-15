import { IconoReloj } from '../../src/components/iconos';
import { PantallaPendiente } from '../../src/components/ui/PantallaPendiente';
import { PANTALLAS_PENDIENTES } from '../../src/lib/textos';

/**
 * Mi actividad — PAN-DASH-01.
 *
 * Pendiente de codificación: pertenece al módulo de Dashboard del cocinero, que se desarrolla
 * en un sprint posterior al de los módulos transversales. La pantalla anuncia
 * su código y qué va a hacer, para que el destino exista y se pueda navegar el
 * shell completo sin encontrarse con una pantalla en blanco.
 */
export default function Actividad() {
  const ficha = PANTALLAS_PENDIENTES.actividad;

  return (
    <PantallaPendiente
      codigo={ficha.codigo}
      descripcion={ficha.descripcion}
      icono={<IconoReloj size={34} className="text-primary" />}
      modulo={ficha.modulo}
      titulo={ficha.titulo}
    />
  );
}
