import { IconoLapiz } from '../../../src/components/iconos';
import { PantallaPendiente } from '../../../src/components/ui/PantallaPendiente';
import { PANTALLAS_PENDIENTES } from '../../../src/lib/textos';

/**
 * Editar publicación — PAN-PUB-03.
 *
 * Pendiente de codificación: se implementa en US-PUB-02. Este stub existe
 * desde US-PUB-05 para que el botón "Editar" del detalle tenga una ruta
 * tipada válida (ver el comentario de `publicaciones/nueva.tsx`).
 */
export default function EditarPublicacion() {
  const ficha = PANTALLAS_PENDIENTES.editarPublicacion;

  return (
    <PantallaPendiente
      codigo={ficha.codigo}
      descripcion={ficha.descripcion}
      icono={<IconoLapiz size={34} className="text-primary" />}
      modulo={ficha.modulo}
      titulo={ficha.titulo}
    />
  );
}
