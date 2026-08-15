import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { FormatoImagenPerfil } from '@foodhub/shared';
import { TEXTOS_FOTO, TEXTOS_REGISTRO } from '../../lib/textos';
import { useSelectorDeFoto } from '../../hooks/useSelectorDeFoto';
import { IconoCamara } from '../iconos';
import { FondoTenue } from './FondoTenue';
import { HojaDeOrigenDeFoto } from './HojaDeOrigenDeFoto';
import { MensajeDeCampo } from './MensajeDeCampo';

/**
 * Zona punteada de "Agregar foto" (PAN-AUT-01 y PAN-AUT-02).
 *
 * QUÉ HACE Y QUÉ NO
 * ---------------------------------------------------------------------------
 * Elige la imagen, valida formato y tamaño contra el criterio de aceptación de
 * US-AUT-01 (JPG, PNG o WEBP de hasta 5 MB) y muestra la vista previa. NO la
 * sube: eso lo resuelve `subirFotoDePerfil` cuando el flujo que lo contiene
 * tiene una sesión con la cual firmar la URL de carga. Este componente no sabe
 * de red, y por eso sirve igual en el registro (PAN-AUT-01, PAN-AUT-02) que en
 * "Mi perfil" (PAN-GURP-01), que suben la foto en momentos distintos.
 *
 * Tocar el campo abre una hoja con "Tomar foto" / "Elegir de la galería": el
 * criterio de aceptación de US-AUT-01 y US-AUT-02 no define el mecanismo, así
 * que se reutiliza el mismo dilema y el mismo texto que sí fija US-MSG-04 para
 * adjuntar una imagen en el chat. La lógica de permisos y validación vive en
 * `useSelectorDeFoto`.
 */

/**
 * Los dos metadatos son OBLIGATORIOS y no opcionales, aunque el selector no
 * siempre los informe. Es `useSelectorDeFoto` el que los resuelve leyendo el
 * archivo: si acá pudieran faltar, cada consumidor tendría que decidir por su
 * cuenta qué hacer con una imagen de tipo o peso desconocido, y la validación
 * del criterio de aceptación se volvería opinable.
 */
export interface FotoElegida {
  uri: string;
  mimeType: FormatoImagenPerfil;
  tamano: number;
}

export function SelectorDeFoto({
  foto,
  onElegir,
  deshabilitado = false,
}: {
  foto: FotoElegida | null;
  onElegir: (foto: FotoElegida | null) => void;
  deshabilitado?: boolean;
}) {
  const selector = useSelectorDeFoto(onElegir);

  return (
    <View>
      <View className="mb-1.5 flex-row items-center gap-1">
        <Text className="text-label font-semibold text-text-primary">
          {TEXTOS_REGISTRO.fotoPerfil}
        </Text>
        <Text className="text-label text-text-secondary">
          {TEXTOS_REGISTRO.opcional}
        </Text>
      </View>

      <CampoDeFoto
        deshabilitado={deshabilitado}
        foto={foto}
        onPress={selector.abrir}
      />

      <MensajeDeCampo mensaje={selector.error} idCampo="foto-perfil" />

      <HojaDeOrigenDeFoto
        abierta={selector.abierta}
        onCancelar={selector.cerrar}
        onElegirDeGaleria={selector.elegirDeGaleria}
        onTomarFoto={selector.tomarFoto}
      />
    </View>
  );
}

/** La zona punteada en sí: vista previa si ya hay foto, ícono si no. */
function CampoDeFoto({
  foto,
  onPress,
  deshabilitado,
}: {
  foto: FotoElegida | null;
  onPress: () => void;
  deshabilitado: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado}
      className={`h-14 flex-row items-center justify-center gap-2 overflow-hidden rounded-sm border border-dashed border-primary ${deshabilitado ? 'opacity-50' : ''}`}
      accessibilityRole="button"
      accessibilityState={{ disabled: deshabilitado }}
      accessibilityLabel={
        foto ? TEXTOS_REGISTRO.cambiarFoto : TEXTOS_REGISTRO.agregarFoto
      }
    >
      <FondoTenue opacidad="opacity-5" />
      {foto ? (
        <Image
          source={{ uri: foto.uri }}
          style={{ width: 36, height: 36, borderRadius: 18 }}
          contentFit="cover"
          accessibilityLabel={TEXTOS_FOTO.vistaPrevia}
        />
      ) : (
        <IconoCamara size={20} className="text-primary" />
      )}
      <Text className="text-body font-bold text-primary">
        {foto ? TEXTOS_REGISTRO.cambiarFoto : TEXTOS_REGISTRO.agregarFoto}
      </Text>
    </Pressable>
  );
}
