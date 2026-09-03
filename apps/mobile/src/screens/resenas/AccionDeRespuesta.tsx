import { useState } from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';
import { MENSAJES_RESENA, type ResenaPublica } from '@foodhub/shared';
import { AreaTexto } from '../../components/ui/AreaTexto';
import { Aviso } from '../../components/ui/Aviso';
import { Boton, BotonDeTexto } from '../../components/ui/Boton';
import { DialogoSevero } from '../../components/ui/DialogoSevero';
import { useEditarRespuesta, useResponderResena } from '../../hooks/useResenas';
import { mensajeDeError } from '../../lib/api';
import { TEXTOS_RESENA } from '../../lib/textos';

/**
 * Responder o editar la respuesta de una reseña — US-RES-05 (RF084).
 *
 * SE DIBUJA SOLO EN "MI REPUTACIÓN" y no en el perfil público: el criterio dice
 * "el cocinero ingresa a la sección 'Mi reputación' desde el menú". Por eso
 * llega como `pieDeLaTarjeta` desde `MisResenas` en lugar de vivir adentro de
 * `TarjetaDeResena`, que también se usa en el perfil que ve el cliente.
 *
 * TRES ESTADOS, como los otros formularios del módulo:
 *
 *   sin respuesta                  botón "Responder"
 *   con respuesta dentro de 24 h   botón "Editar respuesta"
 *   con respuesta ya congelada     ningún botón, solo la respuesta publicada
 */
export function AccionDeRespuesta({ resena }: { resena: ResenaPublica }) {
  const [abierto, setAbierto] = useState(false);

  if (resena.respuesta !== null && !resena.respuesta.puedeEditar) return null;

  return (
    <View className="mt-3 items-start">
      <BotonDeTexto
        onPress={() => {
          setAbierto(true);
        }}
      >
        {resena.respuesta === null
          ? MENSAJES_RESENA.responder
          : MENSAJES_RESENA.editarRespuesta}
      </BotonDeTexto>

      <FormularioDeRespuesta
        abierto={abierto}
        onCerrar={() => {
          setAbierto(false);
        }}
        resena={resena}
      />
    </View>
  );
}

/**
 * El formulario, con la confirmación que exige el criterio antes de publicar.
 *
 * LA CONFIRMACIÓN NO ES OPCIONAL: "antes de publicar la respuesta, el sistema
 * solicita confirmación" con un texto literal que además le avisa al cocinero
 * que la respuesta es pública y que el cliente va a recibir una notificación.
 * Es lo que evita que conteste en caliente sin pensar en quién lo va a leer.
 */
function FormularioDeRespuesta({
  resena,
  abierto,
  onCerrar,
}: {
  resena: ResenaPublica;
  abierto: boolean;
  onCerrar: () => void;
}) {
  const editando = resena.respuesta !== null;
  const [contenido, setContenido] = useState(resena.respuesta?.contenido ?? '');
  const [confirmando, setConfirmando] = useState(false);

  const crear = useResponderResena(resena.id);
  const editar = useEditarRespuesta(resena.respuesta?.id ?? '');
  const envio = editando ? editar : crear;

  const vacia = contenido.trim() === '';

  const publicar = () => {
    setConfirmando(false);
    envio.mutate(
      { contenido: contenido.trim() },
      {
        onSuccess: () => {
          onCerrar();
        },
      },
    );
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onCerrar}
      transparent={false}
      visible={abierto}
    >
      <View className="flex-1 bg-background">
        <CuerpoDelFormulario
          contenido={contenido}
          error={envio.isError ? mensajeDeError(envio.error) : null}
          enviando={envio.isPending}
          onCambiar={setContenido}
          onCerrar={onCerrar}
          onPedirConfirmacion={() => {
            setConfirmando(true);
          }}
          resena={resena}
          vacia={vacia}
        />

        <DialogoSevero
          abierto={confirmando}
          mensaje={MENSAJES_RESENA.confirmarRespuesta}
          onCancelar={() => {
            setConfirmando(false);
          }}
          onConfirmar={publicar}
          textoCancelar={MENSAJES_RESENA.confirmarRespuestaNo}
          textoConfirmar={MENSAJES_RESENA.confirmarRespuestaSi}
          titulo={TEXTOS_RESENA.tituloResponder}
        />
      </View>
    </Modal>
  );
}

/** La reseña a la que se responde, el campo de texto y los dos botones. */
function CuerpoDelFormulario({
  resena,
  contenido,
  vacia,
  enviando,
  error,
  onCambiar,
  onPedirConfirmacion,
  onCerrar,
}: {
  resena: ResenaPublica;
  contenido: string;
  vacia: boolean;
  enviando: boolean;
  error: string | null;
  onCambiar: (valor: string) => void;
  onPedirConfirmacion: () => void;
  onCerrar: () => void;
}) {
  return (
    <ScrollView
      contentContainerClassName="px-4 pt-6 pb-10"
      keyboardShouldPersistTaps="handled"
    >
      <Text className="text-h2 font-bold text-text-primary">
        {TEXTOS_RESENA.tituloResponder}
      </Text>

      <View className="mt-4 rounded-md border border-border bg-surface p-3">
        <Text className="text-caption text-text-secondary">
          {resena.autor.nombre}
        </Text>
        <Text className="mt-1 text-body text-text-primary">
          {resena.comentario ?? TEXTOS_RESENA.sinComentario}
        </Text>
      </View>

      <View className="mt-5">
        <AreaTexto
          etiqueta={TEXTOS_RESENA.etiquetaRespuesta}
          maximo={500}
          nombre="respuesta"
          onChange={onCambiar}
          placeholder={TEXTOS_RESENA.placeholderRespuesta}
          valor={contenido}
        />
      </View>

      {error === null ? null : (
        <View className="mt-4">
          <Aviso mensaje={error} tono="error" />
        </View>
      )}

      <View className="mt-6 gap-3">
        {/*
          El botón queda deshabilitado con el campo vacío o solo con espacios,
          como pide el criterio: "mantenga el botón deshabilitado hasta que se
          ingrese al menos un carácter útil".
        */}
        <Boton
          cargando={enviando}
          deshabilitado={vacia}
          onPress={onPedirConfirmacion}
        >
          {MENSAJES_RESENA.publicarRespuesta}
        </Boton>
        <Boton onPress={onCerrar} variante="secundario">
          {MENSAJES_RESENA.cancelarRespuesta}
        </Boton>
      </View>
    </ScrollView>
  );
}
