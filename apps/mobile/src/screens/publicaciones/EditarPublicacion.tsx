import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MENSAJES_PUBLICACION, type PublicacionDetalle } from '@foodhub/shared';
import { SafeAreaView } from '../../components/SafeAreaView';
import { Aviso } from '../../components/ui/Aviso';
import { DialogoExito } from '../../components/ui/DialogoExito';
import { DialogoSevero } from '../../components/ui/DialogoSevero';
import { EncabezadoPantalla } from '../../components/ui/EncabezadoPantalla';
import { Esqueleto } from '../../components/ui/Esqueleto';
import { EstadoDeError } from '../../components/ui/EstadoDeError';
import type { FotoElegida } from '../../components/ui/SelectorDeFoto';
import {
  useEditarPublicacion,
  usePublicacionPropia,
} from '../../hooks/usePublicaciones';
import { mensajeDeError } from '../../lib/api';
import { TEXTOS_PUBLICACIONES } from '../../lib/textos';
import {
  FormularioDePublicacion,
  type DatosFormularioPublicacion,
  type ValoresPublicacion,
} from './FormularioDePublicacion';

/**
 * PAN-PUB-03 · Editar publicación — US-PUB-02.
 *
 * Mismo flujo de tres pasos que `NuevaPublicacion` (confirmar → mutar →
 * éxito) sobre el MISMO `FormularioDePublicacion`, en modo edición: precarga
 * con los datos actuales (`usePublicacionPropia`) y agrega lo que el alta no
 * necesita -el botón "Quitar imagen" y el diálogo de "Cancelar", que acá solo
 * aparece "con cambios pendientes" (criterio literal de esta historia,
 * distinto al de US-PUB-01, que lo muestra siempre)-.
 *
 * La carga de datos vive en este componente exterior y el formulario en sí en
 * `Formulario`, más abajo: separarlos evita manejar el caso "todavía no hay
 * `publicacion.data`" dentro del componente que ya tiene sus propios cuatro
 * diálogos y mutaciones (mismo criterio que `DetallePublicacion`).
 */
export function EditarPublicacion() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const publicacion = usePublicacionPropia(id);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <EncabezadoPantalla titulo={TEXTOS_PUBLICACIONES.editarPublicacion} />

      {publicacion.isPending ? <EsqueletoFormulario /> : null}

      {publicacion.isError ? (
        <EstadoDeError
          mensaje={mensajeDeError(publicacion.error)}
          onReintentar={() => {
            void publicacion.refetch();
          }}
        />
      ) : null}

      {publicacion.data ? <Formulario publicacion={publicacion.data} /> : null}
    </SafeAreaView>
  );
}

function EsqueletoFormulario() {
  return (
    <View className="px-4 pt-4">
      <Esqueleto className="h-14 rounded-sm" />
      <Esqueleto className="mt-4 h-32 rounded-sm" />
      <Esqueleto className="mt-4 h-14 rounded-sm" />
      <Esqueleto className="mt-4 h-14 rounded-sm" />
    </View>
  );
}

/** Traduce el detalle cargado a los valores iniciales del formulario compartido. */
function valoresDe(publicacion: PublicacionDetalle): ValoresPublicacion {
  return {
    nombre: publicacion.nombre,
    descripcion: publicacion.descripcion,
    precio: publicacion.precio,
    categoriaId: publicacion.categoria.id,
    tiempoEstimadoPreparacion:
      publicacion.tiempoEstimadoPreparacion === null
        ? ''
        : String(publicacion.tiempoEstimadoPreparacion),
  };
}

/**
 * La imagen actual, mostrada como si fuera una `FotoElegida` recién elegida.
 *
 * `mimeType` y `tamano` son valores de relleno que NUNCA se usan para subir
 * nada: `fotoTocada` (más abajo) arranca en `false` y solo se prende cuando
 * el cocinero realmente toca la imagen -la reemplaza o la quita-, momento en
 * el que `foto` pasa a ser una elección nueva y real del selector (con su
 * propio `mimeType`/`tamano`) o `null`. Mientras `fotoTocada` sea `false`,
 * estos dos campos no participan de ningún cálculo (ver `useEditarPublicacion`).
 */
function fotoActualDe(publicacion: PublicacionDetalle): FotoElegida | null {
  if (!publicacion.imagenUrl) return null;
  return { uri: publicacion.imagenUrl, mimeType: 'image/jpeg', tamano: 0 };
}

