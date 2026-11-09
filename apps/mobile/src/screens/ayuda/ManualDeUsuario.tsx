import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { MENSAJES_AYUDA } from '@foodhub/shared';
import { router } from 'expo-router';
import {
  IconoBuscar,
  IconoChevronDerecha,
  IconoInformacion,
} from '../../components/iconos';
import { SafeAreaView } from '../../components/SafeAreaView';
import { Aviso } from '../../components/ui/Aviso';
import { CampoTexto } from '../../components/ui/CampoTexto';
import { EncabezadoPantalla } from '../../components/ui/EncabezadoPantalla';
import { Esqueleto } from '../../components/ui/Esqueleto';
import { EstadoDeError } from '../../components/ui/EstadoDeError';
import { EstadoVacio } from '../../components/ui/EstadoVacio';
import { useManual } from '../../hooks/useManual';
import { mensajeDeError } from '../../lib/api';
import { TEXTOS_AYUDA } from '../../lib/textos';
import { buscarEnManual, type CapituloCoincidencia } from './busquedaManual';
import { TextoResaltado } from './TextoResaltado';

function CargandoManual() {
  return (
    <View className="px-4 pt-4" aria-hidden>
      <Esqueleto className="h-14 rounded-sm" />
      <Esqueleto className="mt-5 h-20 rounded-md" />
      <Esqueleto className="mt-3 h-20 rounded-md" />
      <Esqueleto className="mt-3 h-20 rounded-md" />
    </View>
  );
}

/**
 * Índice del manual de usuario (US-AYU-01).
 *
 * Muestra el catálogo de capítulos y secciones según el rol autenticado.
 * Permite buscar con case-insensitive (`es-AR`), resaltado de coincidencias,
 * y visualización offline mediante persistencia en AsyncStorage (CA5).
 */
export function ManualDeUsuario() {
  const [consulta, setConsulta] = useState('');
  const manual = useManual();

  const resultados = useMemo(
    () => buscarEnManual(manual.capitulos, consulta),
    [manual.capitulos, consulta],
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <EncabezadoPantalla
        destinoAlternativo="/ayuda"
        titulo={TEXTOS_AYUDA.manual}
      />

      {manual.esModoOffline ? (
        <View className="px-4 pt-3">
          <Aviso
            mensaje={MENSAJES_AYUDA.manual.versionSinConexion}
            tono="informativo"
          />
        </View>
      ) : null}

      {manual.estaCargando ? <CargandoManual /> : null}

      {manual.esError ? (
        <EstadoDeError
          mensaje={mensajeDeError(manual.error)}
          onReintentar={() => {
            void manual.reintentar();
          }}
        />
      ) : null}

      {!manual.estaCargando && !manual.esError ? (
        <VistaIndiceManual
          capitulosTotales={manual.capitulos.length}
          consulta={consulta}
          onCambiarConsulta={setConsulta}
          resultados={resultados}
        />
      ) : null}
    </SafeAreaView>
  );
}

function VistaIndiceManual({
  capitulosTotales,
  consulta,
  onCambiarConsulta,
  resultados,
}: {
  capitulosTotales: number;
  consulta: string;
  onCambiarConsulta: (valor: string) => void;
  resultados: CapituloCoincidencia[];
}) {
  const tieneConsulta = consulta.trim().length > 0;
  const sinResultados = tieneConsulta && resultados.length === 0;

  return (
    <View className="flex-1">
      <View className="px-4 pt-4">
        <CampoTexto
          className="mb-1"
          etiqueta={TEXTOS_AYUDA.buscarManual}
          icono={<IconoBuscar className="text-text-secondary" size={20} />}
          nombre="buscar-manual"
          onChange={onCambiarConsulta}
          placeholder={TEXTOS_AYUDA.buscarManualPlaceholder}
          valor={consulta}
        />
      </View>

      {capitulosTotales === 0 ? (
        <EstadoVacio
          icono={<IconoInformacion className="text-primary" size={28} />}
          subtitulo={TEXTOS_AYUDA.sinCapitulosSubtitulo}
          titulo={TEXTOS_AYUDA.sinCapitulosTitulo}
        />
      ) : sinResultados ? (
        <EstadoVacio
          icono={<IconoBuscar className="text-primary" size={28} />}
          titulo={MENSAJES_AYUDA.manual.sinResultados}
        />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pt-4 pb-10"
          keyboardShouldPersistTaps="handled"
        >
          {resultados.map((item) => (
            <TarjetaCapitulo
              consulta={consulta}
              item={item}
              key={item.capitulo.id}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function TarjetaCapitulo({
  item,
  consulta,
}: {
  item: CapituloCoincidencia;
  consulta: string;
}) {
  const { capitulo, seccionesCoincidentes } = item;
  const tieneConsulta = consulta.trim().length > 0;

  return (
    <View className="mb-3 overflow-hidden rounded-md border border-border bg-surface">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Abrir capítulo: ${capitulo.titulo}`}
        className="min-h-14 flex-row items-center justify-between p-4"
        onPress={() => {
          router.push({
            pathname: '/ayuda/manual/[id]',
            params: { id: capitulo.id },
          });
        }}
      >
        <View className="flex-1 pr-2">
          {tieneConsulta ? (
            <TextoResaltado
              className="text-h3 font-bold text-text-primary"
              consulta={consulta}
              texto={capitulo.titulo}
            />
          ) : (
            <Text className="text-h3 font-bold text-text-primary">
              {capitulo.titulo}
            </Text>
          )}

          {tieneConsulta && seccionesCoincidentes.length > 0 ? (
            <View className="mt-2.5 gap-2 border-t border-border/60 pt-2.5">
              {seccionesCoincidentes.map((sec) => (
                <View key={sec.seccion.id} className="gap-0.5">
                  <TextoResaltado
                    className="text-body font-semibold text-text-secondary"
                    consulta={consulta}
                    texto={sec.seccion.titulo}
                  />
                  {sec.snippetCuerpo ? (
                    <TextoResaltado
                      className="text-label text-text-secondary italic"
                      consulta={consulta}
                      texto={sec.snippetCuerpo}
                    />
                  ) : null}
                </View>
              ))}
            </View>
          ) : !tieneConsulta && capitulo.secciones.length > 0 ? (
            <View className="mt-2 gap-1">
              {capitulo.secciones.map((sec) => (
                <Text
                  className="text-body text-text-secondary"
                  key={sec.id}
                  numberOfLines={1}
                >
                  • {sec.titulo}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
        <IconoChevronDerecha className="text-text-disabled" size={18} />
      </Pressable>
    </View>
  );
}
