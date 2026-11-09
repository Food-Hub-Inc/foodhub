import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import { MENSAJES_RESENA } from '@foodhub/shared';
import { IconoEstrella, IconoEstrellaRellena } from '../../components/iconos';
import { Aviso } from '../../components/ui/Aviso';
import { Boton } from '../../components/ui/Boton';
import { TEXTOS_RESENA } from '../../lib/textos';

/**
 * Vista previa previa a publicar — US-RES-01.
 *
 * "El cliente presiona 'Publicar reseña' con campos válidos → Muestre una vista
 * previa de la reseña con los botones 'Editar' y 'Publicar'."
 *
 * NO ESTÁ EN LA MAQUETACIÓN: PAN-RES-01 envía directo con un solo botón. El
 * criterio de aceptación la exige igual, y es de una fuente posterior, así que
 * gana (decisión del equipo, 2026-08-23).
 *
 * Se dibuja como hoja inferior sobre la pantalla y no como diálogo centrado
 * porque tiene que mostrar la reseña entera —estrellas, comentario y tags—, y
 * un comentario de 500 caracteres no entra en un diálogo.
 */
export function VistaPreviaDeResena({
  abierta,
  calificacion,
  comentario,
  tags,
  fotoUri,
  enviando,
  error,
  onEditar,
  onPublicar,
}: {
  abierta: boolean;
  calificacion: number;
  comentario: string;
  tags: readonly string[];
  fotoUri: string | null;
  enviando: boolean;
  error: string | null;
  onEditar: () => void;
  onPublicar: () => void;
}) {
  if (!abierta) return null;

  return (
    <View className="absolute inset-0 justify-end bg-black/40">
      <View className="rounded-t-lg bg-surface p-5">
        <Text className="text-h2 font-bold text-text-primary">
          {TEXTOS_RESENA.tituloVistaPrevia}
        </Text>

        <View className="mt-4 rounded-md border border-border p-3">
          <EstrellasFijas valor={calificacion} />

          {comentario === '' ? null : (
            <Text className="mt-2 text-body text-text-primary">
              {comentario}
            </Text>
          )}

          {/*
            La foto entra en la vista previa porque el criterio pide previsualizar
            "la reseña", y la foto adjunta es parte de lo que se va a publicar:
            revisar todo menos la imagen dejaría fuera justo lo que más cuesta
            corregir después, con la ventana de edición corriendo.
          */}
          {fotoUri === null ? null : (
            <Image
              accessibilityLabel={TEXTOS_RESENA.fotoDeLaResena}
              contentFit="cover"
              source={{ uri: fotoUri }}
              style={{
                width: '100%',
                height: 140,
                borderRadius: 8,
                marginTop: 10,
              }}
            />
          )}

          {tags.length === 0 ? null : (
            <Text className="mt-2 text-caption text-text-secondary">
              {tags.join(' · ')}
            </Text>
          )}
        </View>

        {/*
          EL ERROR SE MUESTRA ACA Y NO EN EL FORMULARIO. La vista previa tapa la
          pantalla entera, asi que un aviso dibujado debajo es un aviso que el
          usuario nunca lee: al rechazarse el comentario por el filtro de
          moderacion parecia que el boton no hacia nada.
        */}
        {error === null ? null : (
          <View className="mt-4">
            <Aviso mensaje={error} tono="error" />
          </View>
        )}

        <View className="mt-5 flex-row gap-3">
          <View className="flex-1">
            <Boton onPress={onEditar} variante="secundario">
              {MENSAJES_RESENA.vistaPreviaEditar}
            </Boton>
          </View>
          <View className="flex-1">
            <Boton cargando={enviando} onPress={onPublicar}>
              {MENSAJES_RESENA.vistaPreviaPublicar}
            </Boton>
          </View>
        </View>
      </View>
    </View>
  );
}

/** Las cinco estrellas en modo lectura, sin interacción. */
function EstrellasFijas({ valor }: { valor: number }) {
  return (
    <View className="flex-row">
      {[1, 2, 3, 4, 5].map((n) => {
        const Estrella = n <= valor ? IconoEstrellaRellena : IconoEstrella;
        return (
          <Estrella
            className={n <= valor ? 'text-warning' : 'text-text-disabled'}
            key={n}
            size={18}
          />
        );
      })}
    </View>
  );
}
