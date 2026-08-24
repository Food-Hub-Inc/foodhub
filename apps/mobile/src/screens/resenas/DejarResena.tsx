import { useState, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  MENSAJES_RESENA,
  TAGS_RESENA_PLATO,
  type EstadoResenaPublicacion,
  type PublicacionPublica,
  type ResenaPublica,
  type TagResenaPlato,
} from '@foodhub/shared';
import { SafeAreaView } from '../../components/SafeAreaView';
import { AreaTexto } from '../../components/ui/AreaTexto';
import { Aviso } from '../../components/ui/Aviso';
import { Boton } from '../../components/ui/Boton';
import { DialogoExito } from '../../components/ui/DialogoExito';
import { EncabezadoPantalla } from '../../components/ui/EncabezadoPantalla';
import { Esqueleto } from '../../components/ui/Esqueleto';
import { EstadoDeError } from '../../components/ui/EstadoDeError';
import { MensajeDeCampo } from '../../components/ui/MensajeDeCampo';
import { usePublicacionPublica } from '../../hooks/useExploracion';
import {
  useCrearResena,
  useEditarResena,
  useEstadoDeResenas,
  useResena,
} from '../../hooks/useResenas';
import { mensajeDeError } from '../../lib/api';
import { TEXTOS_RESENA } from '../../lib/textos';
import { SelectorDeEstrellas } from './SelectorDeEstrellas';
import { SelectorDeTags } from './SelectorDeTags';
import { VistaPreviaDeResena } from './VistaPreviaDeResena';

/**
 * PAN-RES-01 · Dejar reseña — US-RES-01 (RF080).
 *
 * UNA PANTALLA POR PLATO, no por pedido (decisión del equipo, 2026-08-23). La
 * maquetación de la Etapa 5 dibuja "Calificar pedido" con el número de pedido
 * en la cabecera, pero es anterior al cambio de modelo del 18/08: hoy el objeto
 * reseñado es la publicación. Por eso la cabecera muestra EL PLATO y la
 * pantalla se abre desde cada ítem del pedido.
 *
 * TRES MODOS EN UNA SOLA PANTALLA, y no tres archivos:
 *
 *   crear        no hay reseña previa
 *   editar       hay reseña y la ventana de 48 h sigue abierta
 *   solo lectura hay reseña y la ventana se cerró ("Ver mi reseña")
 *
 * Son el mismo formulario con el mismo layout; separarlos duplicaría el cuerpo
 * entero para cambiar un título y deshabilitar los campos.
 *
 * EL SERVIDOR DECIDE EL MODO: `useEstadoDeResenas` resuelve si se puede reseñar
 * o editar, porque eso depende de dos plazos y del historial de pedidos del
 * cliente con ese plato, y nada de eso está en la pantalla.
 */
export function DejarResena({ publicacionId }: { publicacionId: string }) {
  const plato = usePublicacionPublica(publicacionId);
  const estado = useEstadoDeResenas([publicacionId]);
  const estadoDelPlato = estado.data?.[0];
  const previa = useResena(estadoDelPlato?.resenaId ?? null);

  const error = plato.error ?? estado.error;
  if (error) {
    return (
      <Marco titulo={TEXTOS_RESENA.tituloDejar}>
        <EstadoDeError
          mensaje={mensajeDeError(error)}
          onReintentar={() => {
            void plato.refetch();
            void estado.refetch();
          }}
        />
      </Marco>
    );
  }

  /**
   * Se espera también a la reseña previa cuando la hay: sin ella el formulario
   * se dibujaría vacío y se llenaría un instante después, y el usuario
   * alcanzaría a ver sus propias estrellas aparecer solas.
   */
  const listo =
    plato.data !== undefined &&
    estadoDelPlato !== undefined &&
    (estadoDelPlato.resenaId === null || previa.data !== undefined);

  if (!listo) {
    return (
      <Marco titulo={TEXTOS_RESENA.tituloDejar}>
        <CargandoFormulario />
      </Marco>
    );
  }

  return (
    <Formulario
      estado={estadoDelPlato}
      plato={plato.data}
      previa={previa.data ?? null}
    />
  );
}

/** Marco común: cabecera con "volver" y el cuerpo debajo. */
function Marco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <EncabezadoPantalla
        destinoAlternativo="/(cliente)/pedidos"
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

const MAXIMO_COMENTARIO = 500;

/**
 * Estado editable del formulario, separado del dibujo.
 *
 * Vive en un hook y no dentro del componente para que `Formulario` quede dentro
 * del límite de complejidad que fija el proyecto: sin esto son tres `useState`
 * más el armado del payload compitiendo con el JSX en la misma función.
 */
