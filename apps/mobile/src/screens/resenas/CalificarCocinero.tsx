import { useState, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  MENSAJES_RESENA,
  TAGS_CALIFICACION_COCINERO,
  type CalificacionACocinero,
  type EstadoCalificacionCocinero,
  type TagCalificacionCocinero,
} from '@foodhub/shared';
import { SafeAreaView } from '../../components/SafeAreaView';
import { IconoCocinero } from '../../components/iconos';
import { AreaTexto } from '../../components/ui/AreaTexto';
import { Aviso } from '../../components/ui/Aviso';
import { Boton } from '../../components/ui/Boton';
import { DialogoExito } from '../../components/ui/DialogoExito';
import { EncabezadoPantalla } from '../../components/ui/EncabezadoPantalla';
import { Esqueleto } from '../../components/ui/Esqueleto';
import { EstadoDeError } from '../../components/ui/EstadoDeError';
import { MensajeDeCampo } from '../../components/ui/MensajeDeCampo';
import {
  useCalificacionDeCocinero,
  useCalificarCocinero,
  useEditarCalificacionDeCocinero,
  useEstadoDeCalificacion,
} from '../../hooks/useResenas';
import { mensajeDeError } from '../../lib/api';
import { formatearFecha } from '../../lib/formato';
import { TEXTOS_RESENA } from '../../lib/textos';
import { SelectorDeEstrellas } from './SelectorDeEstrellas';
import { SelectorDeTags } from './SelectorDeTags';

/**
 * PAN-RES-03 · Calificar al cocinero — US-RES-07 (RF087).
 *
 * NO ES LA RESEÑA DEL PLATO Y NO HAY QUE CONFUNDIRLAS. La reseña valora el
 * PRODUCTO y se deja una por plato; esto valora el SERVICIO —puntualidad,
 * comunicación, atención— y se deja una por pedido, sin importar cuántos platos
 * lo integren. Por eso el encabezado del selector pregunta por la atención y el
 * pie lo aclara: si la pantalla no lo dijera, el cliente volvería a calificar
 * la comida.
 *
 * TRES MODOS EN UNA SOLA PANTALLA, igual que PAN-RES-01:
 *
 *   crear        el pedido está completado y no tiene calificación
 *   editar       hay calificación y la ventana de 48 h sigue abierta
 *   solo lectura hay calificación y la ventana se cerró
 *
 * LA VENTANA NO SE REABRE, a diferencia de la de la reseña del plato: esta
 * calificación refiere a la experiencia de un pedido determinado, y un pedido
 * posterior al mismo cocinero habilita una calificación nueva en lugar de
 * reabrir la vieja.
 *
 * LA MAQUETACIÓN DE PAN-RES-03 NO EXISTE TODAVÍA: la versión corregida del
 * módulo la lista como pendiente de definir. El layout replica el de PAN-RES-01
 * y queda por contrastar cuando la maquetación la incorpore.
 */
export function CalificarCocinero({
  pedidoId,
  nombre,
  fotoPerfilUrl,
  fechaPedido,
}: {
  pedidoId: string;
  nombre: string | null;
  fotoPerfilUrl: string | null;
  fechaPedido: string | null;
}) {
  const estado = useEstadoDeCalificacion(pedidoId);
  const previa = useCalificacionDeCocinero(estado.data?.calificacionId ?? null);

  if (estado.isError) {
    return (
      <Marco titulo={TEXTOS_RESENA.tituloCalificarCocinero}>
        <EstadoDeError
          mensaje={mensajeDeError(estado.error)}
          onReintentar={() => {
            void estado.refetch();
          }}
        />
      </Marco>
    );
  }

  /**
   * Se espera también a la calificación previa cuando la hay: sin ella el
   * formulario se dibujaría vacío y se llenaría un instante después, y el
   * cliente alcanzaría a ver sus propias estrellas aparecer solas.
   */
  const listo =
    estado.data !== undefined &&
    (estado.data.calificacionId === null || previa.data !== undefined);

  if (!listo) {
    return (
      <Marco titulo={TEXTOS_RESENA.tituloCalificarCocinero}>
        <CargandoFormulario />
      </Marco>
    );
  }

  return (
    <Formulario
      estado={estado.data}
      fechaPedido={fechaPedido}
      fotoPerfilUrl={fotoPerfilUrl}
      nombre={nombre}
      previa={previa.data ?? null}
    />
  );
}

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

/** US-RES-07 admite 500, a diferencia de los 300 de la calificación al cliente. */
const MAXIMO_COMENTARIO = 500;

