import { IconoInformacion } from '../../src/components/iconos';
import { PantallaPendiente } from '../../src/components/ui/PantallaPendiente';
import { PANTALLAS_PENDIENTES } from '../../src/lib/textos';

export default function ManualAyudaRoute() {
  const ficha = PANTALLAS_PENDIENTES.manualAyuda;
  return (
    <PantallaPendiente
      codigo={ficha.codigo}
      descripcion={ficha.descripcion}
      icono={<IconoInformacion className="text-primary" size={34} />}
      modulo={ficha.modulo}
      titulo={ficha.titulo}
    />
  );
}
