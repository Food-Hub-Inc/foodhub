import { useState, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  MENSAJES_RESENA,
  TAGS_CALIFICACION_CLIENTE,
  type MiCalificacionCliente,
  type TagCalificacionCliente,
} from '@foodhub/shared';
import { SafeAreaView } from '../../components/SafeAreaView';
import { IconoUsuario } from '../../components/iconos';
import { AreaTexto } from '../../components/ui/AreaTexto';
import { Aviso } from '../../components/ui/Aviso';
import { Boton } from '../../components/ui/Boton';
import { DialogoExito } from '../../components/ui/DialogoExito';
import { EncabezadoPantalla } from '../../components/ui/EncabezadoPantalla';
import { Esqueleto } from '../../components/ui/Esqueleto';
import { EstadoDeError } from '../../components/ui/EstadoDeError';
import { MensajeDeCampo } from '../../components/ui/MensajeDeCampo';
import {
  useCalificarCliente,
  useMiCalificacionDeCliente,
} from '../../hooks/useResenas';
import { mensajeDeError } from '../../lib/api';
import { TEXTOS_RESENA } from '../../lib/textos';
import { SelectorDeEstrellas } from './SelectorDeEstrellas';
import { SelectorDeTags } from './SelectorDeTags';

/**
 * PAN-RES-02 · Calificar cliente — US-RES-02 (RF081).
 *
 * ES LA DIRECCION PRIVADA DE LA REPUTACION. Lo que se escribe acá NO lo ve el
 * cliente calificado ni ningun otro cliente: solo el cocinero autor, en su
 * historial, y los demas cocineros cuando reciben un pedido de esa persona. El
 * aviso de privacidad se muestra MIENTRAS se escribe y no al confirmar, porque
 * quien opina tiene que saber quien lo va a leer antes de elegir las palabras.
 *
 * UNA CALIFICACION POR CLIENTE, no por pedido. Si el cocinero ya lo calificó, la
 * pantalla abre en modo edicion con el formulario precargado: la valoracion
 * refleja el estado ACTUAL de la relacion comercial, no una foto de una venta
 * puntual.
 *
 * NO HAY MAQUETACION DE ESTA PANTALLA. El inventario de la Etapa 5 usa el codigo
 * PAN-RES-02 para "Mis resenas" del cocinero, que es otra cosa; para calificar
 * al cliente no hay nada dibujado. El layout replica el de PAN-RES-01 —misma
 * cabecera, mismas estrellas, mismo orden— y queda pendiente contrastarlo
 * cuando la maquetacion lo incorpore.
 */
export function CalificarCliente({
  clienteId,
  nombre,
  fotoPerfilUrl,
}: {
  clienteId: string;
  nombre: string | null;
  fotoPerfilUrl: string | null;
}) {
  const previa = useMiCalificacionDeCliente(clienteId);

  if (previa.isError) {
    return (
      <Marco titulo={TEXTOS_RESENA.tituloCalificar}>
        <EstadoDeError
          mensaje={mensajeDeError(previa.error)}
          onReintentar={() => {
            void previa.refetch();
          }}
        />
      </Marco>
    );
  }

  // `null` es una respuesta valida -todavia no lo califico-, asi que la espera
  // se resuelve con `isPending` y no con la ausencia de datos.
  if (previa.isPending) {
    return (
      <Marco titulo={TEXTOS_RESENA.tituloCalificar}>
        <CargandoFormulario />
      </Marco>
    );
  }

  return (
    <Formulario
      clienteId={clienteId}
      fotoPerfilUrl={fotoPerfilUrl}
      nombre={nombre}
      previa={previa.data}
    />
  );
}

function Marco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <EncabezadoPantalla
        destinoAlternativo="/(cocinero)/pedidos"
        titulo={titulo}
      />
      {children}
    </SafeAreaView>
  );
}

function CargandoFormulario() {
  return (
    <View className="px-4 pt-4">
      <Esqueleto className="h-20 rounded-md" />
      <Esqueleto className="mt-6 h-24 rounded-md" />
      <Esqueleto className="mt-6 h-32 rounded-md" />
    </View>
  );
}

/** RF081 acota el comentario del cocinero a 300, no a los 500 de la reseña. */
const MAXIMO_COMENTARIO = 300;

function useCamposDeCalificacion(previa: MiCalificacionCliente | null) {
  const [calificacion, setCalificacion] = useState<number | null>(
    previa?.calificacion ?? null,
  );
  const [comentario, setComentario] = useState(previa?.comentario ?? '');
  const [tags, setTags] = useState<TagCalificacionCliente[]>(
    (previa?.tags ?? []).filter((t): t is TagCalificacionCliente =>
      (TAGS_CALIFICACION_CLIENTE as readonly string[]).includes(t),
    ),
  );

  return {
    calificacion,
    setCalificacion,
    comentario,
    setComentario,
    tags,
    setTags,
    aPayload: () => ({
      calificacion: calificacion ?? 0,
      ...(comentario.trim() === '' ? {} : { comentario: comentario.trim() }),
      tags,
    }),
  };
}

