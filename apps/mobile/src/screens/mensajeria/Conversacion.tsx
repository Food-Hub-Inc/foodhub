import { useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import type { ConversacionDetalle, Mensaje } from '@foodhub/shared';
import { IconoMensaje } from '../../components/iconos';
import { SafeAreaView } from '../../components/SafeAreaView';
import { Esqueleto } from '../../components/ui/Esqueleto';
import { EstadoDeError } from '../../components/ui/EstadoDeError';
import { EstadoVacio } from '../../components/ui/EstadoVacio';
import { useChat } from '../../hooks/useChat';
import type { MensajePendiente } from '../../hooks/useEnvioDeMensajes';
import {
  useArchivarConversacion,
  useConversacion,
} from '../../hooks/useMensajeria';
import { useSesion } from '../../hooks/useSesion';
import { mensajeDeError } from '../../lib/api';
import { TEXTOS_MENSAJERIA } from '../../lib/textos';
import { AreaDeEnvio } from './AreaDeEnvio';
import { BurbujaDeMensaje, BurbujaPendiente } from './Burbuja';
import { CabeceraDeChat } from './CabeceraDeChat';
import { VisorDeImagen } from './VisorDeImagen';

/**
 * Conversación — PAN-MSG-02 · US-MSG-02, US-MSG-03, US-MSG-05 y US-MSG-07.
 *
 * LA LISTA VA INVERTIDA (`inverted`), y eso resuelve dos criterios a la vez:
 *
 *   "posicione la pantalla en el mensaje más reciente" — con `inverted` el
 *   origen del scroll es el final del hilo, sin `scrollToEnd` ni saltos visibles
 *   al abrir;
 *   "al hacer scroll hacia arriba, cargue bloques adicionales" — hacia arriba
 *   pasa a ser el `onEndReached` de la lista, que es el disparador que
 *   `FlatList` virtualiza bien.
 *
 * El precio es que los datos se le pasan al revés. Se hace una sola vez, acá,
 * sobre el arreglo que ya viene ordenado del más viejo al más nuevo.
 */

/** Un pendiente se dibuja como un mensaje más, al final del hilo. */
type Fila =
  | { clase: 'mensaje'; mensaje: Mensaje }
  | { clase: 'pendiente'; pendiente: MensajePendiente };

export function Conversacion({ conversacionId }: { conversacionId: string }) {
  const sesion = useSesion((estado) => estado.sesion);
  const detalle = useConversacion(conversacionId);
  const miId = sesion?.user.id;

  if (detalle.isError) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <EstadoDeError
          mensaje={mensajeDeError(detalle.error)}
          onReintentar={() => {
            void detalle.refetch();
          }}
        />
      </SafeAreaView>
    );
  }

  if (detalle.isPending || miId === undefined) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <EsqueletoDelChat />
      </SafeAreaView>
    );
  }

  return <ChatCargado conversacion={detalle.data} miId={miId} />;
}

function ChatCargado({
  conversacion,
  miId,
}: {
  conversacion: ConversacionDetalle;
  miId: string;
}) {
  const chat = useChat({
    conversacionId: conversacion.id,
    miId,
    interlocutorId: conversacion.interlocutor.id,
  });

  const archivar = useArchivarConversacion();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [imagenAmpliada, setImagenAmpliada] = useState<string | null>(null);

  const filas: Fila[] = [
    ...chat.mensajes.map((mensaje) => ({ clase: 'mensaje' as const, mensaje })),
    ...chat.pendientes.map((pendiente) => ({
      clase: 'pendiente' as const,
      pendiente,
    })),
  ].reverse();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <CabeceraDeChat
        conversacion={conversacion}
        enLinea={chat.interlocutorEnLinea}
        escribiendo={chat.interlocutorEscribiendo}
        menuAbierto={menuAbierto}
        onAbrirMenu={() => {
          setMenuAbierto(true);
        }}
        onArchivar={() => {
          // Alterna, no fija: la hoja de la cabecera es el mismo botón para
          // archivar y para devolver la conversación al listado principal.
          archivar.mutate({
            conversacionId: conversacion.id,
            archivada: !conversacion.archivada,
          });
        }}
        onCerrarMenu={() => {
          setMenuAbierto(false);
        }}
      />

      {/*
        El `KeyboardAvoidingView` es el de `react-native-keyboard-controller` y
        no el del core: el del core solo acepta un `behavior` útil en iOS y en
        Android -la plataforma del proyecto- dejaba el campo de escritura debajo
        del teclado. `style` en vez de `className` porque el componente viene de
        una librería de terceros y uniwind solo parchea los de React Native.
      */}
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <Hilo
          chat={chat}
          filas={filas}
          miId={miId}
          onVerImagen={setImagenAmpliada}
        />

        <AreaDeEnvio
          conversacion={conversacion}
          onEnviar={chat.enviar}
          onEscribiendo={chat.avisarQueEscribo}
        />
      </KeyboardAvoidingView>

      <VisorDeImagen
        imagenUrl={imagenAmpliada}
        onCerrar={() => {
          setImagenAmpliada(null);
        }}
      />
    </SafeAreaView>
  );
}

/** Skeleton con la forma de un hilo, no un spinner suelto. */
function EsqueletoDelChat() {
  return (
    <View className="flex-1 gap-3 p-4">
      <Esqueleto className="h-16 w-3/5" />
      <Esqueleto className="h-16 w-3/5 self-end" />
      <Esqueleto className="h-16 w-2/5" />
    </View>
  );
}

function Hilo({
  chat,
  filas,
  miId,
  onVerImagen,
}: {
  chat: ReturnType<typeof useChat>;
  filas: Fila[];
  miId: string;
  onVerImagen: (imagenUrl: string) => void;
}) {
  if (chat.error) {
    return (
      <EstadoDeError
        mensaje={mensajeDeError(chat.error)}
        onReintentar={chat.reintentarCarga}
      />
    );
  }

  if (chat.cargando) return <EsqueletoDelChat />;

  if (filas.length === 0) {
    return (
      <EstadoVacio
        icono={<IconoMensaje className="text-primary" size={28} />}
        titulo={TEXTOS_MENSAJERIA.sinMensajes}
      />
    );
  }

  return (
    <FlatList
      data={filas}
      inverted
      keyExtractor={(fila) =>
        fila.clase === 'mensaje' ? fila.mensaje.id : fila.pendiente.claveLocal
      }
      ListFooterComponent={
        chat.cargandoAntiguos ? (
          <Text className="py-3 text-center text-caption text-text-secondary">
            {TEXTOS_MENSAJERIA.cargandoAnteriores}
          </Text>
        ) : null
      }
      onEndReached={chat.cargarMasAntiguos}
      onEndReachedThreshold={0.4}
      renderItem={({ item }) =>
        item.clase === 'pendiente' ? (
          <BurbujaPendiente
            onReintentar={() => {
              chat.reintentar(item.pendiente.claveLocal);
            }}
            pendiente={item.pendiente}
          />
        ) : (
          <BurbujaDeMensaje
            mensaje={item.mensaje}
            onVerImagen={onVerImagen}
            propio={item.mensaje.remitenteId === miId}
          />
        )
      }
    />
  );
}
