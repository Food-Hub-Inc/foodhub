import { IconoMapa } from '../../src/components/iconos';
import { PantallaPendiente } from '../../src/components/ui/PantallaPendiente';
import { PANTALLAS_PENDIENTES } from '../../src/lib/textos';

/**
 * Mapa — PAN-EXP-02.
 *
 * Pendiente de codificación: pertenece al módulo de Exploración y búsqueda, que se desarrolla
 * en un sprint posterior al de los módulos transversales. La pantalla anuncia
 * su código y qué va a hacer, para que el destino exista y se pueda navegar el
 * shell completo sin encontrarse con una pantalla en blanco.
 */
export default function Mapa() {
  const ficha = PANTALLAS_PENDIENTES.mapa;

  return (
    <PantallaPendiente
      codigo={ficha.codigo}
      descripcion={ficha.descripcion}
      icono={<IconoMapa size={34} className="text-primary" />}
      modulo={ficha.modulo}
      titulo={ficha.titulo}
    />
  );
}