function Formulario({
  clienteId,
  nombre,
  fotoPerfilUrl,
  previa,
}: {
  clienteId: string;
  nombre: string | null;
  fotoPerfilUrl: string | null;
  previa: MiCalificacionCliente | null;
}) {
  const editando = previa !== null;
  const campos = useCamposDeCalificacion(previa);
  const [intentoSinEstrellas, setIntentoSinEstrellas] = useState(false);
  const [enviada, setEnviada] = useState(false);

  const envio = useCalificarCliente(clienteId);
  const faltaCalificacion = campos.calificacion === null;

  return (
    <Marco
      titulo={
        editando
          ? TEXTOS_RESENA.tituloEditarCalificacion
          : TEXTOS_RESENA.tituloCalificar
      }
    >
      <ScrollView
        contentContainerClassName="px-4 pt-4 pb-10"
        keyboardShouldPersistTaps="handled"
      >
        <CabeceraDelCliente fotoPerfilUrl={fotoPerfilUrl} nombre={nombre} />

        <View className="mt-4">
          <Aviso mensaje={TEXTOS_RESENA.avisoPrivacidad} tono="informativo" />
        </View>

        <CamposDeCalificacion
          campos={campos}
          mostrarErrorDeEstrellas={intentoSinEstrellas && faltaCalificacion}
          onTocarEstrella={() => {
            setIntentoSinEstrellas(false);
          }}
        />

        {envio.isError ? (
          <View className="mt-4">
            <Aviso mensaje={mensajeDeError(envio.error)} tono="error" />
          </View>
        ) : null}

        <View className="mt-6">
          <Boton
            cargando={envio.isPending}
            deshabilitado={faltaCalificacion}
            onPress={() => {
              if (faltaCalificacion) {
                setIntentoSinEstrellas(true);
                return;
              }
              envio.mutate(campos.aPayload(), {
                onSuccess: () => {
                  setEnviada(true);
                },
              });
            }}
          >
            {editando
              ? MENSAJES_RESENA.editarCalificacion
              : MENSAJES_RESENA.enviarCalificacion}
          </Boton>
        </View>
      </ScrollView>

      <DialogoExito
        abierto={enviada}
        mensaje={MENSAJES_RESENA.calificacionEnviada}
        onCerrar={() => {
          setEnviada(false);
          if (router.canGoBack()) router.back();
        }}
        textoBoton={TEXTOS_RESENA.cerrarExito}
      />
    </Marco>
  );
}

/** Los tres campos: estrellas, comentario y tags. */
function CamposDeCalificacion({
  campos,
  mostrarErrorDeEstrellas,
  onTocarEstrella,
}: {
  campos: ReturnType<typeof useCamposDeCalificacion>;
  mostrarErrorDeEstrellas: boolean;
  onTocarEstrella: () => void;
}) {
  return (
    <>
      <Text className="mt-6 text-center text-body font-semibold text-text-primary">
        {TEXTOS_RESENA.etiquetaCalificacionCliente}
      </Text>

      <View className="mt-3">
        <SelectorDeEstrellas
          onCambiar={(valor) => {
            campos.setCalificacion(valor);
            onTocarEstrella();
          }}
          valor={campos.calificacion}
        />
      </View>

      <View className="items-center">
        <MensajeDeCampo
          idCampo="calificacion"
          mensaje={
            mostrarErrorDeEstrellas
              ? MENSAJES_RESENA.calificacionRequerida
              : undefined
          }
        />
      </View>

      <View className="mt-6">
        <AreaTexto
          etiqueta={TEXTOS_RESENA.etiquetaComentarioCliente}
          maximo={MAXIMO_COMENTARIO}
          nombre="comentario"
          onChange={campos.setComentario}
          placeholder={TEXTOS_RESENA.placeholderComentarioCliente}
          valor={campos.comentario}
        />
      </View>

      <Text className="mb-2 mt-6 text-label font-semibold text-text-primary">
        {TEXTOS_RESENA.etiquetaTags}
      </Text>
      <SelectorDeTags
        onCambiar={campos.setTags}
        opciones={TAGS_CALIFICACION_CLIENTE}
        seleccionados={campos.tags}
      />
    </>
  );
}

/**
 * A quién se está calificando.
 *
 * El nombre y la foto llegan por parámetro desde el pedido y no de una consulta
 * propia: no existe endpoint para que un cocinero pida los datos de un cliente
 * —`GET /usuarios/:id` es exclusivo del administrador— y agregarlo para dibujar
 * un encabezado sería crear una superficie nueva sobre datos de terceros. Si
 * faltan, la pantalla igual funciona: lo que se califica es el `clienteId`.
 */
function CabeceraDelCliente({
  nombre,
  fotoPerfilUrl,
}: {
  nombre: string | null;
  fotoPerfilUrl: string | null;
}) {
  if (nombre === null) return null;

  return (
    <View className="flex-row items-center gap-3 rounded-md border border-border bg-surface p-3">
      {fotoPerfilUrl === null ? (
        <View className="h-12 w-12 items-center justify-center rounded-full bg-background">
          <IconoUsuario className="text-text-secondary" size={22} />
        </View>
      ) : (
        <Image
          accessibilityLabel={nombre}
          contentFit="cover"
          source={{ uri: fotoPerfilUrl }}
          style={{ width: 48, height: 48, borderRadius: 24 }}
        />
      )}

      <Text
        className="flex-1 text-body font-bold text-text-primary"
        numberOfLines={1}
      >
        {nombre}
      </Text>
    </View>
  );
}
