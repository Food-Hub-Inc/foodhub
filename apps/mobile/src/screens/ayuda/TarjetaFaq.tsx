import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { MENSAJES_AYUDA, type Faq } from '@foodhub/shared';
import { IconoChevronAbajo, IconoTildeCirculo } from '../../components/iconos';
import { Boton } from '../../components/ui/Boton';
import { useDuracion } from '../../hooks/useMovimientoReducido';
import { TextoResaltado } from './TextoResaltado';

export function TarjetaFaq({
  faq,
  consulta,
  votada,
  votando,
  onVotar,
}: {
  faq: Faq;
  consulta: string;
  votada: boolean;
  votando: boolean;
  onVotar: (util: boolean) => void;
}) {
  const [expandida, setExpandida] = useState(false);
  const [alturaContenido, setAlturaContenido] = useState(0);
  const altura = useSharedValue(0);
  const opacidad = useSharedValue(0);
  const rotacion = useSharedValue(0);
  const duracion = useDuracion(220);

  useEffect(() => {
    altura.set(
      withTiming(expandida ? alturaContenido : 0, { duration: duracion }),
    );
    opacidad.set(withTiming(expandida ? 1 : 0, { duration: duracion }));
    rotacion.set(withTiming(expandida ? 180 : 0, { duration: duracion }));
  }, [alturaContenido, duracion, expandida, altura, opacidad, rotacion]);

  const estiloRespuesta = useAnimatedStyle(() => ({
    height: altura.get(),
    opacity: opacidad.get(),
  }));
  const estiloChevron = useAnimatedStyle(() => ({
    transform: [{ rotate: `${String(rotacion.get())}deg` }],
  }));

  return (
    <View className="mb-3 overflow-hidden rounded-md border border-border bg-surface">
      <Pressable
        className="min-h-14 flex-row items-center gap-3 px-4 py-3"
        onPress={() => {
          setExpandida((abierta) => !abierta);
        }}
        accessibilityRole="button"
        accessibilityState={{ expanded: expandida }}
        accessibilityLabel={faq.pregunta}
      >
        <TextoResaltado
          className="flex-1 text-body font-semibold text-text-primary"
          consulta={consulta}
          texto={faq.pregunta}
        />
        <Animated.View style={estiloChevron}>
          <IconoChevronAbajo className="text-text-secondary" size={20} />
        </Animated.View>
      </Pressable>

      <Animated.View className="overflow-hidden" style={estiloRespuesta}>
        <View
          className="border-t border-border px-4 pt-3 pb-4"
          onLayout={(evento) => {
            const nuevaAltura = evento.nativeEvent.layout.height;
            if (nuevaAltura !== alturaContenido)
              setAlturaContenido(nuevaAltura);
          }}
        >
          <TextoResaltado
            className="text-body leading-6 text-text-secondary"
            consulta={consulta}
            texto={faq.respuesta}
          />

          <ValoracionFaq onVotar={onVotar} votada={votada} votando={votando} />
        </View>
      </Animated.View>
    </View>
  );
}

function ValoracionFaq({
  votada,
  votando,
  onVotar,
}: {
  votada: boolean;
  votando: boolean;
  onVotar: (util: boolean) => void;
}) {
  if (votada) {
    return (
      <View className="flex-row items-center gap-2">
        <IconoTildeCirculo className="text-success" size={20} />
        <Text className="text-body font-semibold text-success">
          {MENSAJES_AYUDA.graciasPorTuOpinion}
        </Text>
      </View>
    );
  }

  return (
    <>
      <Text className="text-label font-semibold text-text-primary">
        {MENSAJES_AYUDA.preguntaUtil}
      </Text>
      <View className="mt-3 flex-row gap-3">
        <Boton
          className="flex-1"
          deshabilitado={votando}
          onPress={() => {
            onVotar(true);
          }}
          tamano="sm"
          variante="secundario"
        >
          {MENSAJES_AYUDA.votoUtil}
        </Boton>
        <Boton
          className="flex-1"
          deshabilitado={votando}
          onPress={() => {
            onVotar(false);
          }}
          tamano="sm"
          variante="secundario"
        >
          {MENSAJES_AYUDA.votoNoUtil}
        </Boton>
      </View>
    </>
  );
}
