import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { IconoDescargar, IconoTacho } from '../iconos';
import { TEXTOS_AYUDA } from '../../lib/textos';
import { formatearTamano } from '../../lib/formatoBytes';
import type { ArchivoParaSubir } from '../../hooks/useSelectorDeAdjuntos';
import { Boton } from '../ui/Boton';
import { MensajeDeCampo } from '../ui/MensajeDeCampo';

/**
 * Bloque de archivos adjuntos (US-AYU-03, PAN-AYU-03).
 *
 * Lista las miniaturas (o un ícono PDF) con su nombre y un boton "Quitar".
 * Abajo, un boton "Adjuntar archivo" que dispara el selector. El boton
 * se deshabilita cuando ya hay 3 adjuntos, que es el maximo del criterio.
 *
 * La miniatura es solo para JPG y PNG: el `Image` de Expo sirve cualquier
 * URI, pero para PDF no hay preview razonable. Por eso mostramos un
 * ícono de archivo en ese caso y reservamos `Image` para las imagenes.
 *
 * La logica de validacion, el estado y la apertura del picker viven en
 * `useSelectorDeAdjuntos`; este componente solo renderiza.
 */

export function ListaDeAdjuntos({
  archivos,
  error,
  habilitado,
  alAdjuntar,
  alQuitar,
}: {
  archivos: readonly ArchivoParaSubir[];
  error: string | undefined;
  habilitado: boolean;
  alAdjuntar: () => void;
  alQuitar: (indice: number) => void;
}) {
  return (
    <View>
      <View className="mb-1.5 flex-row items-center gap-1">
        <Text className="text-label font-semibold text-text-primary">
          {TEXTOS_AYUDA.consulta.bloqueAdjuntos}
        </Text>
        <Text className="text-label text-text-secondary">
          {TEXTOS_REGISTRO_OPCIONAL}
        </Text>
      </View>

      {archivos.length === 0 ? null : (
        <View className="mb-2 gap-2" accessibilityLabel="Archivos adjuntos">
          {archivos.map((archivo, indice) => (
            <FilaDeAdjunto
              archivo={archivo}
              indice={indice}
              key={`${archivo.uri}-${String(indice)}`}
              onQuitar={alQuitar}
            />
          ))}
        </View>
      )}

      <Boton
        deshabilitado={!habilitado}
        onPress={alAdjuntar}
        tamano="sm"
        variante="secundario"
        accessibilityLabel={TEXTOS_AYUDA.consulta.botonAdjuntar}
      >
        {TEXTOS_AYUDA.consulta.botonAdjuntar}
      </Boton>

      <MensajeDeCampo idCampo="adjuntos-consulta" mensaje={error} />
    </View>
  );
}

const TEXTOS_REGISTRO_OPCIONAL = '(opcional)';

function FilaDeAdjunto({
  archivo,
  indice,
  onQuitar,
}: {
  archivo: ArchivoParaSubir;
  indice: number;
  onQuitar: (indice: number) => void;
}) {
  const esImagen = archivo.mimeType !== 'application/pdf';
  return (
    <View
      className="flex-row items-center gap-3 rounded-md border border-border bg-surface px-3 py-2"
      accessibilityLabel={`Adjunto: ${archivo.nombre}, ${formatearTamano(archivo.tamano)}`}
    >
      {esImagen ? (
        <Image
          accessibilityLabel={archivo.nombre}
          contentFit="cover"
          source={{ uri: archivo.uri }}
          style={{ height: 40, width: 40, borderRadius: 4 }}
        />
      ) : (
        <View className="h-10 w-10 items-center justify-center rounded-xs bg-background">
          <IconoDescargar className="text-primary" size={20} />
        </View>
      )}
      <View className="flex-1">
        <Text className="text-body text-text-primary" numberOfLines={1}>
          {archivo.nombre}
        </Text>
        <Text className="text-caption text-text-secondary">
          {formatearTamano(archivo.tamano)}
        </Text>
      </View>
      <Pressable
        accessibilityLabel={TEXTOS_AYUDA.consulta.quitarAccesible(
          archivo.nombre,
        )}
        accessibilityRole="button"
        className="h-11 w-11 items-center justify-center"
        onPress={() => {
          onQuitar(indice);
        }}
      >
        <IconoTacho className="text-error" size={20} />
      </Pressable>
    </View>
  );
}