function useCamposDeResena(previa: ResenaPublica | null) {
  const [calificacion, setCalificacion] = useState<number | null>(
    previa?.calificacion ?? null,
  );
  const [comentario, setComentario] = useState(previa?.comentario ?? '');
  const [tags, setTags] = useState<TagResenaPlato[]>(
    (previa?.tags ?? []).filter((t): t is TagResenaPlato =>
      (TAGS_RESENA_PLATO as readonly string[]).includes(t),
    ),
  );

  return {
    calificacion,
    setCalificacion,
    comentario,
    setComentario,
    tags,
    setTags,
    /** Lo que viaja a la API. La foto queda en `null`: falta definir el bucket. */
    aPayload: () => ({
      calificacion: calificacion ?? 0,
      ...(comentario.trim() === '' ? {} : { comentario: comentario.trim() }),
      tags,
      fotoUrl: null,
    }),
  };
}

function Formulario({
  plato,
  estado,
  previa,
}: {
  plato: PublicacionPublica;
  estado: EstadoResenaPublicacion;
  previa: ResenaPublica | null;
}) {
  const soloLectura = estado.resenaId !== null && !estado.puedeEditar;
  const editando = estado.resenaId !== null && estado.puedeEditar;

  const campos = useCamposDeResena(previa);
  const [intentoSinEstrellas, setIntentoSinEstrellas] = useState(false);
  const [enVistaPrevia, setEnVistaPrevia] = useState(false);
  const [publicada, setPublicada] = useState(false);

  const crear = useCrearResena();
  const editar = useEditarResena(estado.resenaId ?? '');
  const envio = editando ? editar : crear;
  const faltaCalificacion = campos.calificacion === null;

  const publicar = () => {
    if (faltaCalificacion) return;
    const alExito = {
      onSuccess: () => {
        setPublicada(true);
      },
    };

    if (editando) editar.mutate(campos.aPayload(), alExito);
    else
      crear.mutate({ ...campos.aPayload(), publicacionId: plato.id }, alExito);
  };

  return (
    <Marco titulo={tituloSegunModo({ soloLectura, editando })}>
      <ScrollView
        contentContainerClassName="px-4 pt-4 pb-10"
        keyboardShouldPersistTaps="handled"
      >
        <CabeceraDelPlato plato={plato} />

        <AvisoEnRecuadro
          mensaje={soloLectura ? TEXTOS_RESENA.avisoSoloLectura : null}
          tono="informativo"
        />

        <CamposDeResena
          campos={campos}
          mostrarErrorDeEstrellas={intentoSinEstrellas && faltaCalificacion}
          onTocarEstrella={() => {
            setIntentoSinEstrellas(false);
          }}
          soloLectura={soloLectura}
        />

        <AvisoEnRecuadro
          mensaje={envio.isError ? mensajeDeError(envio.error) : null}
          tono="error"
        />

        {soloLectura ? null : (
          <PieDelFormulario
            deshabilitado={faltaCalificacion}
            onPublicar={() => {
              if (faltaCalificacion) setIntentoSinEstrellas(true);
              else setEnVistaPrevia(true);
            }}
          />
        )}
      </ScrollView>

      <SuperposicionesDeEnvio
        campos={campos}
        enVistaPrevia={enVistaPrevia}
        enviando={envio.isPending}
        onCerrarExito={() => {
          setPublicada(false);
          if (router.canGoBack()) router.back();
        }}
        onEditar={() => {
          setEnVistaPrevia(false);
        }}
        onPublicar={publicar}
        publicada={publicada}
      />
    </Marco>
  );
}

/**
 * Lo que se dibuja ENCIMA del formulario: la vista previa y la confirmación.
 *
 * Van juntas y fuera de `Formulario` porque son la misma secuencia —revisar,
 * publicar, confirmar— y porque el cuerpo del formulario ya está en el límite
 * de líneas que fija el proyecto.
 */
function SuperposicionesDeEnvio({
  campos,
  enVistaPrevia,
  publicada,
  enviando,
  onEditar,
  onPublicar,
  onCerrarExito,
}: {
  campos: ReturnType<typeof useCamposDeResena>;
  enVistaPrevia: boolean;
  publicada: boolean;
  enviando: boolean;
  onEditar: () => void;
  onPublicar: () => void;
  onCerrarExito: () => void;
}) {
  return (
    <>
      {/*
        US-RES-01: "Muestre una vista previa de la reseña con los botones
        'Editar' y 'Publicar'". No está en la maquetación, que envía directo,
        pero el criterio de aceptación la exige.
      */}
      <VistaPreviaDeResena
        abierta={enVistaPrevia}
        calificacion={campos.calificacion ?? 0}
        comentario={campos.comentario.trim()}
        enviando={enviando}
        onEditar={onEditar}
        onPublicar={onPublicar}
        tags={campos.tags}
      />

      <DialogoExito
        abierto={publicada}
        mensaje={MENSAJES_RESENA.resenaPublicada}
        onCerrar={onCerrarExito}
        textoBoton={TEXTOS_RESENA.cerrarExito}
      />
    </>
  );
}

