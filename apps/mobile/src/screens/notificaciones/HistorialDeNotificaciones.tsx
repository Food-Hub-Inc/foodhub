import { useEffect, useMemo } from 'react';
import { Pressable, SectionList, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MENSAJES_NOTIFICACION, type Notificacion } from '@foodhub/shared';
import { IconoCampana, IconoEngranaje } from '../../components/iconos';
import { SafeAreaView } from '../../components/SafeAreaView';
import { EncabezadoPantalla } from '../../components/ui/EncabezadoPantalla';
import { Esqueleto } from '../../components/ui/Esqueleto';
import { EstadoDeError } from '../../components/ui/EstadoDeError';
import { EstadoVacio } from '../../components/ui/EstadoVacio';
import {
  aplanarNotificaciones,
  useMarcarLeidas,
  useNotificaciones,
} from '../../hooks/useNotificaciones';
import { mensajeDeError } from '../../lib/api';
import { deepLinkDeNotificacion } from '../../lib/deepLinkNotificacion';
import { marcaDeTiempoNotificacion } from '../../lib/formato';
import { TEXTOS_NOTIFICACIONES } from '../../lib/textos';
import { agruparPorDia, presentacionDe } from './presentacion';

/**
 * PAN-NOT-01 · Historial de notificaciones (US-NOT-07).
 *
 * Al montar se marcan todas como leídas (segundo criterio: "Al abrir el
 * historial, el indicador desaparece y las notificaciones se marcan como
 * leídas"). Las tarjetas conservan su estilo de "no leída" mientras el usuario
 * las mira -la lista no se revalida tras ese marcado-, así se ve qué había
 * nuevo; al volver a entrar ya figuran leídas.
 *
 * El engranaje de la cabecera lleva a PAN-NOT-02 (sexto criterio, US-NOT-08).
 */
export function HistorialDeNotificaciones() {
  const consulta = useNotificaciones();
  const marcarLeidas = useMarcarLeidas();

  const notificaciones = useMemo(
    () => aplanarNotificaciones(consulta.data?.pages),
    [consulta.data?.pages],
  );
  const secciones = useMemo(
    () => agruparPorDia(notificaciones),
    [notificaciones],
  );

  // Segundo criterio: al abrir, se marcan todas como leídas (una sola vez).
  const marcarTodasAlAbrir = marcarLeidas.mutate;
  useEffect(() => {
    if (consulta.isSuccess) marcarTodasAlAbrir(undefined);
  }, [consulta.isSuccess, marcarTodasAlAbrir]);

  const abrir = (notificacion: Notificacion) => {
    if (!notificacion.leida) marcarLeidas.mutate([notificacion.id]);
    router.push(
      deepLinkDeNotificacion(
        notificacion.tipoNotificacion,
        notificacion.objetoAfectadoId,
        notificacion.id,
      ),
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <EncabezadoPantalla
        titulo={TEXTOS_NOTIFICACIONES.titulo}
        accion={
          <View className="flex-row items-center">
            {notificaciones.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                className="h-11 items-center justify-center px-2"
                onPress={() => {
                  marcarLeidas.mutate(notificaciones.map((n) => n.id));
                }}
              >
                <Text className="text-body font-semibold text-primary">
                  {TEXTOS_NOTIFICACIONES.marcarTodas}
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityLabel={TEXTOS_NOTIFICACIONES.configurar}
              accessibilityRole="button"
              className="h-11 w-11 items-center justify-center"
              onPress={() => {
                router.push('/preferencias-notificaciones');
              }}
            >
              <IconoEngranaje className="text-text-primary" size={22} />
            </Pressable>
          </View>
        }
      />

      <Contenido consulta={consulta} secciones={secciones} onAbrir={abrir} />
    </SafeAreaView>
  );
}

function Contenido({
  consulta,
  secciones,
  onAbrir,
}: {
  consulta: ReturnType<typeof useNotificaciones>;
  secciones: ReturnType<typeof agruparPorDia>;
  onAbrir: (n: Notificacion) => void;
}) {
  if (consulta.isError) {
    return (
      <EstadoDeError
        mensaje={mensajeDeError(consulta.error)}
        onReintentar={() => {
          void consulta.refetch();
        }}
      />
    );
  }

  if (consulta.isPending) {
    return (
      <View className="px-4 pt-3">
        <Esqueleto className="mb-3 h-20 rounded-md" />
        <Esqueleto className="mb-3 h-20 rounded-md" />
        <Esqueleto className="mb-3 h-20 rounded-md" />
      </View>
    );
  }

  if (secciones.length === 0) {
    return (
      <View className="flex-1">
        <EstadoVacio
          icono={<IconoCampana className="text-text-disabled" size={28} />}
          titulo={MENSAJES_NOTIFICACION.historialVacio}
        />
      </View>
    );
  }

  return (
    <SectionList
      sections={secciones}
      keyExtractor={(item) => item.id}
      contentContainerClassName="px-4 pb-8 pt-2"
      stickySectionHeadersEnabled={false}
      onEndReachedThreshold={0.4}
      onEndReached={() => {
        if (consulta.hasNextPage && !consulta.isFetchingNextPage) {
          void consulta.fetchNextPage();
        }
      }}
      renderSectionHeader={({ section }) => (
        <Text className="mb-2 mt-3 text-label font-semibold uppercase text-text-secondary">
          {section.titulo}
        </Text>
      )}
      renderItem={({ item }) => (
        <TarjetaDeNotificacion notificacion={item} onPress={onAbrir} />
      )}
      ListFooterComponent={
        consulta.isFetchingNextPage ? (
          <Text className="py-4 text-center text-caption text-text-secondary">
            {TEXTOS_NOTIFICACIONES.cargandoMas}
          </Text>
        ) : null
      }
    />
  );
}

/**
 * Una tarjeta del historial (tercer criterio de US-NOT-07): ícono por tipo,
 * texto del mensaje, y marca de tiempo. Las no leídas llevan fondo tenue y un
 * punto -el color no es el único canal: el punto y la etiqueta accesible
 * también lo dicen-.
 */
function TarjetaDeNotificacion({
  notificacion,
  onPress,
}: {
  notificacion: Notificacion;
  onPress: (n: Notificacion) => void;
}) {
  const { Icono, fondo, icono } = presentacionDe(notificacion.tipoNotificacion);
  const noLeida = !notificacion.leida;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        noLeida
          ? `${TEXTOS_NOTIFICACIONES.noLeida}. ${notificacion.titulo}. ${notificacion.cuerpo}`
          : `${notificacion.titulo}. ${notificacion.cuerpo}`
      }
      className={`mb-2 flex-row gap-3 rounded-md border p-3 ${
        noLeida ? 'border-primary/20 bg-primary/5' : 'border-border bg-surface'
      }`}
      onPress={() => {
        onPress(notificacion);
      }}
    >
      <View
        className={`h-10 w-10 shrink-0 items-center justify-center rounded-full ${fondo}`}
      >
        <Icono className={icono} size={20} />
      </View>

      <View className="flex-1">
        <Text className="text-h3 font-bold text-text-primary" numberOfLines={1}>
          {notificacion.titulo}
        </Text>
        <Text
          className="mt-0.5 text-body text-text-secondary"
          numberOfLines={2}
        >
          {notificacion.cuerpo}
        </Text>
        <Text className="mt-1 text-caption text-text-secondary">
          {marcaDeTiempoNotificacion(notificacion.fechaCreacion)}
        </Text>
      </View>

      {noLeida ? (
        <View
          aria-hidden
          className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary"
        />
      ) : null}
    </Pressable>
  );
}
