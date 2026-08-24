import { useState } from 'react';
import { Text, View } from 'react-native';
import {
  FORMATOS_IMAGEN_MENSAJE,
  MAXIMO_IMAGEN_MENSAJE_BYTES,
  MENSAJES_MENSAJERIA,
  type ConversacionDetalle,
} from '@foodhub/shared';
import { HojaDeOrigenDeFoto } from '../../components/ui/HojaDeOrigenDeFoto';
import type { FotoElegida } from '../../components/ui/SelectorDeFoto';
import { useSelectorDeFoto } from '../../hooks/useSelectorDeFoto';
import type { Borrador } from '../../hooks/useEnvioDeMensajes';
import { TEXTOS_MENSAJERIA } from '../../lib/textos';
import { AvisoDeBloqueo, CampoDeMensaje } from './CampoDeMensaje';
import { textoDeBloqueo } from './formato';
import { VistaPreviaDeImagen } from './VistaPreviaDeImagen';

/**
 * Todo lo que hay debajo del hilo en PAN-MSG-02: el campo de entrada, el
 * selector de imagen y su vista previa (US-MSG-02 y US-MSG-03), o el aviso que
 * los reemplaza cuando la conversación no admite mensajes nuevos (US-MSG-01 y
 * US-MSG-07).
 *
 * Van juntos porque son UNA sola cosa desde el punto de vista del usuario —la
 * forma de mandar algo— y porque comparten estado: la foto elegida no existe
 * fuera del camino "adjuntar → previsualizar → enviar".
 */
export function AreaDeEnvio({
  conversacion,
  onEnviar,
  onEscribiendo,
}: {
  conversacion: ConversacionDetalle;
  onEnviar: (borrador: Borrador) => void;
  onEscribiendo: () => void;
}) {
  const [fotoElegida, setFotoElegida] = useState<FotoElegida | null>(null);

  /**
   * El selector es el mismo componente que usan la foto de perfil y la del
   * plato, pero con los límites del chat: JPG/PNG/WEBP hasta 8 MB y el literal
   * de US-MSG-03 cuando la imagen no cumple. Se comparte el componente, no las
   * reglas: son tres criterios de aceptación distintos.
   */
  const selector = useSelectorDeFoto(
    (foto) => {
      if (foto) setFotoElegida(foto);
    },
    {
      formatosPermitidos: FORMATOS_IMAGEN_MENSAJE,
      maximoBytes: MAXIMO_IMAGEN_MENSAJE_BYTES,
      mensajeInvalida: MENSAJES_MENSAJERIA.imagenInvalida,
      etiqueta: TEXTOS_MENSAJERIA.adjuntarImagen,
      textoAgregar: MENSAJES_MENSAJERIA.tomarFoto,
      textoCambiar: MENSAJES_MENSAJERIA.tomarFoto,
      idCampo: 'imagen-chat',
    },
  );

  if (!conversacion.puedeEnviar) {
    return (
      <AvisoDeBloqueo
        mensaje={textoDeBloqueo(
          conversacion.motivoBloqueo ?? 'BAJA',
          conversacion.interlocutor.esCocinero,
        )}
      />
    );
  }

  return (
    <View>
      {/* US-MSG-03: "El archivo debe ser una imagen JPG, PNG o WEBP de hasta
          8 MB." Lo detecta el dispositivo antes de gastar la subida. */}
      {selector.error ? (
        <Text
          accessibilityLiveRegion="polite"
          className="px-4 pb-1 text-center text-caption text-error"
        >
          {selector.error}
        </Text>
      ) : null}

      <CampoDeMensaje
        deshabilitado={false}
        onAdjuntar={selector.abrir}
        onEnviar={(contenido) => {
          onEnviar({ tipo: 'TEXTO', contenido });
        }}
        onEscribiendo={onEscribiendo}
      />

      <HojaDeOrigenDeFoto
        abierta={selector.abierta}
        onCancelar={selector.cerrar}
        onElegirDeGaleria={selector.elegirDeGaleria}
        onTomarFoto={selector.tomarFoto}
      />

      <VistaPreviaDeImagen
        foto={fotoElegida}
        onCancelar={() => {
          setFotoElegida(null);
        }}
        onEnviar={(pieDeImagen) => {
          if (fotoElegida) {
            onEnviar({
              tipo: 'IMAGEN',
              foto: fotoElegida,
              ...(pieDeImagen ? { pieDeImagen } : {}),
            });
          }
          setFotoElegida(null);
        }}
      />
    </View>
  );
}
