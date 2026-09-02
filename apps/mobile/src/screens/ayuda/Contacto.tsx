import { useCallback, useState } from 'react';
import { MENSAJES_AYUDA, type EtiquetaTipoConsulta } from '@foodhub/shared';
import { DialogosConsulta } from '../../components/ayuda/DialogosConsulta';
import { SafeAreaView } from '../../components/SafeAreaView';
import { EncabezadoPantalla } from '../../components/ui/EncabezadoPantalla';
import { useBorradorConFormulario } from '../../hooks/useBorradorConFormulario';
import { useBorradorDeConsulta } from '../../hooks/useBorradorDeConsulta';
import { useEnvioDeConsultaInterno } from '../../hooks/useEnvioDeConsultaInterno';
import { useSelectorDeAdjuntos } from '../../hooks/useSelectorDeAdjuntos';
import { useSesion } from '../../hooks/useSesion';
import { useMapaDeTiposDeConsulta } from '../../hooks/useSoporte';
import { useTiposDeConsulta } from '../../hooks/useTiposDeConsulta';
import {
  FormularioConsulta,
  PieDeFormularioDeConsulta,
} from './FormularioConsulta';

export type DialogoConsulta = null | 'confirmar' | 'exito' | 'error';

/**
 * PAN-AYU-03 · Formulario "Contactar al soporte" (US-AYU-03).
 */
export function Contacto() {
  const sesion = useSesion((estado) => estado.sesion);
  const usuarioId = sesion?.user.id ?? null;
  const correo = sesion?.user.email ?? '';

  return (
    <SafeAreaView className="flex-1 bg-background">
      <EncabezadoPantalla
        destinoAlternativo="/ayuda"
        titulo={MENSAJES_AYUDA.consulta.titulo}
      />
      <FlujoDeEnvio correo={correo} usuarioId={usuarioId} />
    </SafeAreaView>
  );
}

function FlujoDeEnvio({
  correo,
  usuarioId,
}: {
  correo: string;
  usuarioId: string | null;
}) {
  const tipos = useTiposDeConsulta();
  const mapaTipos = useMapaDeTiposDeConsulta(tipos.data);
  const selector = useSelectorDeAdjuntos();
  const borrador = useBorradorDeConsulta(usuarioId);

  const [dialogo, setDialogo] = useState<DialogoConsulta>(null);

  const envio = useEnvioDeConsultaInterno({
    selector,
    alConfirmar: () => {
      setDialogo('confirmar');
    },
    alExito: () => {
      setDialogo('exito');
      void borrador.descartar();
      selector.acciones.limpiar();
    },
    alError: () => {
      setDialogo('error');
    },
  });

  const { tipoConsultaId, asunto, descripcion } = envio.valores;

  useBorradorConFormulario({
    borrador,
    tipoConsultaId: tipoConsultaId || null,
    asunto,
    descripcion,
    fijarTipoConsultaId: envio.fijarTipoConsultaId,
    fijarAsunto: envio.fijarAsunto,
    fijarDescripcion: envio.fijarDescripcion,
  });

  const limpiarFormulario = useCallback(() => {
    envio.reiniciar();
    selector.acciones.limpiar();
    void borrador.descartar();
  }, [envio, selector, borrador]);

  const opcionesTipoConsulta = useOpcionesDeTipoConsulta(mapaTipos);

  return (
    <VistaConsulta
      correo={correo}
      dialogo={dialogo}
      enviarConsulta={envio.enviarConsulta}
      errorEnvio={envio.errorEnvio}
      errorSubidaAdjuntos={envio.errorSubidaAdjuntos}
      enviar={envio.enviando}
      formulario={envio.formulario}
      intentarEnviar={envio.intentarEnviar}
      opcionesTipoConsulta={opcionesTipoConsulta}
      selector={selector}
      cerrarDialogo={() => {
        setDialogo(null);
      }}
      fijarAsunto={envio.fijarAsunto}
      fijarDescripcion={envio.fijarDescripcion}
      fijarTipoConsultaId={envio.fijarTipoConsultaId}
      limpiar={limpiarFormulario}
      reintentar={() => {
        setDialogo(null);
        envio.intentarEnviar();
      }}
    />
  );
}

/**
 * Construye la lista de opciones del desplegable de tipo de consulta.
 * Vive en un hook aparte para achicar `FlujoDeEnvio` y porque la
 * logica de filtrado (la API puede traer tipos extra) es reutilizable
 * en otras pantallas.
 */
function useOpcionesDeTipoConsulta(
  mapaTipos: Record<
    EtiquetaTipoConsulta,
    { id: string | null; nombre: string }
  >,
): readonly { valor: string; etiqueta: EtiquetaTipoConsulta }[] {
  return Object.entries(mapaTipos)
    .filter(([, valor]) => valor.id !== null)
    .map(([etiqueta, valor]) => ({
      valor: valor.id ?? '',
      etiqueta: etiqueta as EtiquetaTipoConsulta,
    }));
}

function VistaConsulta({
  correo,
  dialogo,
  enviarConsulta,
  errorEnvio,
  errorSubidaAdjuntos,
  enviar,
  formulario,
  intentarEnviar,
  opcionesTipoConsulta,
  selector,
  cerrarDialogo,
  fijarAsunto,
  fijarDescripcion,
  fijarTipoConsultaId,
  limpiar,
  reintentar,
}: {
  correo: string;
  dialogo: DialogoConsulta;
  enviarConsulta: () => void;
  errorEnvio: Error | null;
  errorSubidaAdjuntos: Error | null;
  enviar: boolean;
  formulario: ReturnType<typeof useEnvioDeConsultaInterno>['formulario'];
  intentarEnviar: () => void;
  opcionesTipoConsulta: readonly {
    valor: string;
    etiqueta: EtiquetaTipoConsulta;
  }[];
  selector: ReturnType<typeof useSelectorDeAdjuntos>;
  cerrarDialogo: () => void;
  fijarAsunto: (v: string) => void;
  fijarDescripcion: (v: string) => void;
  fijarTipoConsultaId: (v: string) => void;
  limpiar: () => void;
  reintentar: () => void;
}) {
  return (
    <>
      <FormularioConsulta
        asunto={formulario.valores.asunto}
        correo={correo}
        descripcion={formulario.valores.descripcion}
        errorSubida={selector.estado.error}
        errorSubidaAdjuntos={errorSubidaAdjuntos}
        errorEnvio={errorEnvio}
        formulario={formulario}
        opcionesTipoConsulta={opcionesTipoConsulta}
        selector={selector}
        tipoConsultaId={formulario.valores.tipoConsultaId}
        onAsuntoChange={fijarAsunto}
        onDescripcionChange={fijarDescripcion}
        onTipoConsultaChange={fijarTipoConsultaId}
      />

      <PieDeFormularioDeConsulta
        enviando={enviar}
        onEnviar={intentarEnviar}
        onLimpiar={limpiar}
      />

      <DialogosConsulta
        cerrar={cerrarDialogo}
        correo={correo}
        dialogo={dialogo}
        enviarConsulta={enviarConsulta}
        enviando={enviar}
        onConfirmarError={reintentar}
      />
    </>
  );
}
