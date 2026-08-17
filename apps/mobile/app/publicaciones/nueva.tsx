import { IconoMas } from '../../src/components/iconos';
import { PantallaPendiente } from '../../src/components/ui/PantallaPendiente';
import { PANTALLAS_PENDIENTES } from '../../src/lib/textos';

/**
 * Nueva publicación — PAN-PUB-02.
 *
 * Pendiente de codificación: se implementa en US-PUB-01. Este stub existe
 * desde US-PUB-05 para que el botón "Nueva publicación" del listado y de su
 * estado vacío tengan una ruta tipada válida (`experiments.typedRoutes` de
 * `app.config.ts` exige que la ruta destino de un `router.push` exista como
 * archivo en el momento en que se escribe esa navegación).
 */
export default function NuevaPublicacion() {
  const ficha = PANTALLAS_PENDIENTES.nuevaPublicacion;

  return (
    <PantallaPendiente
      codigo={ficha.codigo}
      descripcion={ficha.descripcion}
      icono={<IconoMas size={34} className="text-primary" />}
      modulo={ficha.modulo}
      titulo={ficha.titulo}
    />
  );
}
