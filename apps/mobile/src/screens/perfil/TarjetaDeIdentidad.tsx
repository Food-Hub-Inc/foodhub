import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { PerfilUsuario } from '@foodhub/shared';
import {
  IconoCamara,
  IconoCocinero,
  IconoUsuario,
} from '../../components/iconos';
import { FondoTenue } from '../../components/ui/FondoTenue';
import { MensajeDeCampo } from '../../components/ui/MensajeDeCampo';
import { TEXTOS_PERFIL } from '../../lib/textos';
import { useColorDeToken } from '../../lib/tokens';

/**
 * Cabecera de PAN-GURP-01: quién sos.
 *
 * Muestra la foto, el nombre, el correo y —solo para el cocinero— el distintivo
 * de rol. El correo va como texto y no como campo editable: es la identidad de
 * la cuenta en Supabase Auth y RF088 no lo incluye entre los datos editables.
 *
 * Sin foto cargada se dibuja el marcador con la silueta, como pide el tercer
 * criterio de aceptación de US-GURP-01: la ausencia de imagen no puede romper
 * la pantalla ni dejar un hueco.
 *
 * El cambio de foto (US-GURP-02) se avisa sobre el avatar y no con un cartel
 * aparte: es donde el usuario está mirando cuando toca el botón de cámara.
 */
export function TarjetaDeIdentidad({
  perfil,
  onCambiarFoto,
  subiendoFoto = false,
  errorDeFoto,
}: {
  perfil: PerfilUsuario;
  onCambiarFoto: () => void;
  subiendoFoto?: boolean;
  errorDeFoto?: string | undefined;
}) {
  return (
    <View className="items-center rounded-md border border-border bg-surface p-6">
      <View className="h-24 w-24">
        <View className="h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-background">
          {perfil.fotoPerfilUrl == null ? (
            <IconoUsuario className="text-text-disabled" size={44} />
          ) : (
            <Image
              accessibilityLabel={TEXTOS_PERFIL.cambiarFoto}
              contentFit="cover"
              source={{ uri: perfil.fotoPerfilUrl }}
              style={{ width: '100%', height: '100%' }}
            />
          )}

          {subiendoFoto ? <VeloDeSubida /> : null}
        </View>

        <BotonDeCamara deshabilitado={subiendoFoto} onPress={onCambiarFoto} />
      </View>

      <Text className="mt-4 text-h2 font-bold text-text-primary">
        {perfil.nombre} {perfil.apellido}
      </Text>
      <Text className="mt-1 text-body text-text-secondary">{perfil.email}</Text>

      {perfil.tipo === 'COCINERO' ? <DistintivoDeCocinero /> : null}

      {/* Cubre los dos motivos de rechazo de US-GURP-02: la imagen no cumple
          formato o tamaño, o la subida a Storage falló. */}
      <MensajeDeCampo idCampo="foto-perfil" mensaje={errorDeFoto} />
    </View>
  );
}

/**
 * Velo con indicador mientras la foto viaja a Storage.
 *
 * Va ENCIMA del avatar y no reemplazándolo: el usuario tiene que seguir viendo
 * cuál era su foto anterior mientras se reemplaza, para entender qué cambia.
 */
function VeloDeSubida() {
  const color = useColorDeToken('text-surface');

  return (
    <View className="absolute inset-0 items-center justify-center bg-text-primary/40">
      <ActivityIndicator color={color} size="small" />
    </View>
  );
}

/**
 * El botón se dibuja de 36 px porque así lo muestra la maquetación, pero su
 * área de toque se extiende con `hitSlop` hasta los 44 px que exige la guía:
 * agrandar el círculo lo desalinearía del avatar.
 */
function BotonDeCamara({
  onPress,
  deshabilitado,
}: {
  onPress: () => void;
  deshabilitado: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={TEXTOS_PERFIL.cambiarFoto}
      accessibilityRole="button"
      accessibilityState={{ disabled: deshabilitado }}
      className={`absolute right-0 bottom-0 h-9 w-9 items-center justify-center rounded-full bg-primary ${deshabilitado ? 'opacity-50' : ''}`}
      disabled={deshabilitado}
      hitSlop={6}
      onPress={onPress}
    >
      <IconoCamara className="text-surface" size={18} />
    </Pressable>
  );
}

function DistintivoDeCocinero() {
  return (
    <View className="mt-3 flex-row items-center gap-1.5 overflow-hidden rounded-full px-3 py-1.5">
      <FondoTenue className="bg-primary" />
      <IconoCocinero className="text-primary" size={14} />
      <Text className="text-caption font-semibold text-primary">
        {TEXTOS_PERFIL.cocineroVerificado}
      </Text>
    </View>
  );
}
