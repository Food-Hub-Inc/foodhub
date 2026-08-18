import { router } from 'expo-router';
import { View } from 'react-native';
import {
  IconoAyuda,
  IconoCandado,
  IconoInformacion,
  IconoSobre,
} from '../../components/iconos';
import { SafeAreaView } from '../../components/SafeAreaView';
import { EncabezadoPantalla } from '../../components/ui/EncabezadoPantalla';
import { FilaDeNavegacion } from '../../components/ui/FilaDeNavegacion';
import { TEXTOS_AYUDA } from '../../lib/textos';

/** Hub de Ayuda y soporte desde el que se accede a las historias del módulo. */
export function Ayuda() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <EncabezadoPantalla titulo={TEXTOS_AYUDA.titulo} />
      <View className="mx-4 mt-4 overflow-hidden rounded-md border border-border bg-surface">
        <FilaDeNavegacion
          etiqueta={TEXTOS_AYUDA.preguntasFrecuentes}
          icono={<IconoAyuda className="text-primary" size={20} />}
          onPress={() => {
            router.push('/ayuda/preguntas-frecuentes');
          }}
        />
        <FilaDeNavegacion
          etiqueta={TEXTOS_AYUDA.manual}
          icono={<IconoInformacion className="text-text-secondary" size={20} />}
          onPress={() => {
            router.push('/ayuda/manual');
          }}
        />
        <FilaDeNavegacion
          etiqueta={TEXTOS_AYUDA.contacto}
          icono={<IconoSobre className="text-text-secondary" size={20} />}
          onPress={() => {
            router.push('/ayuda/contacto');
          }}
        />
        <FilaDeNavegacion
          etiqueta={TEXTOS_AYUDA.legal}
          icono={<IconoCandado className="text-text-secondary" size={20} />}
          onPress={() => {
            router.push('/ayuda/legal');
          }}
        />
      </View>
    </SafeAreaView>
  );
}
