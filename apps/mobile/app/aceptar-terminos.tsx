import { useState } from 'react';
import { ScrollView, Text, useWindowDimensions, View } from 'react-native';
import RenderHtml from '@native-html/render';
import { MENSAJES_CONFIGURACION } from '@foodhub/shared';
import { SafeAreaView } from '../src/components/SafeAreaView';
import { Aviso } from '../src/components/ui/Aviso';
import { Boton } from '../src/components/ui/Boton';
import { Casilla } from '../src/components/ui/Casilla';
import { EncabezadoPantalla } from '../src/components/ui/EncabezadoPantalla';
import { Esqueleto } from '../src/components/ui/Esqueleto';
import { EstadoDeError } from '../src/components/ui/EstadoDeError';
import {
  useAceptarTerminos,
  useTerminosVigentesParaAceptar,
} from '../src/hooks/useTerminosVigentes';
import { mensajeDeError } from '../src/lib/api';
import { TEXTOS_ACEPTAR_TERMINOS } from '../src/lib/textos';

const ESTILO_BASE = { color: '#1f1a17', fontSize: 15, lineHeight: 22 };

const ESTILOS_POR_ETIQUETA = {
  h1: { fontSize: 20, fontWeight: '700' as const, color: '#1f1a17' },
  h2: { fontSize: 18, fontWeight: '700' as const, color: '#1f1a17' },
  h3: { fontSize: 16, fontWeight: '700' as const, color: '#1f1a17' },
  a: { color: '#ec6829', textDecorationLine: 'underline' as const },
};

/**
 * Re-aceptación obligatoria de términos y condiciones y política de
 * privacidad — US-CFG-04 (RF058), último criterio de aceptación.
 *
 * Vive fuera de los tres grupos de rutas, igual que `notificaciones.tsx`: la
 * alcanzan por igual el cliente y el cocinero. A diferencia de esa pantalla,
 * `GateDeSesion` sí conoce esta ruta: mientras `perfil.debeAceptarTerminos`
 * sea `true` es el único destino permitido (ver `calcularDestino`), y apenas
 * la aceptación se registra el gate vuelve a decidir y manda al usuario a su
 * pantalla de inicio — esta pantalla no navega por su cuenta.
 */
export default function AceptarTerminos() {
  const { width } = useWindowDimensions();
  const terminos = useTerminosVigentesParaAceptar();
  const aceptar = useAceptarTerminos();
  const [marcada, setMarcada] = useState(false);

  const anchoContenido = width - 48;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <EncabezadoPantalla titulo={TEXTOS_ACEPTAR_TERMINOS.titulo} />

      {terminos.isError ? (
        <EstadoDeError
          mensaje={mensajeDeError(terminos.error)}
          onReintentar={() => {
            void terminos.refetch();
          }}
        />
      ) : (
        <ScrollView
          contentContainerClassName="px-6 pt-4 pb-6"
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-body text-text-secondary">
            {TEXTOS_ACEPTAR_TERMINOS.bajada}
          </Text>

          {!terminos.data ? (
            <View aria-hidden className="mt-5">
              <Esqueleto className="h-5 w-1/2" />
              <Esqueleto className="mt-3 h-40 w-full" />
              <Esqueleto className="mt-6 h-5 w-1/2" />
              <Esqueleto className="mt-3 h-40 w-full" />
            </View>
          ) : (
            <>
              <DocumentoVigente
                anchoContenido={anchoContenido}
                contenidoHtml={terminos.data.terminos.contenidoHtml}
                titulo={TEXTOS_ACEPTAR_TERMINOS.solapaTerminos}
              />
              <DocumentoVigente
                anchoContenido={anchoContenido}
                contenidoHtml={terminos.data.privacidad.contenidoHtml}
                titulo={TEXTOS_ACEPTAR_TERMINOS.solapaPrivacidad}
              />
            </>
          )}

          {aceptar.isError ? (
            <Aviso
              className="mt-5"
              mensaje={mensajeDeError(aceptar.error)}
              tono="error"
            />
          ) : null}

          <Casilla
            etiquetaAccesible={MENSAJES_CONFIGURACION.aceptoNuevosTerminos}
            marcada={marcada}
            nombre="acepto-terminos"
            onChange={setMarcada}
          >
            <Text className="text-body text-text-primary">
              {MENSAJES_CONFIGURACION.aceptoNuevosTerminos}
            </Text>
          </Casilla>

          <Boton
            cargando={aceptar.isPending}
            className="mt-2"
            deshabilitado={!marcada || !terminos.data}
            onPress={() => {
              aceptar.mutate();
            }}
            textoCargando={TEXTOS_ACEPTAR_TERMINOS.continuando}
          >
            {TEXTOS_ACEPTAR_TERMINOS.continuar}
          </Boton>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

/** Un documento vigente (términos o privacidad) dentro del scroll de la pantalla. */
function DocumentoVigente({
  titulo,
  contenidoHtml,
  anchoContenido,
}: {
  titulo: string;
  contenidoHtml: string;
  anchoContenido: number;
}) {
  return (
    <View className="mt-5">
      <Text className="mb-2 text-h3 font-bold text-text-primary">{titulo}</Text>
      <View className="rounded-md border border-border bg-surface p-3">
        {/*
         * El HTML llega sanitizado desde la API (allowlist server-side, ver
         * `apps/api/src/modules/configuracion/terminos.service.ts`): no hace
         * falta sanitizarlo de nuevo acá.
         */}
        <RenderHtml
          baseStyle={ESTILO_BASE}
          contentWidth={anchoContenido}
          source={{ html: contenidoHtml }}
          tagsStyles={ESTILOS_POR_ETIQUETA}
        />
      </View>
    </View>
  );
}
