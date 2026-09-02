import { View } from 'react-native';
import { PantallaConTeclado } from '../../components/ui/PantallaConTeclado';
import { BloqueDeCorreo } from '../../components/ayuda/BloqueDeCorreo';
import { ListaDeAdjuntos } from '../../components/ayuda/ListaDeAdjuntos';
import { AreaTexto } from '../../components/ui/AreaTexto';
import { Aviso } from '../../components/ui/Aviso';
import { Boton, BotonDeTexto } from '../../components/ui/Boton';
import { CampoDesplegable } from '../../components/ui/CampoDesplegable';
import { CampoTexto } from '../../components/ui/CampoTexto';
import type { Formulario } from '../../hooks/useFormulario';
import type { ValoresConsulta } from '../../hooks/useEnvioDeConsultaInterno';
import type { useSelectorDeAdjuntos } from '../../hooks/useSelectorDeAdjuntos';
import {
  MENSAJES_AYUDA,
  type EtiquetaTipoConsulta,
  type EnviarConsultaInput,
} from '@foodhub/shared';
import { TEXTOS_AYUDA } from '../../lib/textos';

/**
 * Formulario visual de "Contactar al soporte" (US-AYU-03). Encapsula
 * la presentacion: el bloque de correo (solo lectura), el tipo de
 * consulta, el asunto, la descripcion y los adjuntos. La validacion
 * y la persistencia del borrador viven en el padre (`Contacto.tsx`);
 * este componente solo recibe los valores y emite cambios.
 */
export function FormularioConsulta(props: {
  correo: string;
  asunto: string;
  descripcion: string;
  tipoConsultaId: string;
  opcionesTipoConsulta: readonly {
    valor: string;
    etiqueta: EtiquetaTipoConsulta;
  }[];
  selector: ReturnType<typeof useSelectorDeAdjuntos>;
  formulario: Formulario<ValoresConsulta, EnviarConsultaInput>;
  errorSubida: string | undefined;
  errorSubidaAdjuntos: Error | null;
  errorEnvio: Error | null;
  onTipoConsultaChange: (valor: string) => void;
  onAsuntoChange: (valor: string) => void;
  onDescripcionChange: (valor: string) => void;
}) {
  return (
    <CuerpoFormularioConsulta
      asunto={props.asunto}
      correo={props.correo}
      descripcion={props.descripcion}
      errorEnvio={props.errorEnvio}
      errorSubida={props.errorSubida}
      errorSubidaAdjuntos={props.errorSubidaAdjuntos}
      formulario={props.formulario}
      onAsuntoChange={props.onAsuntoChange}
      onDescripcionChange={props.onDescripcionChange}
      onTipoConsultaChange={props.onTipoConsultaChange}
      opcionesTipoConsulta={props.opcionesTipoConsulta}
      selector={props.selector}
      tipoConsultaId={props.tipoConsultaId}
    />
  );
}

/**
 * Cuerpo del formulario: bloque de correo + campos + lista de adjuntos +
 * avisos de error. Encapsulado en un sub-componente para que
 * `FormularioConsulta` (que solo delega) quede por debajo del limite
 * de 80 lineas de ESLint.
 */
function CuerpoFormularioConsulta({
  correo,
  asunto,
  descripcion,
  tipoConsultaId,
  opcionesTipoConsulta,
  selector,
  formulario,
  errorSubida,
  errorSubidaAdjuntos,
  errorEnvio,
  onTipoConsultaChange,
  onAsuntoChange,
  onDescripcionChange,
}: {
  correo: string;
  asunto: string;
  descripcion: string;
  tipoConsultaId: string;
  opcionesTipoConsulta: readonly {
    valor: string;
    etiqueta: EtiquetaTipoConsulta;
  }[];
  selector: ReturnType<typeof useSelectorDeAdjuntos>;
  formulario: Formulario<ValoresConsulta, EnviarConsultaInput>;
  errorSubida: string | undefined;
  errorSubidaAdjuntos: Error | null;
  errorEnvio: Error | null;
  onTipoConsultaChange: (valor: string) => void;
  onAsuntoChange: (valor: string) => void;
  onDescripcionChange: (valor: string) => void;
}) {
  return (
    <PantallaConTeclado contentContainerClassName="px-4 pt-4 pb-10 gap-4">
      <BloqueDeCorreo correo={correo} />
      <CampoDesplegable
        etiqueta={MENSAJES_AYUDA.consulta.etiquetaTipoConsulta}
        error={formulario.mensajeDe('tipoConsultaId')}
        nombre="tipo-consulta"
        obligatorio
        onCambiar={onTipoConsultaChange}
        opciones={opcionesTipoConsulta}
        placeholder={TEXTOS_AYUDA.consulta.placeholderTipoConsulta}
        valor={tipoConsultaId}
      />
      <CampoTexto
        etiqueta={MENSAJES_AYUDA.consulta.etiquetaAsunto}
        error={formulario.mensajeDe('asunto')}
        maxLength={100}
        nombre="asunto-consulta"
        obligatorio
        onChange={onAsuntoChange}
        placeholder={TEXTOS_AYUDA.consulta.placeholderAsunto}
        valor={asunto}
      />
      <AreaTexto
        etiqueta={MENSAJES_AYUDA.consulta.etiquetaDescripcion}
        error={formulario.mensajeDe('descripcion')}
        maximo={1500}
        nombre="descripcion-consulta"
        obligatorio
        onChange={onDescripcionChange}
        placeholder={TEXTOS_AYUDA.consulta.placeholderDescripcion}
        valor={descripcion}
      />
      <ListaDeAdjuntos
        archivos={selector.estado.archivos}
        error={errorSubida}
        habilitado={selector.estado.habilitado}
        alAdjuntar={() => void selector.acciones.agregar()}
        alQuitar={selector.acciones.quitar}
      />
      <AvisosDeFormulario
        errorSubidaAdjuntos={errorSubidaAdjuntos}
        errorEnvio={errorEnvio}
      />
    </PantallaConTeclado>
  );
}

/**
 * Avisos de error del envio.
 */
function AvisosDeFormulario({
  errorSubidaAdjuntos,
  errorEnvio,
}: {
  errorSubidaAdjuntos: Error | null;
  errorEnvio: Error | null;
}) {
  return (
    <>
      {errorSubidaAdjuntos ? (
        <Aviso mensaje={errorSubidaAdjuntos.message} tono="error" />
      ) : null}
      {errorEnvio ? <Aviso mensaje={errorEnvio.message} tono="error" /> : null}
    </>
  );
}

/**
 * Pie del formulario: boton "Enviar consulta" con su estado cargando y,
 * debajo, una accion secundaria para vaciar todos los campos y los
 * adjuntos (empezar de cero).
 */
export function PieDeFormularioDeConsulta({
  enviando,
  onEnviar,
  onLimpiar,
}: {
  enviando: boolean;
  onEnviar: () => void;
  onLimpiar: () => void;
}) {
  return (
    <View className="border-t border-border bg-surface px-4 pb-2 pt-3">
      <Boton cargando={enviando} onPress={onEnviar}>
        {MENSAJES_AYUDA.consulta.botonEnviar}
      </Boton>
      <View className="items-center">
        <BotonDeTexto className="text-text-secondary" onPress={onLimpiar}>
          {TEXTOS_AYUDA.consulta.limpiar}
        </BotonDeTexto>
      </View>
    </View>
  );
}
