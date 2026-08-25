import { useMemo } from 'react';
import { ScrollView, Text, useWindowDimensions, View } from 'react-native';
import RenderHtml from '@native-html/render';
import { MENSAJES_AYUDA, type DocumentoLegalVigente } from '@foodhub/shared';
import { SafeAreaView } from '../../src/components/SafeAreaView';
import { EncabezadoPantalla } from '../../src/components/ui/EncabezadoPantalla';
import { Esqueleto } from '../../src/components/ui/Esqueleto';
import { EstadoDeError } from '../../src/components/ui/EstadoDeError';
import { useDocumentoLegal } from '../../src/hooks/useLegal';
import { mensajeDeError } from '../../src/lib/api';
import { TEXTOS_LEGAL } from '../../src/lib/textos';

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
 * Terminos y condiciones vigentes, accesibles DESDE EL REGISTRO (PAN-AUT-01 /
 * PAN-AUT-02).
 *
 * A diferencia de `ayuda/legal/Terminos.tsx` (que busca el documento con la
 * sesion iniciada), esta pantalla la abre quien todavia no tiene cuenta, asi
 * que no es un enlace al texto del checkbox. Replica el renderizado con
 * `@native-html/render`, copiando el patron de esa pantalla, pero es de SOLO
 * lectura: sin boton "Descargar PDF" (esa descarga pide sesion) y sin navegar
 * a otro lugar que no sea volver al formulario.
 *
 * La ruta vive dentro de `(auth)` de proposito: `GateDeSesion` deja pasar las
 * rutas de ese grupo a quien no tiene sesion, y si la pusieramos en cualquier
 * otro lado redirigiria a `/bienvenida`.
 */
export default function TerminosDeRegistro() {
  const { width } = useWindowDimensions();
  const documento = useDocumentoLegal('TERMINOS');

  const anchoContenido = width - 48;

  const fechaFormateada = useMemo(
    () => formatearFecha(documento.data?.fechaPublicacion),
    [documento.data?.fechaPublicacion],
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <EncabezadoPantalla
        destinoAlternativo="/bienvenida"
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
          contentContainerClassName="px-6 pt-4 pb-8"
          keyboardShouldPersistTaps="handled"
        >
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

function formatearFecha(iso: string | undefined): string {
  if (!iso) return '';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${String(fecha.getFullYear())}`;
}
