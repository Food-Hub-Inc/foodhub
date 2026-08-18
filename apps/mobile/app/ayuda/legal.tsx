import { IconoCandado } from '../../src/components/iconos';
import { PantallaPendiente } from '../../src/components/ui/PantallaPendiente';
import { PANTALLAS_PENDIENTES } from '../../src/lib/textos';

export default function LegalAyudaRoute() {
  const ficha = PANTALLAS_PENDIENTES.legalAyuda;
  return (
    <PantallaPendiente
      codigo={ficha.codigo}
      descripcion={ficha.descripcion}
      icono={<IconoCandado className="text-primary" size={34} />}
      modulo={ficha.modulo}
      titulo={ficha.titulo}
    />
  );
}
