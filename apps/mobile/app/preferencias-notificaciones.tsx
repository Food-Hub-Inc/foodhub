import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { GrupoPreferenciaNotificacion } from '@foodhub/shared';
import { MENSAJES_CONFIGURACION } from '@foodhub/shared';
import { SafeAreaView } from '../src/components/SafeAreaView';
import { Aviso } from '../src/components/ui/Aviso';
import { EncabezadoPantalla } from '../src/components/ui/EncabezadoPantalla';
import { Esqueleto } from '../src/components/ui/Esqueleto';
import { EstadoDeError } from '../src/components/ui/EstadoDeError';
import { Interruptor } from '../src/components/ui/Interruptor';
import { IconoInformacion } from '../src/components/iconos';
import { usePerfil } from '../src/hooks/usePerfil';
import {
  useActualizarPreferenciaNotificacion,
  usePreferenciasNotificacion,
} from '../src/hooks/usePreferenciasNotificacion';
import { mensajeDeError } from '../src/lib/api';
import { TEXTOS_PREFERENCIAS_NOTIFICACION } from '../src/lib/textos';

/**
 * Preferencias de notificación push — US-CFG-05 (RF059), PAN-CFG-01.
 *
 * La lista de switches y su orden ya vienen resueltos por rol desde la API
 * (`GET /usuarios/yo/preferencias-notificacion`): esta pantalla solo elige
 * qué texto mostrar para cada grupo, porque "Cambios de estado de..." se
 * redacta distinto para cliente y cocinero.
 */
export default function PreferenciasNotificaciones() {
  const perfil = usePerfil();
  const preferencias = usePreferenciasNotificacion();
  const actualizar = useActualizarPreferenciaNotificacion();
  const [grupoEnProgreso, setGrupoEnProgreso] =
    useState<GrupoPreferenciaNotificacion | null>(null);
  const [mensajeToast, setMensajeToast] = useState<string | null>(null);

  useEffect(() => {
    if (!mensajeToast) return;
    const temporizador = setTimeout(() => {
      setMensajeToast(null);
    }, 2000);
    return () => {
      clearTimeout(temporizador);
    };
  }, [mensajeToast]);

  const etiquetas =
    perfil.data?.tipo === 'COCINERO'
      ? TEXTOS_PREFERENCIAS_NOTIFICACION.etiquetasCocinero
      : TEXTOS_PREFERENCIAS_NOTIFICACION.etiquetasCliente;

  function cambiar(grupo: GrupoPreferenciaNotificacion, activa: boolean) {
    setGrupoEnProgreso(grupo);
    actualizar.mutate(
      { grupo, activa },
      {
        onSuccess: () => {
          setMensajeToast(MENSAJES_CONFIGURACION.preferenciaActualizada);
        },
        onSettled: () => {
          setGrupoEnProgreso(null);
        },
      },
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <EncabezadoPantalla titulo={TEXTOS_PREFERENCIAS_NOTIFICACION.titulo} />

      {preferencias.isError ? (
        <EstadoDeError
          mensaje={mensajeDeError(preferencias.error)}
          onReintentar={() => {
            void preferencias.refetch();
          }}
        />
      ) : !preferencias.data || !perfil.data ? (
        <View aria-hidden className="px-4 pt-4">
          <Esqueleto className="h-14 w-full" />
          <Esqueleto className="mt-3 h-14 w-full" />
          <Esqueleto className="mt-3 h-14 w-full" />
        </View>
      ) : (
        <ScrollView>
          <View className="border-t border-border">
            {preferencias.data.map((preferencia) => (
              <FilaDePreferencia
                key={preferencia.grupo}
                activa={preferencia.activa}
                cargando={grupoEnProgreso === preferencia.grupo}
                etiqueta={etiquetaDe(preferencia.grupo, etiquetas)}
                modificable={preferencia.modificable}
                onCambiar={(activa) => {
                  cambiar(preferencia.grupo, activa);
                }}
              />
            ))}
          </View>
        </ScrollView>
      )}

      {mensajeToast ? (
        <View className="absolute right-4 bottom-6 left-4">
          <Aviso mensaje={mensajeToast} tono="exito" />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

/** El grupo siempre está en el objeto que corresponde al rol: lo arma la API. */
function etiquetaDe(
  grupo: GrupoPreferenciaNotificacion,
  etiquetas: Partial<Record<GrupoPreferenciaNotificacion, string>>,
): string {
  return etiquetas[grupo] ?? grupo;
}

/** Una fila de PAN-CFG-01: etiqueta, switch y, si es esencial, el ícono con su tooltip. */
function FilaDePreferencia({
  etiqueta,
  activa,
  modificable,
  cargando,
  onCambiar,
}: {
  etiqueta: string;
  activa: boolean;
  modificable: boolean;
  cargando: boolean;
  onCambiar: (activa: boolean) => void;
}) {
  const [tooltipAbierto, setTooltipAbierto] = useState(false);

  return (
    <View className="border-b border-border px-4 py-3">
      <View className="flex-row items-center gap-2">
        <Text className="flex-1 text-body text-text-primary">{etiqueta}</Text>

        {modificable ? null : (
          <Pressable
            accessibilityLabel={MENSAJES_CONFIGURACION.notificacionEsencial}
            accessibilityRole="button"
            className="h-11 w-11 items-center justify-center"
            onPress={() => {
              setTooltipAbierto((abierto) => !abierto);
            }}
          >
            <IconoInformacion className="text-text-secondary" size={18} />
          </Pressable>
        )}

        <Interruptor
          activo={activa}
          deshabilitado={!modificable || cargando}
          etiquetaAccesible={etiqueta}
          onChange={onCambiar}
        />
      </View>

      {tooltipAbierto ? (
        <Aviso
          className="mt-2"
          mensaje={MENSAJES_CONFIGURACION.notificacionEsencial}
          tono="informativo"
        />
      ) : null}
    </View>
  );
}
