import { useLocalSearchParams } from 'expo-router';
import { EvolucionDePlato } from '../../../src/screens/dashboard/EvolucionDePlato';

/**
 * Evolución de un plato — corrección del 20/10/2026, extensión de PAN-DASH-01.
 *
 * Se entra desde el ranking de "Mi actividad" con el período activo en la
 * ruta. Fuera del grupo `(cocinero)` para apilarse sobre las tabs, igual que
 * `clientes/[id]`; el `requiereRol('COCINERO')` de la API es la guarda.
 */
export default function EvolucionDePlatoRuta() {
  const { id, periodo, desde, hasta } = useLocalSearchParams<{
    id?: string;
    periodo?: string;
    desde?: string;
    hasta?: string;
  }>();

  return (
    <EvolucionDePlato desde={desde} hasta={hasta} id={id} periodo={periodo} />
  );
}