function Formulario({ publicacion }: { publicacion: PublicacionDetalle }) {
  const [foto, setFoto] = useState<FotoElegida | null>(() =>
    fotoActualDe(publicacion),
  );
  const [fotoTocada, setFotoTocada] = useState(false);
  const [datosAConfirmar, setDatosAConfirmar] =
    useState<DatosFormularioPublicacion | null>(null);
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const editar = useEditarPublicacion();

  const volver = () => {
    router.replace({
      pathname: '/publicaciones/[id]/index',
      params: { id: publicacion.id },
    });
  };

  const confirmarEdicion = () => {
    if (!datosAConfirmar) return;
    editar.mutate(
      { id: publicacion.id, datos: datosAConfirmar, foto, fotoTocada },
      {
        onSuccess: () => {
          setDatosAConfirmar(null);
          setGuardado(true);
        },
        onError: () => {
          setDatosAConfirmar(null);
        },
      },
    );
  };

  return (
    <>
      {editar.isError ? (
        <Aviso
          className="mx-4 mt-3"
          mensaje={mensajeDeError(editar.error)}
          tono="error"
        />
      ) : null}

      <FormularioDePublicacion
        enviando={editar.isPending}
        foto={foto}
        fotoTocada={fotoTocada}
        onCancelar={(hayCambios) => {
          if (hayCambios) setConfirmandoCancelar(true);
          else volver();
        }}
        onEnviar={setDatosAConfirmar}
        onFoto={(nuevaFoto) => {
          setFoto(nuevaFoto);
          setFotoTocada(true);
        }}
        onQuitarImagen={() => {
          setFoto(null);
          setFotoTocada(true);
        }}
        textoBoton={TEXTOS_PUBLICACIONES.guardarCambios}
        valoresIniciales={valoresDe(publicacion)}
      />

      <Dialogos
        confirmandoCancelar={confirmandoCancelar}
        editando={datosAConfirmar !== null}
        guardado={guardado}
        onCancelarConfirmar={volver}
        onCancelarVolver={() => {
          setConfirmandoCancelar(false);
        }}
        onExitoCerrar={volver}
        onGuardarCancelar={() => {
          setDatosAConfirmar(null);
        }}
        onGuardarConfirmar={confirmarEdicion}
        procesando={editar.isPending}
      />
    </>
  );
}

/**
 * Los tres diálogos de la edición, agrupados para que `Formulario` no supere
 * el límite de líneas por función: confirmar los cambios, confirmar el
 * descarte al cancelar (con cambios pendientes) y el aviso de éxito.
 */
function Dialogos({
  editando,
  procesando,
  onGuardarConfirmar,
  onGuardarCancelar,
  confirmandoCancelar,
  onCancelarConfirmar,
  onCancelarVolver,
  guardado,
  onExitoCerrar,
}: {
  editando: boolean;
  procesando: boolean;
  onGuardarConfirmar: () => void;
  onGuardarCancelar: () => void;
  confirmandoCancelar: boolean;
  onCancelarConfirmar: () => void;
  onCancelarVolver: () => void;
  guardado: boolean;
  onExitoCerrar: () => void;
}) {
  return (
    <>
      <DialogoSevero
        abierto={editando}
        onCancelar={onGuardarCancelar}
        onConfirmar={onGuardarConfirmar}
        procesando={procesando}
        textoCancelar={MENSAJES_PUBLICACION.confirmarEdicionBotonCancelar}
        textoConfirmar={MENSAJES_PUBLICACION.confirmarEdicionBotonConfirmar}
        titulo={MENSAJES_PUBLICACION.confirmarEdicionTitulo}
      />

      {/* Sin `mensaje`: el criterio de aceptación de "Cancelar" en US-PUB-02
          define una única línea de texto sin encabezado propio, igual
          criterio que el diálogo homónimo de `NuevaPublicacion`. */}
      <DialogoSevero
        abierto={confirmandoCancelar}
        onCancelar={onCancelarVolver}
        onConfirmar={onCancelarConfirmar}
        textoCancelar={MENSAJES_PUBLICACION.cancelarEdicionBotonCancelar}
        textoConfirmar={MENSAJES_PUBLICACION.cancelarEdicionBotonConfirmar}
        titulo={MENSAJES_PUBLICACION.cancelarEdicionMensaje}
      />

      <DialogoExito
        abierto={guardado}
        mensaje={MENSAJES_PUBLICACION.cambiosGuardados}
        onCerrar={onExitoCerrar}
        textoBoton={TEXTOS_PUBLICACIONES.aceptar}
      />
    </>
  );
}
