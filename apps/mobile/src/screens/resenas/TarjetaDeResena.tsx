import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { ResenaPublica } from '@foodhub/shared';
import {
  IconoEstrella,
  IconoEstrellaRellena,
  IconoUsuario,
} from '../../components/iconos';
import { formatearFecha } from '../../lib/formato';
import { TEXTOS_RESENA } from '../../lib/textos';

/**
 * Una reseña en el listado — US-RES-03, maquetación PAN-RES-02.
 *
 * "Foto y nombre del autor, nombre del plato reseñado, calificación en
 * estrellas, fecha, comentario, foto adjunta (si la hay) y tags."
 *
 * DOS IDENTIDADES PUEDEN VENIR SUSTITUIDAS, y las dos las resuelve el servidor:
 * el autor aparece como "Usuario eliminado" si dio de baja su cuenta, y el
 * plato como "[Plato no disponible]" si el cocinero lo retiró del catálogo. La
 * reseña sobrevive a las dos bajas y sigue contando para el promedio; lo único
 * que cambia es lo que se muestra.
 */
export function TarjetaDeResena({ resena }: { resena: ResenaPublica }) {
  return (
    <View className="rounded-md border border-border bg-surface p-3">
      <View className="flex-row items-center gap-2.5">
        <AvatarDelAutor
          fotoPerfilUrl={resena.autor.fotoPerfilUrl}
          nombre={resena.autor.nombre}
        />

        <View className="flex-1">
          <Text
            className="text-body font-bold text-text-primary"
            numberOfLines={1}
          >
            {resena.autor.nombre}
          </Text>

          <View className="flex-row items-center gap-1.5">
            <Estrellas valor={resena.calificacion} />
            <Text className="text-caption text-text-secondary">
              {`· ${formatearFecha(resena.fechaPublicacion)}`}
            </Text>
            {resena.editada ? (
              <Text className="text-caption text-text-disabled">
                {TEXTOS_RESENA.editada}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {resena.comentario === null ? null : (
        <Text className="mt-2.5 text-body text-text-primary">
          {resena.comentario}
        </Text>
      )}

      {resena.fotoUrl === null ? null : (
        <Image
          accessibilityLabel={TEXTOS_RESENA.fotoDeLaResena}
          contentFit="cover"
          source={{ uri: resena.fotoUrl }}
          style={{ width: '100%', height: 160, borderRadius: 8, marginTop: 10 }}
        />
      )}

      {resena.tags.length === 0 ? null : (
        <View className="mt-2.5 flex-row flex-wrap gap-1.5">
          {resena.tags.map((tag) => (
            <View className="rounded-full bg-background px-2.5 py-1" key={tag}>
              <Text className="text-caption text-text-secondary">{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* "Sobre: [plato]" al pie, como la maquetación. Con el plato dado de
          baja el servidor ya mandó "[Plato no disponible]". */}
      <View className="mt-3 border-t border-border pt-2">
        <Text className="text-caption text-text-secondary" numberOfLines={1}>
          {TEXTOS_RESENA.sobreElPlato(resena.nombrePlato)}
        </Text>
      </View>
    </View>
  );
}

function AvatarDelAutor({
  nombre,
  fotoPerfilUrl,
}: {
  nombre: string;
  fotoPerfilUrl: string | null;
}) {
  if (fotoPerfilUrl === null) {
    return (
      <View className="h-10 w-10 items-center justify-center rounded-full bg-background">
        <IconoUsuario className="text-text-secondary" size={18} />
      </View>
    );
  }

  return (
    <Image
      accessibilityLabel={nombre}
      contentFit="cover"
      source={{ uri: fotoPerfilUrl }}
      style={{ width: 40, height: 40, borderRadius: 20 }}
    />
  );
}

function Estrellas({ valor }: { valor: number }) {
  return (
    <View className="flex-row">
      {[1, 2, 3, 4, 5].map((n) => {
        const Estrella = n <= valor ? IconoEstrellaRellena : IconoEstrella;
        return (
          <Estrella
            className={n <= valor ? 'text-warning' : 'text-text-disabled'}
            key={n}
            size={12}
          />
        );
      })}
    </View>
  );
}