function useCamposDeCalificacion(previa: CalificacionACocinero | null) {
  const [calificacion, setCalificacion] = useState<number | null>(
    previa?.calificacion ?? null,
  );
  const [comentario, setComentario] = useState(previa?.comentario ?? '');
  const [tags, setTags] = useState<TagCalificacionCocinero[]>(
    (previa?.tags ?? []).filter((t): t is TagCalificacionCocinero =>
      (TAGS_CALIFICACION_COCINERO as readonly string[]).includes(t),
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

/**
 * Alta o edición según el modo, y el disparo con su validación previa.
 *
 * LAS DOS MUTACIONES SE INSTANCIAN SIEMPRE —`useMutation` no dispara nada por
 * existir— porque los hooks no pueden vivir detrás de un `if`.
 *
 * El disparo vive acá y no en el componente por el límite de líneas por función
 * que fija ESLint, el mismo motivo por el que ya existe `useCamposDeCalificacion`.
 */
function useEnvio(entrada: {
  estado: EstadoCalificacionCocinero;
  campos: ReturnType<typeof useCamposDeCalificacion>;
  onSinEstrellas: () => void;
  onPublicada: () => void;
}) {
  const { estado, campos } = entrada;
  const crear = useCalificarCocinero(estado.pedidoId);
  const editar = useEditarCalificacionDeCocinero(estado.calificacionId ?? '');
  const mutacion = estado.calificacionId === null ? crear : editar;

  return {
    enviando: mutacion.isPending,
    error: mutacion.isError ? mensajeDeError(mutacion.error) : null,
    publicar: () => {
      if (campos.calificacion === null) {
        entrada.onSinEstrellas();
        return;
      }
      mutacion.mutate(campos.aPayload(), { onSuccess: entrada.onPublicada });
    },
  };
}

function Formulario({
  estado,
  nombre,
  fotoPerfilUrl,
  fechaPedido,
  previa,
}: {
  estado: EstadoCalificacionCocinero;
  nombre: string | null;
  fotoPerfilUrl: string | null;
  fechaPedido: string | null;
  previa: CalificacionACocinero | null;
}) {
  const soloLectura = estado.calificacionId !== null && !estado.puedeEditar;
  const editando = estado.calificacionId !== null && estado.puedeEditar;

  const campos = useCamposDeCalificacion(previa);
  const [intentoSinEstrellas, setIntentoSinEstrellas] = useState(false);
  const [publicada, setPublicada] = useState(false);

  const envio = useEnvio({
    estado,
    campos,
    onSinEstrellas: () => {
      setIntentoSinEstrellas(true);
    },
    onPublicada: () => {
      setPublicada(true);
    },
  });

  return (
    <Marco titulo={tituloSegunModo({ soloLectura, editando })}>
      <ScrollView
        contentContainerClassName="px-4 pt-4 pb-10"
        keyboardShouldPersistTaps="handled"
      >
        <CabeceraDelCocinero
          fechaPedido={fechaPedido}
          fotoPerfilUrl={fotoPerfilUrl}
          nombre={nombre}
        />

        <CamposDeCalificacion
          campos={campos}
          mostrarErrorDeEstrellas={
            intentoSinEstrellas && campos.calificacion === null
          }
          onTocarEstrella={() => {
            setIntentoSinEstrellas(false);
          }}
          soloLectura={soloLectura}
        />

        <AvisoEnRecuadro
          mensaje={
            soloLectura
              ? TEXTOS_RESENA.avisoCalificacionCongelada
              : TEXTOS_RESENA.avisoCalificacionDeServicio
          }
          tono="informativo"
        />

        <AvisoEnRecuadro mensaje={envio.error} tono="error" />

        {soloLectura ? null : (
          <PieDelFormulario
            editando={editando}
            enviando={envio.enviando}
            faltaCalificacion={campos.calificacion === null}
            onPublicar={envio.publicar}
          />
        )}
      </ScrollView>

      <ConfirmacionDePublicacion
        abierto={publicada}
        onCerrar={() => {
          setPublicada(false);
        }}
      />
    </Marco>
  );
}

/**
 * Publicar y "Ahora no".
 *
 * "AHORA NO" ES UN CRITERIO, no una comodidad: US-RES-07 pide que el cliente
 * pueda "omitir la calificación presionando 'Ahora no'" y que el acceso siga
 * disponible desde el detalle del pedido mientras siga completado. Por eso
 * vuelve atrás sin registrar nada, en lugar de descartar el flujo.
 */
function PieDelFormulario({
  editando,
  faltaCalificacion,
  enviando,
  onPublicar,
}: {
  editando: boolean;
  faltaCalificacion: boolean;
  enviando: boolean;
  onPublicar: () => void;
}) {
  return (
    <View className="mt-6 gap-3">
      <Boton
        cargando={enviando}
        deshabilitado={faltaCalificacion}
        onPress={onPublicar}
      >
        {editando
          ? MENSAJES_RESENA.editarMiCalificacion
          : MENSAJES_RESENA.publicarCalificacion}
      </Boton>

      <Boton
        onPress={() => {
          if (router.canGoBack()) router.back();
        }}
        variante="secundario"
      >
        {MENSAJES_RESENA.ahoraNo}
      </Boton>
    </View>
  );
}

/**
 * "¡Calificación publicada con éxito!" y la vuelta al pedido.
 *
 * Vuelve atrás al cerrarse y no se queda en la pantalla: el flujo de US-RES-07
 * termina acá, y dejar el formulario abierto invitaría a publicar de nuevo algo
 * que ya se publicó.
 */
function ConfirmacionDePublicacion({
  abierto,
  onCerrar,
}: {
  abierto: boolean;
  onCerrar: () => void;
}) {
  return (
    <DialogoExito
      abierto={abierto}
      mensaje={MENSAJES_RESENA.calificacionPublicada}
      onCerrar={() => {
        onCerrar();
        if (router.canGoBack()) router.back();
      }}
      textoBoton={TEXTOS_RESENA.cerrarExito}
    />
  );
}

/**
 * Aviso con su separación, o nada si no hay mensaje. Mismo componente que en
 * `DejarResena`: los dos formularios repiten el patrón de un recuadro que a
 * veces está y a veces no, y con el `{x ? … : null}` inline el cuerpo del
 * formulario se pasa del límite de líneas que fija ESLint.
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

function tituloSegunModo({
  soloLectura,
  editando,
}: {
  soloLectura: boolean;
  editando: boolean;
}): string {
  if (soloLectura) return TEXTOS_RESENA.tituloVerMiCalificacion;
  if (editando) return TEXTOS_RESENA.tituloEditarMiCalificacion;
  return TEXTOS_RESENA.tituloCalificarCocinero;
}

/** Los tres campos: estrellas, comentario y tags de servicio. */
function CamposDeCalificacion({
  campos,
  soloLectura,
  mostrarErrorDeEstrellas,
  onTocarEstrella,
}: {
  campos: ReturnType<typeof useCamposDeCalificacion>;
  soloLectura: boolean;
  mostrarErrorDeEstrellas: boolean;
  onTocarEstrella: () => void;
}) {
  return (
    <>
      <Text className="mt-6 text-center text-body font-semibold text-text-primary">
        {TEXTOS_RESENA.etiquetaCalificacionCocinero}
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
        opciones={TAGS_CALIFICACION_COCINERO}
        seleccionados={campos.tags}
      />
    </>
  );
}

/**
 * A quién se está calificando y por cuál pedido.
 *
 * LA FECHA DEL PEDIDO NO ES DECORACIÓN. US-RES-07 la pide explícitamente "de
 * modo que quede claro que la calificación refiere a la experiencia de ese
 * pedido y no a los platos que lo integraron": sin ella, un cliente que le
 * compró tres veces al mismo cocinero no sabe cuál está calificando.
 *
 * El nombre y la foto llegan por parámetro desde el pedido, igual que en
 * PAN-RES-02. Si faltan, la pantalla igual funciona.
 */
function CabeceraDelCocinero({
  nombre,
  fotoPerfilUrl,
  fechaPedido,
}: {
  nombre: string | null;
  fotoPerfilUrl: string | null;
  fechaPedido: string | null;
}) {
  if (nombre === null) return null;

  return (
    <View className="flex-row items-center gap-3 rounded-md border border-border bg-surface p-3">
      {fotoPerfilUrl === null ? (
        <View className="h-12 w-12 items-center justify-center rounded-full bg-background">
          <IconoCocinero className="text-text-secondary" size={22} />
        </View>
      ) : (
        <Image
          accessibilityLabel={nombre}
          contentFit="cover"
          source={{ uri: fotoPerfilUrl }}
          style={{ width: 48, height: 48, borderRadius: 24 }}
        />
      )}

      <View className="flex-1">
        <Text
          className="text-body font-bold text-text-primary"
          numberOfLines={1}
        >
          {nombre}
        </Text>
        {fechaPedido === null ? null : (
          <Text className="text-caption text-text-secondary">
            {TEXTOS_RESENA.pedidoDelDia(formatearFecha(fechaPedido))}
          </Text>
        )}
      </View>
    </View>
  );
}
