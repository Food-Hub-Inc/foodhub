import { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import RenderHtml from '@native-html/render';
import { MENSAJES_AYUDA, type SeccionManualPublica } from '@foodhub/shared';
import { router } from 'expo-router';
import { IconoInformacion } from '../../components/iconos';
import { SafeAreaView } from '../../components/SafeAreaView';
import { Aviso } from '../../components/ui/Aviso';
import { Boton } from '../../components/ui/Boton';
import { EncabezadoPantalla } from '../../components/ui/EncabezadoPantalla';
import { Esqueleto } from '../../components/ui/Esqueleto';
import { EstadoDeError } from '../../components/ui/EstadoDeError';
import { EstadoVacio } from '../../components/ui/EstadoVacio';
import { useManual } from '../../hooks/useManual';
import { mensajeDeError } from '../../lib/api';
import { TEXTOS_AYUDA } from '../../lib/textos';

const ESTILO_BASE = { color: '#1f1a17', fontSize: 15, lineHeight: 22 };

const ESTILOS_POR_ETIQUETA = {
  h1: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1f1a17',
    marginTop: 12,
    marginBottom: 6,
  },
  h2: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1f1a17',
    marginTop: 10,
    marginBottom: 4,
  },
  h3: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1f1a17',
    marginTop: 8,
    marginBottom: 4,
  },
  p: { marginTop: 0, marginBottom: 8 },
  ul: { marginTop: 4, marginBottom: 8, paddingLeft: 16 },
  ol: { marginTop: 4, marginBottom: 8, paddingLeft: 16 },
  li: { marginTop: 0, marginBottom: 4 },
  a: { color: '#ec6829', textDecorationLine: 'underline' as const },
  img: { maxWidth: '100%', borderRadius: 8, marginVertical: 8 },
};

function CargandoCapitulo() {
  return (
    <View className="px-4 pt-4" aria-hidden>
      <Esqueleto className="h-4 w-1/3" />
      <Esqueleto className="mt-4 h-6 w-3/4" />
      <Esqueleto className="mt-3 h-28 rounded-md" />
      <Esqueleto className="mt-4 h-28 rounded-md" />
    </View>
  );
}

function CapituloNoEncontrado() {
  return (
    <View className="flex-1 items-center justify-center px-4">
      <EstadoVacio
        accion={
          <Boton
            onPress={() => {
              router.replace('/ayuda/manual');
            }}
            tamano="sm"
            variante="secundario"
          >
            {MENSAJES_AYUDA.manual.volverAlIndice}
          </Boton>
        }
        icono={<IconoInformacion className="text-primary" size={28} />}
        titulo={TEXTOS_AYUDA.capituloNoEncontrado}
      />
    </View>
  );
}

function BreadcrumbCapitulo({ titulo }: { titulo: string }) {
  return (
    <View className="flex-row items-center gap-1.5 py-2">
      <Pressable
        accessibilityLabel="Ir al índice del manual"
        accessibilityRole="button"
        className="py-1"
        onPress={() => {
          router.replace('/ayuda/manual');
        }}
      >
        <Text className="text-label font-medium text-primary">
          {TEXTOS_AYUDA.manual}
        </Text>
      </Pressable>
      <Text className="text-label text-text-secondary">/</Text>
      <Text className="flex-1 text-label text-text-secondary" numberOfLines={1}>
        {titulo}
      </Text>
    </View>
  );
}

function CuerpoCapitulo({
  titulo,
  secciones,
  anchoContenido,
}: {
  titulo: string;
  secciones: SeccionManualPublica[];
  anchoContenido: number;
}) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="px-4 pt-2 pb-10"
      keyboardShouldPersistTaps="handled"
    >
      <BreadcrumbCapitulo titulo={titulo} />

      {secciones.map((seccion) => (
        <TarjetaSeccion
          anchoContenido={anchoContenido}
          key={seccion.id}
          seccion={seccion}
        />
      ))}

      <View className="mt-6">
        <Boton
          onPress={() => {
            router.replace('/ayuda/manual');
          }}
          variante="secundario"
        >
          {MENSAJES_AYUDA.manual.volverAlIndice}
        </Boton>
      </View>
    </ScrollView>
  );
}

/**
 * Detalle del capítulo del manual de usuario (US-AYU-01, CA2).
 *
 * Muestra el breadcrumb con el capítulo activo, las secciones en orden
 * con su contenido enriquecido renderizado con `@native-html/render`,
 * soporte para lectura offline y el botón "Volver al índice".
 */
export function CapituloManual({ capituloId }: { capituloId: string }) {
  const { width } = useWindowDimensions();
  const manual = useManual();

  const capitulo = useMemo(
    () => manual.capitulos.find((c) => c.id === capituloId),
    [manual.capitulos, capituloId],
  );

  const seccionesOrdenadas = useMemo(() => {
    if (!capitulo) return [];
    return [...capitulo.secciones].sort((a, b) => a.orden - b.orden);
  }, [capitulo]);

  const anchoContenido = width - 64;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <EncabezadoPantalla
        destinoAlternativo="/ayuda/manual"
        titulo={capitulo ? capitulo.titulo : TEXTOS_AYUDA.manual}
      />

      {manual.esModoOffline ? (
        <View className="px-4 pt-3">
          <Aviso
            mensaje={MENSAJES_AYUDA.manual.versionSinConexion}
            tono="informativo"
          />
        </View>
      ) : null}

      {manual.estaCargando ? <CargandoCapitulo /> : null}

      {manual.esError ? (
        <EstadoDeError
          mensaje={mensajeDeError(manual.error)}
          onReintentar={() => {
            void manual.reintentar();
          }}
        />
      ) : null}

      {!manual.estaCargando && !manual.esError && !capitulo ? (
        <CapituloNoEncontrado />
      ) : null}

      {!manual.estaCargando && !manual.esError && capitulo ? (
        <CuerpoCapitulo
          anchoContenido={anchoContenido}
          secciones={seccionesOrdenadas}
          titulo={capitulo.titulo}
        />
      ) : null}
    </SafeAreaView>
  );
}

function TarjetaSeccion({
  seccion,
  anchoContenido,
}: {
  seccion: SeccionManualPublica;
  anchoContenido: number;
}) {
  return (
    <View className="mt-4 rounded-md border border-border bg-surface p-4">
      <Text className="mb-2 text-h3 font-bold text-text-primary">
        {seccion.titulo}
      </Text>
      <RenderHtml
        baseStyle={ESTILO_BASE}
        contentWidth={anchoContenido}
        source={{ html: seccion.contenidoHtml }}
        tagsStyles={ESTILOS_POR_ETIQUETA}
      />
    </View>
  );
}
