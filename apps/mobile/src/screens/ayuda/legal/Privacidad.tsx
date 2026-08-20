import { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import RenderHtml from '@native-html/render';
import { MENSAJES_AYUDA } from '@foodhub/shared';
import { SeccionColapsable } from '../../../components/ayuda/SeccionColapsable';
import { IconoDescargar } from '../../../components/iconos';
import { SafeAreaView } from '../../../components/SafeAreaView';
import { Aviso } from '../../../components/ui/Aviso';
import { EncabezadoPantalla } from '../../../components/ui/EncabezadoPantalla';
import { Esqueleto } from '../../../components/ui/Esqueleto';
import { EstadoDeError } from '../../../components/ui/EstadoDeError';
import {
  useDescargarPdfLegal,
  useDocumentoLegal,
} from '../../../hooks/useLegal';
import { mensajeDeError } from '../../../lib/api';
import { TEXTOS_LEGAL } from '../../../lib/textos';
import { dividirHtmlEnSecciones } from '../../../utilidades/html';

const ESTILO_BASE = { color: '#1f1a17', fontSize: 15, lineHeight: 22 };

const ESTILOS_POR_ETIQUETA = {
  h1: { fontSize: 18, fontWeight: '700' as const, color: '#1f1a17' },
  h2: { fontSize: 16, fontWeight: '700' as const, color: '#1f1a17' },
  h3: { fontSize: 15, fontWeight: '700' as const, color: '#1f1a17' },
  a: { color: '#ec6829', textDecorationLine: 'underline' as const },
};

/**
 * PAN-AYU-04 - Politica de privacidad vigente para el usuario autenticado
 * (CA3). A diferencia de Terminos, este documento se muestra como
 * acordeon: el parser corta por cada `<h2>` y cada seccion es una fila
 * colapsable. La primera arranca abierta para que el usuario vea
 * contenido de entrada sin tener que tocarla.
 *
 * Si el documento no tiene `<h2>`, el helper devuelve una sola seccion
 * con `titulo = ''`: cae automaticamente al modo "sin acordeon" que
 * describe el CA3, renderizando el documento entero como Terminos.
 */
export function Privacidad() {
  const { width } = useWindowDimensions();
  const documento = useDocumentoLegal('PRIVACIDAD');
  const descargar = useDescargarPdfLegal();

  const anchoContenido = width - 32 - 24;
  const fechaFormateada = useMemo(
    () => formatearFecha(documento.data?.fechaPublicacion),
    [documento.data?.fechaPublicacion],
  );

  const secciones = useMemo(
    () =>
      documento.data
        ? dividirHtmlEnSecciones(documento.data.contenidoHtml)
        : [],
    [documento.data],
  );

  const accionEncabezado = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        descargar.isPending
          ? MENSAJES_AYUDA.documentoLegal.descargandoPdf
          : MENSAJES_AYUDA.documentoLegal.descargarPdf
      }
      accessibilityState={{
        busy: descargar.isPending,
        disabled: descargar.isPending,
      }}
      className="h-11 w-11 items-center justify-center"
      onPress={() => {
        if (!descargar.isPending) descargar.mutate('PRIVACIDAD');
      }}
    >
      <IconoDescargar size={22} className="text-primary" />
    </Pressable>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <EncabezadoPantalla
        accion={accionEncabezado}
        destinoAlternativo="/ayuda/legal"
        titulo={TEXTOS_LEGAL.pantallaPrivacidad.titulo}
      />

      {documento.isError ? (
        <EstadoDeError
          mensaje={mensajeDeError(documento.error)}
          onReintentar={() => {
            void documento.refetch();
          }}
        />
      ) : (
        <ScrollView
          contentContainerClassName="px-4 pt-4 pb-8"
          keyboardShouldPersistTaps="handled"
        >
          {descargar.isError ? (
            <Aviso
              className="mb-3"
              mensaje={MENSAJES_AYUDA.documentoLegal.errorPdf}
              tono="error"
            />
          ) : null}

          {documento.data ? (
            <>
              <Text className="text-caption text-text-secondary">
                {MENSAJES_AYUDA.documentoLegal.ultimaActualizacion(
                  fechaFormateada,
                )}
              </Text>
              {secciones.length === 0 ? (
                <View className="mt-3 rounded-md border border-border bg-surface p-3">
                  <RenderHtml
                    baseStyle={ESTILO_BASE}
                    contentWidth={anchoContenido}
                    source={{ html: documento.data.contenidoHtml }}
                    tagsStyles={ESTILOS_POR_ETIQUETA}
                  />
                </View>
              ) : (
                <View className="mt-3">
                  {secciones.map((seccion, indice) => (
                    <SeccionColapsable
                      inicialAbierta={indice === 0}
                      key={`${String(indice)}-${seccion.titulo}`}
                      titulo={
                        seccion.titulo || TEXTOS_LEGAL.pantallaPrivacidad.titulo
                      }
                    >
                      <RenderHtml
                        baseStyle={ESTILO_BASE}
                        contentWidth={anchoContenido}
                        source={{ html: seccion.html }}
                        tagsStyles={ESTILOS_POR_ETIQUETA}
                      />
                    </SeccionColapsable>
                  ))}
                </View>
              )}
            </>
          ) : (
            <EsqueletoPrivacidad />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function EsqueletoPrivacidad() {
  return (
    <View aria-hidden>
      <Esqueleto className="h-3 w-1/3" />
      <Esqueleto className="mt-4 h-12 w-full" />
      <Esqueleto className="mt-3 h-12 w-full" />
      <Esqueleto className="mt-3 h-12 w-full" />
    </View>
  );
}

function formatearFecha(iso: string | undefined): string {
  if (!iso) return '';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${String(fecha.getFullYear())}`;
}
