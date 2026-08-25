import { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import RenderHtml from '@native-html/render';
import { MENSAJES_AYUDA, type DocumentoLegalVigente } from '@foodhub/shared';
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
};

/**
 * PAN-AYU-04 - Terminos y condiciones vigentes para el usuario autenticado
 * (CA2).
 *
 * Replica el patron de `aceptar-terminos.tsx` (US-CFG-04) para pintar el
 * HTML sanitizado con `@native-html/render`, con la diferencia de que aca
 * la pantalla es de solo lectura: agrega la fecha de ultima actualizacion
 * en el encabezado y un boton "Descargar PDF" en la barra superior.
 */
export function Terminos() {
  const { width } = useWindowDimensions();
  const documento = useDocumentoLegal('TERMINOS');
  const descargar = useDescargarPdfLegal();

  const anchoContenido = width - 32;
  const fechaFormateada = useMemo(
    () => formatearFecha(documento.data?.fechaPublicacion),
    [documento.data?.fechaPublicacion],
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
        if (!descargar.isPending) descargar.mutate('TERMINOS');
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
        titulo={TEXTOS_LEGAL.pantallaTerminos.titulo}
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
              <View className="mt-3 rounded-md border border-border bg-surface p-3">
                <ContenidoHtml
                  anchoContenido={anchoContenido}
                  documento={documento.data}
                />
              </View>
            </>
          ) : (
            <EsqueletoTerminos />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function ContenidoHtml({
  documento,
  anchoContenido,
}: {
  documento: DocumentoLegalVigente;
  anchoContenido: number;
}) {
  return (
    <RenderHtml
      baseStyle={ESTILO_BASE}
      contentWidth={anchoContenido}
      source={{ html: documento.contenidoHtml }}
      tagsStyles={ESTILOS_POR_ETIQUETA}
    />
  );
}

function EsqueletoTerminos() {
  return (
    <View aria-hidden>
      <Esqueleto className="h-3 w-1/3" />
      <Esqueleto className="mt-4 h-5 w-3/4" />
      <Esqueleto className="mt-2 h-4 w-full" />
      <Esqueleto className="mt-1 h-4 w-11/12" />
      <Esqueleto className="mt-1 h-4 w-3/4" />
      <Esqueleto className="mt-5 h-5 w-2/3" />
      <Esqueleto className="mt-2 h-4 w-full" />
      <Esqueleto className="mt-1 h-4 w-5/6" />
    </View>
  );
}

/**
 * ISO 8601 -> DD/MM/YYYY (es-AR). Devuelve la cadena original si no se
 * puede parsear: la pantalla no debe romperse por un formato inesperado del
 * backend.
 */
function formatearFecha(iso: string | undefined): string {
  if (!iso) return '';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${String(fecha.getFullYear())}`;
}
