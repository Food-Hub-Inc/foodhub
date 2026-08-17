import { DetallePublicacion } from '../../../src/screens/publicaciones/DetallePublicacion';

/**
 * Detalle de una publicación propia — PAN-PUB-01 · US-PUB-05.
 *
 * Primer precedente de ruta dinámica (`[id].tsx`) del monorepo: el id viaja
 * por el propio path (`/publicaciones/<uuid>`) y `DetallePublicacion` lo lee
 * con `useLocalSearchParams`.
 */
export default function DetallePublicacionRuta() {
  return <DetallePublicacion />;
}
