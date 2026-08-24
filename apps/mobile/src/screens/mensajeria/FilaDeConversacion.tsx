import { Pressable, Text, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { MENSAJES_MENSAJERIA, type ConversacionResumen } from '@foodhub/shared';
import { FondoTenue } from '../../components/ui/FondoTenue';
import { TEXTOS_MENSAJERIA } from '../../lib/textos';
import { AvatarDeParticipante } from '../pedidos/Piezas';
import { extractoDe, marcaDeTiempo, nombreDe } from './formato';

/**
 * Una fila de PAN-MSG-01 (US-MSG-04).
 *
 * "foto de perfil del interlocutor, nombre completo, extracto del último
 * mensaje, fecha y hora del último mensaje y un contador de mensajes no leídos."
 *
 * EL DESLIZAMIENTO ES EL ACCESO A "ARCHIVAR", no un atajo alternativo: el
 * criterio dice "El usuario desliza una conversación del listado → Muestre el
 * botón 'Archivar'". La misma acción está también en el menú de la cabecera del
 * chat (US-MSG-05), para quien no descubra el gesto.
 */

/** Fondo que aparece bajo la fila al deslizarla. */
function AccionArchivar({
  etiqueta,
  onPress,
}: {
  etiqueta: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={etiqueta}
      accessibilityRole="button"
      className="w-28 items-center justify-center bg-primary"
      onPress={onPress}
    >
      <Text className="text-label font-bold text-surface">{etiqueta}</Text>
    </Pressable>
  );
}

export function FilaDeConversacion({
  conversacion,
  onAbrir,
  onArchivar,
}: {
  conversacion: ConversacionResumen;
  onAbrir: () => void;
  onArchivar: () => void;
}) {
  const nombre = nombreDe(conversacion.interlocutor);
  const noLeidos = conversacion.noLeidos;

  /**
   * US-MSG-07: una conversación bloqueada por baja ya está archivada y "no
   * retorne al listado principal ante nuevos eventos". Ofrecer "Archivar" sobre
   * ella no tendría efecto, y desarchivarla la API la rechaza: el gesto se
   * desactiva en lugar de dejar un botón que no hace nada.
   */
  const etiquetaDeAccion = conversacion.archivada
    ? TEXTOS_MENSAJERIA.filtroActivas
    : MENSAJES_MENSAJERIA.archivar;

  const fila = (
    <Pressable
      accessibilityHint={
        noLeidos > 0 ? TEXTOS_MENSAJERIA.cantidadNoLeidos(noLeidos) : undefined
      }
      accessibilityLabel={TEXTOS_MENSAJERIA.abrirConversacionCon(nombre)}
      accessibilityRole="button"
      className="min-h-18 flex-row items-center gap-3 border-b border-border bg-surface px-4 py-3"
      onPress={onAbrir}
    >
      <AvatarDeParticipante
        fotoPerfilUrl={conversacion.interlocutor.fotoPerfilUrl}
      />

      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text
            className="flex-1 text-body font-bold text-text-primary"
            numberOfLines={1}
          >
            {nombre}
          </Text>
          <Text className="text-caption text-text-secondary">
            {marcaDeTiempo(conversacion.fechaUltimoMensaje)}
          </Text>
        </View>

        <View className="mt-0.5 flex-row items-center gap-2">
          <Text
            className={`flex-1 text-body ${
              noLeidos > 0
                ? 'font-semibold text-text-primary'
                : 'text-text-secondary'
            }`}
            numberOfLines={1}
          >
            {extractoDe(conversacion.ultimoMensaje)}
          </Text>

          {noLeidos > 0 ? (
            <View className="min-w-6 items-center overflow-hidden rounded-full px-1.5 py-0.5">
              <FondoTenue className="bg-primary" />
              <Text className="text-caption font-bold text-primary">
                {String(noLeidos)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );

  if (conversacion.bloqueadaPorBaja) return fila;

  return (
    <ReanimatedSwipeable
      renderRightActions={() => (
        <AccionArchivar etiqueta={etiquetaDeAccion} onPress={onArchivar} />
      )}
      rightThreshold={40}
    >
      {fila}
    </ReanimatedSwipeable>
  );
}
