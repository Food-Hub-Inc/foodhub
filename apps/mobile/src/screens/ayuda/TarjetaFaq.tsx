import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
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
  const rotacion = useSharedValue(0);
  const duracion = useDuracion(220);

  useEffect(() => {
    rotacion.set(withTiming(expandida ? 180 : 0, { duration: duracion }));
  }, [duracion, expandida, rotacion]);

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

      {expandida ? (
        <Animated.View
          className="overflow-hidden border-t border-border"
          entering={FadeIn.duration(duracion)}
          exiting={FadeOut.duration(duracion)}
        >
          <View className="px-4 pt-3 pb-4">
            <TextoResaltado
              className="text-body leading-6 text-text-secondary"
              consulta={consulta}
              texto={faq.respuesta}
            />

            <ValoracionFaq
              onVotar={onVotar}
              votada={votada}
              votando={votando}
            />
          </View>
        </Animated.View>
      ) : null}
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
        <View className="flex-1">
          <Boton
            className="w-full"
            deshabilitado={votando}
            onPress={() => {
              onVotar(true);
            }}
            tamano="sm"
            variante="secundario"
          >
            {MENSAJES_AYUDA.votoUtil}
          </Boton>
        </View>
        <View className="flex-1">
          <Boton
            className="w-full"
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
      </View>
    </>
  );
}
