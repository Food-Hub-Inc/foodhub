import { type Href, router } from 'expo-router';
import { View } from 'react-native';
import { IconoCandado, IconoInformacion } from '../../../components/iconos';
import { SafeAreaView } from '../../../components/SafeAreaView';
import { EncabezadoPantalla } from '../../../components/ui/EncabezadoPantalla';
import { FilaDeNavegacion } from '../../../components/ui/FilaDeNavegacion';
import { MENSAJES_AYUDA } from '@foodhub/shared';

/**
 * PAN-AYU-04 - Sub-hub de "Informacion legal".
 *
 * Es el destino del cuarto item del hub AYU (`/ayuda/legal`). Desde aca el
 * usuario elige uno de dos destinos: los terminos vigentes o la politica de
 * privacidad. Los datos de contacto dejan de vivir aca: la entrada de
 * contacto del hub ("Datos de contacto") abre esa pantalla directamente.
 *
 * Las dos rutas tipadas con `as Href` viven en commits separados dentro
 * de la misma US (pantalla de terminos y de privacidad colapsable). El
 * typecheck de Expo Router no las conoce hasta que existen, asi que el cast
 * explicito documenta la intencion: las rutas se montan en este mismo PR.
 */
const rutaTerminos = '/ayuda/legal/terminos' as Href;
const rutaPrivacidad = '/ayuda/legal/privacidad' as Href;

export function IndiceDeLegal() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <EncabezadoPantalla titulo={MENSAJES_AYUDA.indiceLegal.titulo} />
      <View className="mx-4 mt-4 overflow-hidden rounded-md border border-border bg-surface">
        <FilaDeNavegacion
          descripcion={MENSAJES_AYUDA.indiceLegal.terminos.descripcion}
          etiqueta={MENSAJES_AYUDA.indiceLegal.terminos.titulo}
          icono={<IconoCandado className="text-primary" size={20} />}
          onPress={() => {
            router.push(rutaTerminos);
          }}
        />
        <FilaDeNavegacion
          descripcion={MENSAJES_AYUDA.indiceLegal.privacidad.descripcion}
          etiqueta={MENSAJES_AYUDA.indiceLegal.privacidad.titulo}
          icono={<IconoInformacion className="text-primary" size={20} />}
          onPress={() => {
            router.push(rutaPrivacidad);
          }}
        />
      </View>
    </SafeAreaView>
  );
}
