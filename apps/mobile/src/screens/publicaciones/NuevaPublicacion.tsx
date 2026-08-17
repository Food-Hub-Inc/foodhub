import { useState } from 'react';
import { router } from 'expo-router';
import { MENSAJES_PUBLICACION } from '@foodhub/shared';
import { SafeAreaView } from '../../components/SafeAreaView';
import { Aviso } from '../../components/ui/Aviso';
import { DialogoExito } from '../../components/ui/DialogoExito';
import { DialogoSevero } from '../../components/ui/DialogoSevero';
import { EncabezadoPantalla } from '../../components/ui/EncabezadoPantalla';
import type { FotoElegida } from '../../components/ui/SelectorDeFoto';
import { useCrearPublicacion } from '../../hooks/usePublicaciones';
import { mensajeDeError } from '../../lib/api';
import { TEXTOS_PUBLICACIONES } from '../../lib/textos';
import {
  FormularioDePublicacion,
  type DatosFormularioPublicacion,
} from './FormularioDePublicacion';

/**
 * PAN-PUB-02 · Nueva publicación — US-PUB-01.
 *
 * Coordina el flujo completo del alta: el formulario en sí vive en
 * `FormularioDePublicacion` (compartido con la edición), y esta pantalla solo
 * agrega lo que es específico de CREAR un plato -los tres textos exactos del
 * criterio de aceptación, ninguno de los cuales coincide con los de
 * editar/eliminar- y la mutación que lo persiste.
 *
 * Al fallar la publicación se cierra el diálogo de confirmación y se muestra
 * el error arriba del formulario: con el diálogo abierto (un `Modal` a pantalla
 * completa) el aviso quedaría tapado y el cocinero no vería por qué falló.
 */
export function NuevaPublicacion() {
  const [foto, setFoto] = useState<FotoElegida | null>(null);
  const [datosAConfirmar, setDatosAConfirmar] =
    useState<DatosFormularioPublicacion | null>(null);
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false);
  const [creada, setCreada] = useState(false);
  const crear = useCrearPublicacion();

  const irAlListado = () => {
    router.replace('/(cocinero)/platos');
  };

  const confirmarPublicacion = () => {
    if (!datosAConfirmar) return;
    crear.mutate(
      { datos: datosAConfirmar, foto },
      {
        onSuccess: () => {
          setDatosAConfirmar(null);
          setCreada(true);
        },
        onError: () => {
          setDatosAConfirmar(null);
        },
      },
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <EncabezadoPantalla titulo={TEXTOS_PUBLICACIONES.nuevaPublicacion} />

      {crear.isError ? (
        <Aviso
          className="mx-4 mt-3"
          mensaje={mensajeDeError(crear.error)}
          tono="error"
        />
      ) : null}

      <FormularioDePublicacion
        enviando={crear.isPending}
        foto={foto}
        onCancelar={() => {
          setConfirmandoCancelar(true);
        }}
        onEnviar={setDatosAConfirmar}
        onFoto={setFoto}
        textoBoton={TEXTOS_PUBLICACIONES.publicar}
      />

      <Dialogos
        confirmandoCancelar={confirmandoCancelar}
        creada={creada}
        onCancelarConfirmar={irAlListado}
        onCancelarVolver={() => {
          setConfirmandoCancelar(false);
        }}
        onExitoCerrar={irAlListado}
        onPublicarCancelar={() => {
          setDatosAConfirmar(null);
        }}
        onPublicarConfirmar={confirmarPublicacion}
        procesando={crear.isPending}
        publicando={datosAConfirmar !== null}
      />
    </SafeAreaView>
  );
}

/**
 * Los tres diálogos del alta, agrupados para que `NuevaPublicacion` no supere
 * el límite de líneas por función: confirmar la publicación, confirmar el
 * descarte al cancelar y el aviso de éxito.
 */
function Dialogos({
  publicando,
  procesando,
  onPublicarConfirmar,
  onPublicarCancelar,
  confirmandoCancelar,
  onCancelarConfirmar,
  onCancelarVolver,
  creada,
  onExitoCerrar,
}: {
  publicando: boolean;
  procesando: boolean;
  onPublicarConfirmar: () => void;
  onPublicarCancelar: () => void;
  confirmandoCancelar: boolean;
  onCancelarConfirmar: () => void;
  onCancelarVolver: () => void;
  creada: boolean;
  onExitoCerrar: () => void;
}) {
  return (
    <>
      <DialogoSevero
        abierto={publicando}
        mensaje={MENSAJES_PUBLICACION.confirmarPublicarMensaje}
        onCancelar={onPublicarCancelar}
        onConfirmar={onPublicarConfirmar}
        procesando={procesando}
        textoCancelar={MENSAJES_PUBLICACION.confirmarPublicarBotonCancelar}
        textoConfirmar={MENSAJES_PUBLICACION.confirmarPublicarBotonConfirmar}
        titulo={MENSAJES_PUBLICACION.confirmarPublicarTitulo}
      />

      {/* Sin `mensaje`: el criterio de aceptación de "Cancelar" en US-PUB-01
          define una única línea de texto sin encabezado propio, así que esa
          línea se muestra como `titulo` (ver el comentario de `DialogoSevero`). */}
      <DialogoSevero
        abierto={confirmandoCancelar}
        onCancelar={onCancelarVolver}
        onConfirmar={onCancelarConfirmar}
        textoCancelar={MENSAJES_PUBLICACION.cancelarCreacionBotonCancelar}
        textoConfirmar={MENSAJES_PUBLICACION.cancelarCreacionBotonConfirmar}
        titulo={MENSAJES_PUBLICACION.cancelarCreacionMensaje}
      />

      <DialogoExito
        abierto={creada}
        mensaje={MENSAJES_PUBLICACION.publicacionCreada}
        onCerrar={onExitoCerrar}
        textoBoton={TEXTOS_PUBLICACIONES.aceptar}
      />
    </>
  );
}
