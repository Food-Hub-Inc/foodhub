import { useEffect } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { Notificacion } from '@foodhub/shared';
import { SafeAreaView } from '../../components/SafeAreaView';
import { Boton } from '../../components/ui/Boton';
import { EncabezadoPantalla } from '../../components/ui/EncabezadoPantalla';
import { Esqueleto } from '../../components/ui/Esqueleto';
import { EstadoDeError } from '../../components/ui/EstadoDeError';
import {
  useMarcarLeidas,
  useNotificacion,
} from '../../hooks/useNotificaciones';
import { mensajeDeError } from '../../lib/api';
import { formatearFecha, formatearHora } from '../../lib/formato';
import { TEXTOS_NOTIFICACIONES } from '../../lib/textos';
import { presentacionDe } from './presentacion';

/**
 * PAN-NOT-03 · Detalle del aviso (US-NOT-04, RF037).
 *
 * "Redirija al usuario a la pantalla de detalle del aviso dentro del historial
 * de notificaciones, mostrando el mensaje completo": en el historial la
 * tarjeta corta el cuerpo a dos líneas, acá va entero. La pantalla no está en
 * la maquetación y sigue el estilo de PAN-NOT-01 (decisión del equipo del
 * 13/10/2026).
 *
 * Se llega desde el push o desde el historial. Desde el push el historial no
 * pasó por el medio, así que la marca de leída se hace acá (US-NOT-07, cuarto
 * criterio: "La notificación se marca como leída si aún no lo estaba").
 */
export function DetalleDeAviso({ id }: { id: string | undefined }) {
  const consulta = useNotificacion(id);
  const marcarLeidas = useMarcarLeidas();

  const noLeida = consulta.data?.leida === false;
  const marcar = marcarLeidas.mutate;
  useEffect(() => {
    if (noLeida && id) marcar([id]);
  }, [noLeida, id, marcar]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <EncabezadoPantalla
        destinoAlternativo="/notificaciones"
        titulo={TEXTOS_NOTIFICACIONES.tituloAviso}
      />
      <Contenido consulta={consulta} />
    </SafeAreaView>
  );
}

function Contenido({
  consulta,
}: {
  consulta: ReturnType<typeof useNotificacion>;
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

  if (!consulta.data) {
    return (
      <View aria-hidden className="px-4 pt-4">
        <Esqueleto className="h-10 w-10 rounded-full" />
        <Esqueleto className="mt-4 h-6 w-3/4" />
        <Esqueleto className="mt-2 h-4 w-1/3" />
        <Esqueleto className="mt-4 h-32 rounded-md" />
      </View>
    );
  }

  return <Aviso notificacion={consulta.data} />;
}

function Aviso({ notificacion }: { notificacion: Notificacion }) {
  const { Icono, fondo, icono } = presentacionDe(notificacion.tipoNotificacion);

  return (
    <ScrollView contentContainerClassName="px-4 pb-8 pt-4">
      <View className="rounded-md border border-border bg-surface p-4">
        <View
          className={`h-10 w-10 items-center justify-center rounded-full ${fondo}`}
        >
          <Icono className={icono} size={20} />
        </View>

        <Text
          accessibilityRole="header"
          className="mt-3 text-h2 font-bold text-text-primary"
        >
          {notificacion.titulo}
        </Text>
        <Text className="mt-1 text-caption text-text-secondary">
          {`${formatearFecha(notificacion.fechaCreacion)} · ${formatearHora(notificacion.fechaCreacion)}`}
        </Text>

        <Text className="mt-4 text-body text-text-primary">
          {notificacion.cuerpo}
        </Text>
      </View>

      <View className="mt-4">
        <Boton
          onPress={() => {
            router.replace('/notificaciones');
          }}
          tamano="sm"
          variante="secundario"
        >
          {TEXTOS_NOTIFICACIONES.verTodas}
        </Boton>
      </View>
    </ScrollView>
  );
}
