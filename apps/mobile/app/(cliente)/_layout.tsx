import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useOpcionesDeTabs } from '../../src/components/navegacion/opcionesDeTabs';
import { TEXTOS_NAVEGACION } from '../../src/lib/textos';
import { useAcuseDeEntrega } from '../../src/hooks/useAcuseDeEntrega';

/**
 * Barra de navegación del cliente.
 *
 * La maquetación de la Etapa 5 no dibuja ninguna barra —sus 30 pantallas son
 * contenido recortado— así que el orden y los destinos los aprobó el equipo
 * sobre el mapa de navegación y el set de íconos de la guía visual.
 *
 * Dos ausencias son deliberadas y NO son olvidos:
 *
 *   NOTIFICACIONES  van como campana en el encabezado, que es donde las pone
 *                   el mockup del feed (PAN-EXP-01), no como destino fijo.
 *   CARRITO         es un botón flotante sobre el contenido del flujo de
 *                   compra, no una sección permanente.
 *
 * De los cinco destinos, solo Perfil está codificado en este sprint.
 */
export default function LayoutCliente() {
  /**
   * US-MSG-02 · Acuse de entrega y contador de no leídos del módulo de
   * Mensajería. Se monta acá, en el layout de pestañas, y no en una pantalla:
   * "entregado" significa que el mensaje llegó al dispositivo, y eso pasa
   * mientras el usuario está en cualquier lugar de la app. Ver
   * `useAcuseDeEntrega` para el detalle.
   */
  useAcuseDeEntrega();

  const opciones = useOpcionesDeTabs();

  return (
    <NativeTabs {...opciones}>
      <NativeTabs.Trigger name="inicio">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'house', selected: 'house.fill' }}
          md="home"
        />
        <NativeTabs.Trigger.Label>
          {TEXTOS_NAVEGACION.inicio}
        </NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="mapa">
        <NativeTabs.Trigger.Icon sf="map.fill" md="map" />
        <NativeTabs.Trigger.Label>
          {TEXTOS_NAVEGACION.mapa}
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
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="mensajes">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'message', selected: 'message.fill' }}
          md="chat"
        />
        <NativeTabs.Trigger.Label>
          {TEXTOS_NAVEGACION.mensajes}
        </NativeTabs.Trigger.Label>
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
