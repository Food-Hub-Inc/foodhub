import { Tabs } from 'expo-router';
import {
  IconoBolsa,
  IconoCocinero,
  IconoMensaje,
  IconoReloj,
  IconoUsuario,
} from '../../src/components/iconos';
import {
  iconoDeTab,
  useOpcionesDeTabs,
} from '../../src/components/navegacion/opcionesDeTabs';
import { TEXTOS_NAVEGACION } from '../../src/lib/textos';

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
  const opciones = useOpcionesDeTabs();

  return (
    <Tabs screenOptions={opciones}>
      <Tabs.Screen
        name="platos"
        options={{
          title: TEXTOS_NAVEGACION.platos,
          tabBarIcon: iconoDeTab(IconoCocinero),
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
        name="actividad"
        options={{
          title: TEXTOS_NAVEGACION.actividad,
          tabBarIcon: iconoDeTab(IconoReloj),
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
