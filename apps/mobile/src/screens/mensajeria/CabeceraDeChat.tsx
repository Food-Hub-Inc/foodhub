import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MENSAJES_MENSAJERIA, type ConversacionDetalle } from '@foodhub/shared';
import { IconoChevronIzquierda } from '../../components/iconos';
import { Boton } from '../../components/ui/Boton';
import { HojaInferior } from '../../components/ui/HojaInferior';
import { TEXTOS_NAVEGACION, TEXTOS_MENSAJERIA } from '../../lib/textos';
import { AvatarDeParticipante } from '../pedidos/Piezas';
import { nombreDe } from './formato';

/**
 * Cabecera de PAN-MSG-02 (US-MSG-01, US-MSG-05 y US-MSG-07).
 *
 * "foto de perfil, nombre completo, indicador de estado (en línea / última
 * conexión hace X tiempo) y un botón 'Ver perfil'"; y al tocarla, "las opciones:
 * 'Ver perfil' y 'Archivar conversación'".
 *
 * DOS AUSENCIAS DELIBERADAS, LAS DOS DE US-MSG-07:
 *
 *   con la cuenta dada de baja, el nombre se reemplaza por "Usuario no
 *   disponible" (lo resuelve `nombreDe`) y "Ver perfil" NO se muestra: el
 *   criterio pide ocultarlo, y el perfil público de una cuenta eliminada no
 *   existe.
 *
 * DEL INDICADOR DE ESTADO sólo se muestra "En línea", nunca "última conexión
 * hace X tiempo": el sistema no registra la última conexión de nadie y la
 * presencia sale del canal de Realtime, que sólo sabe quién está conectado
 * ahora. Ver PENDIENTE_PRESENCIA_MENSAJERIA.md.
 */
export function CabeceraDeChat({
  conversacion,
  enLinea,
  escribiendo,
  menuAbierto,
  onAbrirMenu,
  onCerrarMenu,
  onArchivar,
}: {
  conversacion: ConversacionDetalle;
  enLinea: boolean;
  escribiendo: boolean;
  menuAbierto: boolean;
  onAbrirMenu: () => void;
  onCerrarMenu: () => void;
  onArchivar: () => void;
}) {
  const { interlocutor } = conversacion;
  const nombre = nombreDe(interlocutor);
  const puedeVerPerfil = !interlocutor.eliminado;

  const irAlPerfil = () => {
    onCerrarMenu();
    router.push(
      interlocutor.esCocinero
        ? `/cocineros/${interlocutor.id}`
        : `/clientes/${interlocutor.id}`,
    );
  };

  return (
    <>
      <View className="h-16 flex-row items-center border-b border-border bg-surface pl-2 pr-1">
        <Pressable
          accessibilityLabel={TEXTOS_NAVEGACION.volver}
          accessibilityRole="button"
          className="h-11 w-11 items-center justify-center"
          onPress={() => {
            router.back();
          }}
        >
          <IconoChevronIzquierda className="text-text-primary" size={22} />
        </Pressable>

        <Pressable
          accessibilityLabel={TEXTOS_MENSAJERIA.opcionesDeLaConversacion}
          accessibilityRole="button"
          className="min-h-11 min-w-0 flex-1 flex-row items-center gap-3"
          onPress={onAbrirMenu}
        >
          <AvatarDeParticipante
            fotoPerfilUrl={interlocutor.fotoPerfilUrl}
            tamano="h-10 w-10"
          />

          <View className="min-w-0 flex-1">
            <Text
              className="text-body font-bold text-text-primary"
              numberOfLines={1}
            >
              {nombre}
            </Text>

            <SubtituloDeCabecera enLinea={enLinea} escribiendo={escribiendo} />
          </View>
        </Pressable>

        {puedeVerPerfil ? <BotonVerPerfil onPress={irAlPerfil} /> : null}
      </View>

      <HojaDeOpciones
        abierta={menuAbierto}
        conversacion={conversacion}
        onArchivar={onArchivar}
        onCerrar={onCerrarMenu}
        onVerPerfil={irAlPerfil}
      />
    </>
  );
}

/**
 * "Ver perfil" de la cabecera.
 *
 * Botón de texto y no `Boton`: el `sm` trae `px-4` y un contenedor `w-full` que
 * en esta fila le disputaba el ancho al nombre y lo cortaba aunque sobrara
 * lugar. `shrink-0` + padding mínimo lo deja pegado al borde derecho sin perder
 * el área táctil de 44 px.
 */
function BotonVerPerfil({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      className="min-h-11 shrink-0 justify-center px-2"
      onPress={onPress}
    >
      <Text className="text-body font-semibold text-primary">
        {MENSAJES_MENSAJERIA.verPerfil}
      </Text>
    </Pressable>
  );
}

/**
 * Menú que abre la cabecera al tocarla (US-MSG-05): "Muestre las opciones: 'Ver
 * perfil' (redirige al perfil público del interlocutor) y 'Archivar
 * conversación'".
 */
function HojaDeOpciones({
  abierta,
  conversacion,
  onCerrar,
  onVerPerfil,
  onArchivar,
}: {
  abierta: boolean;
  conversacion: ConversacionDetalle;
  onCerrar: () => void;
  onVerPerfil: () => void;
  onArchivar: () => void;
}) {
  const puedeVerPerfil = !conversacion.interlocutor.eliminado;

  return (
    <HojaInferior
      abierta={abierta}
      etiquetaAccesible={TEXTOS_MENSAJERIA.opcionesDeLaConversacion}
      onCerrar={onCerrar}
    >
      {puedeVerPerfil ? (
        <Boton onPress={onVerPerfil} variante="secundario">
          {MENSAJES_MENSAJERIA.verPerfil}
        </Boton>
      ) : null}

      {/*
        US-MSG-07: una conversación bloqueada por baja ya está archivada y no
        vuelve al listado principal, así que la acción no tendría efecto.
      */}
      {conversacion.bloqueadaPorBaja ? null : (
        <View className={puedeVerPerfil ? 'mt-3' : ''}>
          <Boton
            onPress={() => {
              onCerrar();
              onArchivar();
            }}
            variante="secundario"
          >
            {conversacion.archivada
              ? MENSAJES_MENSAJERIA.desarchivarConversacion
              : MENSAJES_MENSAJERIA.archivarConversacion}
          </Boton>
        </View>
      )}
    </HojaInferior>
  );
}

/**
 * La línea de abajo del nombre.
 *
 * "Escribiendo..." GANA sobre "En línea" cuando se dan los dos: es información
 * más específica y más útil, y quien está escribiendo está en línea por
 * definición. Cuando no hay ninguna de las dos la línea desaparece en lugar de
 * mostrar "Desconectado", que el criterio no pide y que el sistema no puede
 * afirmar: la ausencia de presencia también puede ser una conexión inestable.
 */
function SubtituloDeCabecera({
  enLinea,
  escribiendo,
}: {
  enLinea: boolean;
  escribiendo: boolean;
}) {
  if (escribiendo) {
    return (
      <Text
        accessibilityLiveRegion="polite"
        className="text-caption font-semibold text-primary"
      >
        {MENSAJES_MENSAJERIA.escribiendo}
      </Text>
    );
  }

  if (!enLinea) return null;

  return (
    <Text className="text-caption text-success">
      {TEXTOS_MENSAJERIA.enLinea}
    </Text>
  );
}
