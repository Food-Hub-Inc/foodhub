import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { ResenaPublica } from '@foodhub/shared';
import { DialogoSevero } from '../../components/ui/DialogoSevero';
import { useEliminarMiResena } from '../../hooks/useResenas';
import {
  IconoEstrella,
  IconoEstrellaRellena,
  IconoUsuario,
} from '../../components/iconos';
import { formatearFecha } from '../../lib/formato';
import { TEXTOS_RESENA } from '../../lib/textos';
import { FormularioDeReporte } from './FormularioDeReporte';
import {
  BotonesDeReaccion,
  AccionesDeResena,
  RespuestaPublicada,
} from './PiezasSociales';

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
export function TarjetaDeResena({
  resena,
  onAbrirFoto,
  pieDeLaTarjeta,
}: {
  resena: ResenaPublica;
  /**
   * US-RES-03: tocar la foto abre la galería del cocinero. Es opcional porque
   * la tarjeta también se dibuja donde no hay galería que abrir.
   */
  onAbrirFoto?: (fotoUrl: string) => void;
  /**
   * Lo que cada vista agrega al pie. "Mis reseñas" mete acá el botón de
   * responder de US-RES-05; el perfil público no mete nada. Va como `slot` y no
   * como una bandera `esMiPerfil` para que la tarjeta no tenga que conocer las
   * vistas que la usan.
   */
  pieDeLaTarjeta?: React.ReactNode;
}) {
  const acciones = useAccionesDeResena(resena.id);

  return (
    <View className="rounded-md border border-border bg-surface p-3">
      <CabeceraDeLaResena acciones={acciones} resena={resena} />

      {resena.comentario === null ? null : (
        <Text className="mt-2.5 text-body text-text-primary">
          {resena.comentario}
        </Text>
      )}

      {resena.fotoUrl === null ? null : (
        <FotoDeLaResena
          fotoUrl={resena.fotoUrl}
          onAbrir={
            onAbrirFoto === undefined
              ? undefined
              : () => {
                  onAbrirFoto(resena.fotoUrl ?? '');
                }
          }
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
          baja el servidor ya mandó "[Plato no disponible]".

          Solo en las reseñas DE UN PLATO: `plato` viaja en `null` cuando lo
          reseñado es un cocinero o un cliente, y ahí no hay nada que nombrar. */}
      {resena.plato === null ? null : (
        <View className="mt-3 border-t border-border pt-2">
          <Text className="text-caption text-text-secondary" numberOfLines={1}>
            {TEXTOS_RESENA.sobreElPlato(resena.plato.nombre)}
          </Text>
        </View>
      )}

      <PieSocial
        acciones={acciones}
        pieDeLaTarjeta={pieDeLaTarjeta}
        resena={resena}
      />
    </View>
  );
}

/** Autor, estrellas, fecha y el menu contextual de US-RES-06. */
function CabeceraDeLaResena({
  resena,
  acciones,
}: {
  resena: ResenaPublica;
  acciones: ReturnType<typeof useAccionesDeResena>;
}) {
  return (
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

      {resena.social === null ? null : (
        <AccionesDeResena
          onEliminar={acciones.pedirEliminar}
          onReportar={acciones.abrirReporte}
          resena={resena}
          social={resena.social}
        />
      )}
    </View>
  );
}

/**
 * Lo que las tres historias sociales suman al pie de la tarjeta, mas las dos
 * superposiciones que abre el menu contextual.
 */
function PieSocial({
  resena,
  acciones,
  pieDeLaTarjeta,
}: {
  resena: ResenaPublica;
  acciones: ReturnType<typeof useAccionesDeResena>;
  pieDeLaTarjeta?: React.ReactNode;
}) {
  /**
   * US-RES-02: las reseñas a un cliente no llevan conversación pública. El
   * cliente no las ve, así que no hay reacciones, ni respuesta, ni reporte —y
   * tampoco el diálogo de baja, porque el autor las edita desde el detalle del
   * pedido y no desde acá—. `pieDeLaTarjeta` sí se conserva: es lo que cada
   * pantalla inyecta por su cuenta.
   */
  if (resena.social === null) return <>{pieDeLaTarjeta}</>;

  return (
    <>
      <BotonesDeReaccion resena={resena} social={resena.social} />

      {resena.social.respuesta === null ? null : (
        <RespuestaPublicada respuesta={resena.social.respuesta} />
      )}

      {pieDeLaTarjeta}

      <FormularioDeReporte
        abierto={acciones.reporteAbierto}
        onCerrar={acciones.cerrarReporte}
        resenaId={resena.id}
      />

      <DialogoSevero
        abierto={acciones.confirmandoBaja}
        mensaje={TEXTOS_RESENA.avisoBajaDeResena}
        onCancelar={acciones.cancelarEliminar}
        onConfirmar={acciones.eliminar}
        textoCancelar={TEXTOS_RESENA.cancelarBaja}
        textoConfirmar={TEXTOS_RESENA.confirmarBaja}
        titulo={TEXTOS_RESENA.tituloBajaDeResena}
      />
    </>
  );
}

/**
 * El menú contextual de US-RES-06 y sus dos consecuencias.
 *
 * Vive en un hook para que `TarjetaDeResena` no acumule cuatro `useState` más
 * la mutación encima del marcado, que ya la dejaría sobre el límite de líneas
 * por función que fija ESLint.
 */
function useAccionesDeResena(resenaId: string) {
  const [reporteAbierto, setReporteAbierto] = useState(false);
  const [confirmandoBaja, setConfirmandoBaja] = useState(false);
  const baja = useEliminarMiResena(resenaId);

  return {
    reporteAbierto,
    confirmandoBaja,
    abrirReporte: () => {
      setReporteAbierto(true);
    },
    cerrarReporte: () => {
      setReporteAbierto(false);
    },
    pedirEliminar: () => {
      setConfirmandoBaja(true);
    },
    cancelarEliminar: () => {
      setConfirmandoBaja(false);
    },
    /**
     * La baja se confirma antes de ejecutarse: es irreversible desde la app y
     * el criterio no ofrece deshacerla. `DialogoSevero` es el mismo componente
     * que ya usan las otras bajas del sistema.
     */
    eliminar: () => {
      setConfirmandoBaja(false);
      baja.mutate();
    },
  };
}

/**
 * La foto adjunta. Se vuelve tocable solo si hay galería adonde llevar: un
 * `Pressable` que no hace nada le promete al usuario algo que no va a pasar.
 */
function FotoDeLaResena({
  fotoUrl,
  onAbrir,
}: {
  fotoUrl: string;
  onAbrir?: () => void;
}) {
  const imagen = (
    <Image
      accessibilityLabel={TEXTOS_RESENA.fotoDeLaResena}
      contentFit="cover"
      source={{ uri: fotoUrl }}
      style={{ width: '100%', height: 160, borderRadius: 8, marginTop: 10 }}
    />
  );

  if (onAbrir === undefined) return imagen;

  return (
    <Pressable
      accessibilityLabel={TEXTOS_RESENA.fotoDeLaResena}
      accessibilityRole="imagebutton"
      onPress={onAbrir}
    >
      {imagen}
    </Pressable>
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
