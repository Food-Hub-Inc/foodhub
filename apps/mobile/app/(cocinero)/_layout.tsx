import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useOpcionesDeTabs } from '../../src/components/navegacion/opcionesDeTabs';
import { TEXTOS_NAVEGACION } from '../../src/lib/textos';
import { useAcuseDeEntrega } from '../../src/hooks/useAcuseDeEntrega';
import {
  useInsigniaDeMensajes,
  useInsigniaDePedidosNuevos,
} from '../../src/hooks/useInsigniasDeTabs';

/**
 * Barra de navegación del cocinero.
 *
 * Comparte los dos últimos destinos con la del cliente —Mensajes y Perfil son
 * pantallas de los dos roles según el mapa de navegación— y cambia los tres
 * primeros por las herramientas de venta.
 *
 * «Actividad» es PAN-DASH-01, que en la maquetación se llama «Mi actividad»;
 * se acorta para que entre en la barra. Usa el ícono `clock` porque la guía
 * visual no tiene ninguno de gráfico o panel, y la regla del proyecto es que un
 * ícono que no está en la guía no existe. Decisión tomada con el equipo.
 *
 * De los cinco destinos, solo Perfil está codificado en este sprint.
 */
export default function LayoutCocinero() {
  /**
   * US-MSG-02 · Acuse de entrega y contador de no leídos del módulo de
   * Mensajería. Se monta acá, en el layout de pestañas, y no en una pantalla:
   * "entregado" significa que el mensaje llegó al dispositivo, y eso pasa
   * mientras el usuario está en cualquier lugar de la app. Ver
   * `useAcuseDeEntrega` para el detalle.
   */
  useAcuseDeEntrega();

  const opciones = useOpcionesDeTabs();
  // Si no hay texto, se ocultan con hidden={true}. Sin hidden,
  // NativeTabs.Trigger.Badge dibuja un punto indicador (dot badge).
  const insigniaDeMensajes = useInsigniaDeMensajes();
  const insigniaDePedidos = useInsigniaDePedidosNuevos();

  return (
    <NativeTabs {...opciones}>
      <NativeTabs.Trigger name="platos">
        <NativeTabs.Trigger.Icon sf="fork.knife" md="restaurant" />
        <NativeTabs.Trigger.Label>
          {TEXTOS_NAVEGACION.platos}
        </NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="pedidos">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'bag', selected: 'bag.fill' }}
          md="shopping_bag"
        />
        <NativeTabs.Trigger.Label>
          {TEXTOS_NAVEGACION.pedidos}
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Badge hidden={!insigniaDePedidos}>
          {insigniaDePedidos}
        </NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="actividad">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'clock', selected: 'clock.fill' }}
          md="schedule"
        />
        <NativeTabs.Trigger.Label>
          {TEXTOS_NAVEGACION.actividad}
        </NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="mensajes">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'message', selected: 'message.fill' }}
          md="chat"
        />
        <NativeTabs.Trigger.Label>
          {TEXTOS_NAVEGACION.mensajes}
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Badge hidden={!insigniaDeMensajes}>
          {insigniaDeMensajes}
        </NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="perfil">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person', selected: 'person.fill' }}
          md="person"
        />
        <NativeTabs.Trigger.Label>
          {TEXTOS_NAVEGACION.perfil}
        </NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
