import { MiPerfil } from '../../src/screens/perfil/MiPerfil';

/**
 * PAN-GURP-01 · Mi perfil, en la barra del cocinero.
 *
 * La pantalla es una sola y vive en `src/screens/perfil`: los dos grupos de
 * rutas la montan porque el mapa de navegación la declara compartida entre
 * cliente y cocinero. La ruta solo la enchufa; lo que cambia según el rol lo
 * decide la propia pantalla a partir del perfil.
 */
export default function Perfil() {
  return <MiPerfil />;
}
