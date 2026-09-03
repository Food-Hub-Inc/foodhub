import { useState } from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';
import {
  MENSAJES_RESENA,
  MOTIVOS_REPORTE,
  type MotivoReporte,
} from '@foodhub/shared';
import { AreaTexto } from '../../components/ui/AreaTexto';
import { Aviso } from '../../components/ui/Aviso';
import { Boton } from '../../components/ui/Boton';
import { Casilla } from '../../components/ui/Casilla';
import { DialogoExito } from '../../components/ui/DialogoExito';
import { MensajeDeCampo } from '../../components/ui/MensajeDeCampo';
import { useReportarResena } from '../../hooks/useResenas';
import { mensajeDeError } from '../../lib/api';
import { TEXTOS_RESENA } from '../../lib/textos';

/**
 * Formulario de reporte de una reseña — US-RES-06 (RF085).
 *
 * "Motivo del reporte (multi-selección) — obligatorio al menos uno, y Detalle
 * adicional (máximo 500 caracteres) — opcional y obligatorio si se selecciona
 * 'Otro'."
 *
 * VA EN UN MODAL Y NO EN UNA PANTALLA PROPIA. Se abre desde el menú contextual
 * de una reseña que está a la vista, y navegar a otra pantalla haría perder el
 * lugar del listado —que puede llevar tres páginas cargadas— para volver justo
 * ahí un momento después.
 */

/**
 * Estado y envio del reporte, separados del marcado.
 *
 * `pideDetalle` es la regla cruzada del criterio: con "Otro" elegido el detalle
 * pasa de opcional a obligatorio, y eso cambia tanto la etiqueta del campo como
 * si el boton esta habilitado.
 */
function useReporte(resenaId: string) {
  const [motivos, setMotivos] = useState<MotivoReporte[]>([]);
  const [detalle, setDetalle] = useState('');
  const [intentoSinMotivo, setIntentoSinMotivo] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const envio = useReportarResena(resenaId);
  const pideDetalle = motivos.includes('Otro');
  const faltaDetalle = pideDetalle && detalle.trim() === '';

  return {
    motivos,
    setMotivos,
    detalle,
    setDetalle,
    enviado,
    setEnviado,
    pideDetalle,
    faltaDetalle,
    enviando: envio.isPending,
    error: envio.isError ? mensajeDeError(envio.error) : null,
    mostrarFaltaMotivo: intentoSinMotivo && motivos.length === 0,
    enviar: () => {
      if (motivos.length === 0) {
        setIntentoSinMotivo(true);
        return;
      }
      if (faltaDetalle) return;

      envio.mutate(
        {
          motivos,
          ...(detalle.trim() === ''
            ? {}
            : { detalleAdicional: detalle.trim() }),
        },
        {
          onSuccess: () => {
            setEnviado(true);
          },
        },
      );
    },
  };
}

export function FormularioDeReporte({
  resenaId,
  abierto,
  onCerrar,
}: {
  resenaId: string;
  abierto: boolean;
  onCerrar: () => void;
}) {
  const reporte = useReporte(resenaId);

  return (
    <Modal
      animationType="slide"
      onRequestClose={onCerrar}
      transparent={false}
      visible={abierto}
    >
      <View className="flex-1 bg-background">
        <CuerpoDelReporte onCerrar={onCerrar} reporte={reporte} />

        <DialogoExito
          abierto={reporte.enviado}
          mensaje={MENSAJES_RESENA.reporteEnviado}
          onCerrar={() => {
            reporte.setEnviado(false);
            onCerrar();
          }}
          textoBoton={TEXTOS_RESENA.cerrarExito}
        />
      </View>
    </Modal>
  );
}

/** Los dos campos del criterio y los dos botones. */
function CuerpoDelReporte({
  reporte,
  onCerrar,
}: {
  reporte: ReturnType<typeof useReporte>;
  onCerrar: () => void;
}) {
  return (
    <ScrollView
      contentContainerClassName="px-4 pt-6 pb-10"
      keyboardShouldPersistTaps="handled"
    >
      <Text className="text-h2 font-bold text-text-primary">
        {MENSAJES_RESENA.reportarResena}
      </Text>
      <Text className="mb-4 mt-1 text-caption text-text-secondary">
        {TEXTOS_RESENA.ayudaReporte}
      </Text>

      <MotivosDelReporte
        motivos={reporte.motivos}
        onCambiar={reporte.setMotivos}
      />

      <View className="mt-1">
        <MensajeDeCampo
          idCampo="motivos"
          mensaje={
            reporte.mostrarFaltaMotivo
              ? MENSAJES_RESENA.reporteSinMotivo
              : undefined
          }
        />
      </View>

      <View className="mt-5">
        <AreaTexto
          etiqueta={
            reporte.pideDetalle
              ? TEXTOS_RESENA.detalleObligatorio
              : TEXTOS_RESENA.detalleOpcional
          }
          maximo={500}
          nombre="detalle"
          onChange={reporte.setDetalle}
          placeholder={TEXTOS_RESENA.placeholderDetalleReporte}
          valor={reporte.detalle}
        />
      </View>

      {reporte.error === null ? null : (
        <View className="mt-4">
          <Aviso mensaje={reporte.error} tono="error" />
        </View>
      )}

      <View className="mt-6 gap-3">
        <Boton
          cargando={reporte.enviando}
          deshabilitado={reporte.faltaDetalle}
          onPress={reporte.enviar}
        >
          {MENSAJES_RESENA.enviarReporte}
        </Boton>
        <Boton onPress={onCerrar} variante="secundario">
          {MENSAJES_RESENA.cancelarRespuesta}
        </Boton>
      </View>
    </ScrollView>
  );
}

/** Las seis casillas del criterio, multi-selección. */
function MotivosDelReporte({
  motivos,
  onCambiar,
}: {
  motivos: MotivoReporte[];
  onCambiar: (motivos: MotivoReporte[]) => void;
}) {
  return (
    <View className="gap-2">
      {MOTIVOS_REPORTE.map((motivo) => (
        <Casilla
          etiquetaAccesible={motivo}
          key={motivo}
          marcada={motivos.includes(motivo)}
          nombre={`motivo-${motivo}`}
          onChange={(marcada) => {
            onCambiar(
              marcada
                ? [...motivos, motivo]
                : motivos.filter((m) => m !== motivo),
            );
          }}
        >
          <Text className="text-body text-text-primary">{motivo}</Text>
        </Casilla>
      ))}
    </View>
  );
}
