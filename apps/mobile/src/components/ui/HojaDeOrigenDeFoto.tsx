import { Text, View } from 'react-native';
import { TEXTOS_FOTO } from '../../lib/textos';
import { IconoCamara } from '../iconos';
import { Boton } from './Boton';
import { HojaInferior } from './HojaInferior';

/**
 * Hoja con las dos opciones de origen de una imagen: cámara o galería.
 *
 * Vive suelta y no dentro de `SelectorDeFoto` porque la usan dos pantallas con
 * disparadores distintos: la zona punteada del registro (PAN-AUT-01 y
 * PAN-AUT-02) y el botón de cámara sobre el avatar de "Mi perfil"
 * (PAN-GURP-01). Es la misma decisión para el usuario, y duplicarla haría que
 * una corrección entrara en una sola de las dos.
 *
 * El criterio de aceptación de US-AUT-01, US-AUT-02 y US-GURP-02 no define el
 * mecanismo de selección, así que se reutiliza el texto literal que sí fija
 * US-MSG-04 para el mismo dilema al adjuntar una imagen en el chat.
 */
export function HojaDeOrigenDeFoto({
  abierta,
  onCancelar,
  onTomarFoto,
  onElegirDeGaleria,
}: {
  abierta: boolean;
  onCancelar: () => void;
  onTomarFoto: () => void;
  onElegirDeGaleria: () => void;
}) {
  return (
    <HojaInferior
      abierta={abierta}
      etiquetaAccesible={TEXTOS_FOTO.elegirOrigen}
      onCerrar={onCancelar}
    >
      <Text className="mb-4 text-center text-h2 font-bold text-text-primary">
        {TEXTOS_FOTO.elegirOrigen}
      </Text>

      <Boton
        icono={<IconoCamara size={20} className="text-surface" />}
        onPress={onTomarFoto}
      >
        {TEXTOS_FOTO.tomarFoto}
      </Boton>

      <View className="mt-3">
        <Boton variante="secundario" onPress={onElegirDeGaleria}>
          {TEXTOS_FOTO.elegirDeGaleria}
        </Boton>
      </View>
    </HojaInferior>
  );
}
