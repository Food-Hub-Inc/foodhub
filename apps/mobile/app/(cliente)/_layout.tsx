import { Tabs } from 'expo-router';
import {
  IconoBolsa,
  IconoInicio,
  IconoMapa,
  IconoMensaje,
  IconoUsuario,
} from '../../src/components/iconos';
import {
  iconoDeTab,
  useOpcionesDeTabs,
} from '../../src/components/navegacion/opcionesDeTabs';
import { TEXTOS_NAVEGACION } from '../../src/lib/textos';

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
  const opciones = useOpcionesDeTabs();

  return (
    <Tabs screenOptions={opciones}>
      <Tabs.Screen
        name="inicio"
        options={{
          title: TEXTOS_NAVEGACION.inicio,
          tabBarIcon: iconoDeTab(IconoInicio),
        }}
      />
      <Tabs.Screen
        name="mapa"
        options={{
          title: TEXTOS_NAVEGACION.mapa,
          tabBarIcon: iconoDeTab(IconoMapa),
        }}
      />
      <Tabs.Screen
        name="pedidos"
        options={{
          title: TEXTOS_NAVEGACION.pedidos,
          tabBarIcon: iconoDeTab(IconoBolsa),
        }}
      />
      <Tabs.Screen
        name="mensajes"
        options={{
          title: TEXTOS_NAVEGACION.mensajes,
          tabBarIcon: iconoDeTab(IconoMensaje),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: TEXTOS_NAVEGACION.perfil,
          tabBarIcon: iconoDeTab(IconoUsuario),
        }}
      />
    </Tabs>
  );
}
