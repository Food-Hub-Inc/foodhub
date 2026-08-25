import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { MENSAJES_MENSAJERIA } from '@foodhub/shared';
import { IconoMensaje } from '../../components/iconos';
import { Aviso } from '../../components/ui/Aviso';
import { Boton } from '../../components/ui/Boton';
import { FondoTenue } from '../../components/ui/FondoTenue';
import {
  useAbrirConversacion,
  useConversacionCon,
} from '../../hooks/useMensajeria';
import { mensajeDeError } from '../../lib/api';
import { TEXTOS_MENSAJERIA } from '../../lib/textos';

/**
 * Acceso al chat desde fuera del módulo (US-MSG-01 y US-MSG-06).
 *
 * Lo usan los dos puntos de entrada que fijan los criterios: el botón "Enviar
 * mensaje" del perfil público del cocinero (US-MSG-01 / RF018) y el botón
 * "Mensajes del pedido" del seguimiento y del detalle (US-MSG-06 / RF078).
 *
 * ABRIR LA CONVERSACIÓN ES UNA MUTACIÓN, no una navegación directa: hasta que la
 * API no responde no existe el id al que navegar. Es idempotente —devuelve el
 * hilo de siempre o crea el único posible—, así que tocar el botón dos veces no
 * duplica nada.
 *
 * EL CONTADOR SE CONSULTA APARTE Y SIN CREAR NADA. US-MSG-06 pide "un indicador
 * visual (contador de mensajes no leídos) sobre el botón 'Mensajes del pedido'",
 * y para eso hace falta saber si ya hay hilo ANTES de que el usuario lo toque.
 * `useConversacionCon` responde eso sin escribir en la base: abrir la
 * conversación ahí crearía una fila vacía cada vez que alguien mira un pedido.
 */
export function BotonDeMensajes({
  destinatarioId,
  etiqueta,
  conContador = false,
}: {
  destinatarioId: string;
  /** El texto lo fija el criterio de cada pantalla, y no son el mismo. */
  etiqueta: string;
  /** US-MSG-06 lo pide sobre el botón del pedido; US-MSG-01 no. */
  conContador?: boolean;
}) {
  const abrir = useAbrirConversacion();
  const existente = useConversacionCon(
    conContador ? destinatarioId : undefined,
  );
  const noLeidos = existente.data?.noLeidos ?? 0;

  return (
    <View className="gap-2">
      <View>
        <Boton
          cargando={abrir.isPending}
          icono={<IconoMensaje className="text-primary" size={18} />}
          onPress={() => {
            abrir.mutate(destinatarioId, {
              onSuccess: (conversacion) => {
                router.push({
                  pathname: '/mensajes/[conversacionId]',
                  params: { conversacionId: conversacion.id },
                });
              },
            });
          }}
          variante="secundario"
        >
          {etiqueta}
        </Boton>

        {conContador && noLeidos > 0 ? (
          <View
            accessibilityLabel={TEXTOS_MENSAJERIA.cantidadNoLeidos(noLeidos)}
            className="absolute -right-1 -top-1 min-w-6 items-center overflow-hidden rounded-full px-1.5 py-0.5"
          >
            <FondoTenue className="bg-primary" />
            <Text className="text-caption font-bold text-primary">
              {String(noLeidos)}
            </Text>
          </View>
        ) : null}
      </View>

      {/*
        US-MSG-01: "La cuenta del destinatario fue eliminada entre el acceso al
        perfil y el envío → bloquee el envío del mensaje y muestre 'El
        destinatario ya no forma parte de la plataforma.'". La API lo responde
        con ese literal; el aviso lo muestra donde el usuario tocó.
      */}
      {abrir.isError ? (
        <Aviso mensaje={mensajeDeError(abrir.error)} tono="error" />
      ) : null}
    </View>
  );
}

/**
 * El acceso al chat desde un pedido (US-MSG-06 / RF078).
 *
 * Va tanto en el seguimiento (PAN-PED-03) como en el detalle (PAN-PED-06) y para
 * los dos roles: "El cliente o el cocinero abre la pantalla de seguimiento o
 * detalle del pedido → muestre un botón 'Mensajes del pedido'". Sigue estando
 * cuando el pedido ya se completó o se canceló, que es el cuarto criterio de la
 * misma historia.
 *
 * El hilo se resuelve por el par cliente-cocinero del pedido: el diagrama
 * vigente no tiene `pedidoId` en `Conversacion` y el índice único admite una
 * sola conversación por par (decisión del equipo, 2026-08-21).
 */
export function BotonMensajesDelPedido({
  participanteId,
}: {
  participanteId: string;
}) {
  return (
    <BotonDeMensajes
      conContador
      destinatarioId={participanteId}
      etiqueta={MENSAJES_MENSAJERIA.mensajesDelPedido}
    />
  );
}
