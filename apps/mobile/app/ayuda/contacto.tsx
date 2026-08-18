import { IconoSobre } from '../../src/components/iconos';
import { PantallaPendiente } from '../../src/components/ui/PantallaPendiente';
import { PANTALLAS_PENDIENTES } from '../../src/lib/textos';

export default function ContactoAyudaRoute() {
  const ficha = PANTALLAS_PENDIENTES.contactoAyuda;
  return (
    <PantallaPendiente
      codigo={ficha.codigo}
      descripcion={ficha.descripcion}
      icono={<IconoSobre className="text-primary" size={34} />}
      modulo={ficha.modulo}
      titulo={ficha.titulo}
    />
  );
}
