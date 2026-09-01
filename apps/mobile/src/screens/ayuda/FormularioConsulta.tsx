import { View } from 'react-native';
import { BloqueDeCorreo } from '../../components/ayuda/BloqueDeCorreo';
import { ListaDeAdjuntos } from '../../components/ayuda/ListaDeAdjuntos';
import { AreaTexto } from '../../components/ui/AreaTexto';
import { Aviso } from '../../components/ui/Aviso';
import { Boton } from '../../components/ui/Boton';
import { CampoDesplegable } from '../../components/ui/CampoDesplegable';
import { CampoTexto } from '../../components/ui/CampoTexto';
import { PantallaConTeclado } from '../../components/ui/PantallaConTeclado';
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
export function FormularioConsulta({
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
        alAdjuntar={() => {
          void selector.acciones.agregar();
        }}
        alQuitar={selector.acciones.quitar}
      />
      {errorSubidaAdjuntos ? (
        <Aviso mensaje={errorSubidaAdjuntos.message} tono="error" />
      ) : null}
      {errorEnvio ? <Aviso mensaje={errorEnvio.message} tono="error" /> : null}
    </PantallaConTeclado>
  );
}

/**
 * Pie del formulario: boton "Enviar consulta" con su estado cargando.
 * Encapsulado para que `FormularioConsulta` quede por debajo del
 * limite de lineas.
 */
export function PieDeFormularioDeConsulta({
  enviando,
  onEnviar,
}: {
  enviando: boolean;
  onEnviar: () => void;
}) {
  return (
    <View className="border-t border-border bg-surface px-4 pb-2 pt-3">
      <Boton cargando={enviando} onPress={onEnviar}>
        {MENSAJES_AYUDA.consulta.botonEnviar}
      </Boton>
    </View>
  );
}