function tituloSegunModo({
  soloLectura,
  editando,
}: {
  soloLectura: boolean;
  editando: boolean;
}): string {
  if (soloLectura) return TEXTOS_RESENA.tituloVer;
  if (editando) return TEXTOS_RESENA.tituloEditar;
  return TEXTOS_RESENA.tituloDejar;
}

/**
 * Aviso con su separación, o nada si no hay mensaje.
 *
 * Existe para que el cuerpo del formulario no repita el mismo `{x ? (<View
 * className="mt-4">…</View>) : null}` dos veces: el aviso de solo lectura y el
 * error de envío ocupan el mismo lugar y se dibujan igual.
 */
function AvisoEnRecuadro({
  mensaje,
  tono,
}: {
  mensaje: string | null;
  tono: 'informativo' | 'error';
}) {
  if (mensaje === null) return null;

  return (
    <View className="mt-4">
      <Aviso mensaje={mensaje} tono={tono} />
    </View>
  );
}

/** Botón de publicar más el aviso de que la reseña va a ser pública. */
function PieDelFormulario({
  deshabilitado,
  onPublicar,
}: {
  deshabilitado: boolean;
  onPublicar: () => void;
}) {
  return (
    <>
      <View className="mt-6">
        <Boton deshabilitado={deshabilitado} onPress={onPublicar}>
          {MENSAJES_RESENA.publicarResena}
        </Boton>
      </View>
      <Text className="mt-3 text-caption text-text-secondary">
        {TEXTOS_RESENA.avisoPublica}
      </Text>
    </>
  );
}

/** Los tres campos del formulario: estrellas, comentario y tags. */
function CamposDeResena({
  campos,
  soloLectura,
  mostrarErrorDeEstrellas,
  onTocarEstrella,
}: {
  campos: ReturnType<typeof useCamposDeResena>;
  soloLectura: boolean;
  mostrarErrorDeEstrellas: boolean;
  onTocarEstrella: () => void;
}) {
  return (
    <>
      <Text className="mt-6 text-center text-body font-semibold text-text-primary">
        {TEXTOS_RESENA.etiquetaCalificacion}
      </Text>

      <View className="mt-3">
        <SelectorDeEstrellas
          deshabilitado={soloLectura}
          onCambiar={(valor) => {
            campos.setCalificacion(valor);
            onTocarEstrella();
          }}
          valor={campos.calificacion}
        />
      </View>

      {/*
        US-RES-01 pide el mensaje "debajo del componente de estrellas", y solo
        cuando el usuario intenta publicar sin elegir: mostrarlo de entrada
        sería retarlo por no haber empezado.
      */}
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
          etiqueta={TEXTOS_RESENA.etiquetaComentario}
          maximo={MAXIMO_COMENTARIO}
          nombre="comentario"
          onChange={campos.setComentario}
          placeholder={TEXTOS_RESENA.placeholderComentario}
          valor={campos.comentario}
        />
      </View>

      <Text className="mb-2 mt-6 text-label font-semibold text-text-primary">
        {TEXTOS_RESENA.etiquetaTags}
      </Text>
      <SelectorDeTags
        deshabilitado={soloLectura}
        onCambiar={campos.setTags}
        opciones={TAGS_RESENA_PLATO}
        seleccionados={campos.tags}
      />
    </>
  );
}

/**
 * Cabecera con el plato reseñado y su cocinero.
 *
 * La maquetación pone acá el pedido ("Pedido #00146 · 1 plato"); se reemplaza
 * por el plato porque es lo que se está calificando. El cocinero se conserva:
 * es el contexto que le permite al cliente reconocer de quién era la comida.
 */
function CabeceraDelPlato({ plato }: { plato: PublicacionPublica }) {
  return (
    <View className="flex-row items-center gap-3 rounded-md border border-border bg-surface p-3">
      {plato.imagenUrl ? (
        <Image
          accessibilityLabel={plato.nombre}
          contentFit="cover"
          source={{ uri: plato.imagenUrl }}
          style={{ width: 56, height: 56, borderRadius: 8 }}
        />
      ) : null}

      <View className="flex-1">
        <Text
          className="text-body font-bold text-text-primary"
          numberOfLines={1}
        >
          {plato.nombre}
        </Text>
        <Text className="text-caption text-text-secondary" numberOfLines={1}>
          {`${plato.cocinero.nombre} ${plato.cocinero.apellido}`}
        </Text>
      </View>
    </View>
  );
}
