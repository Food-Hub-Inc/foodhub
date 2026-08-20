import { IconoUsuario } from '../../src/components/iconos';
import { PantallaPendiente } from '../../src/components/ui/PantallaPendiente';
import { PANTALLAS_PENDIENTES } from '../../src/lib/textos';

/**
 * Perfil público del cliente — cuarto criterio de US-DASH-03.
 *
 * Pendiente de codificación: la maquetación de la Etapa 5 no dibuja esta
 * pantalla —tiene el perfil público del COCINERO, PAN-EXP-04, y no el del
 * cliente— y ninguna historia la define. El destino existe para que el criterio
 * ("el cocinero presiona sobre un cliente del listado") tenga algo que
 * verificar, en vez de dejar la fila muerta.
 *
 * Fuera del grupo `(cocinero)`: se apila sobre la barra de tabs, igual que
 * `cocineros/[id]`.
 */
export default function PerfilDeClienteRuta() {
  const ficha = PANTALLAS_PENDIENTES.perfilCliente;

  return (
    <PantallaPendiente
      codigo={ficha.codigo}
      descripcion={ficha.descripcion}
      icono={<IconoUsuario size={34} className="text-primary" />}
      modulo={ficha.modulo}
      titulo={ficha.titulo}
    />
  );
}
