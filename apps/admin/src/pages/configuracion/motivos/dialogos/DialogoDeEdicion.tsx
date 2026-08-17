import { useState, type FormEvent } from 'react';
import {
  editarMotivoCancelacionSchema,
  MENSAJES_CONFIGURACION,
  type EditarMotivoCancelacionInput,
  type MotivoCancelacionListado,
  type TipoUsuarioCancelacion,
} from '@foodhub/shared';
import { editarMotivoCancelacion } from '../../../../api/motivosCancelacion.js';
import { Dialogo } from '../../../../components/Dialogo.js';
import {
  errorGeneralDe,
  useOperacionDeMotivo,
} from '../../../../hooks/useOperacionDeMotivo.js';
import { TEXTOS_FORMULARIO, TEXTOS_MOTIVOS } from '../../../../lib/textos.js';
import { CampoDeTexto } from './CampoDeTexto.js';
import {
  conErroresDeApi,
  erroresDeZod,
  type ErroresPorCampo,
} from './errores.js';
import { PieDeFormulario } from './PieDeFormulario.js';
import { SelectorDeAplicabilidad } from './SelectorDeAplicabilidad.js';

/** Edición de motivo — US-CFG-02, RF056: cambiar la aplicabilidad se aplica de inmediato. */
const CAMPOS = ['nombre', 'aplicableA'] as const;
type CampoDeEdicion = (typeof CAMPOS)[number];

export function DialogoDeEdicion({
  motivo,
  alCerrar,
}: {
  motivo: MotivoCancelacionListado;
  alCerrar: () => void;
}) {
  const [nombre, setNombre] = useState(motivo.nombre);
  const [aplicableA, setAplicableA] = useState<TipoUsuarioCancelacion>(
    motivo.aplicableA,
  );
  const [erroresLocales, setErroresLocales] = useState<
    ErroresPorCampo<CampoDeEdicion>
  >({});

  const operacion = useOperacionDeMotivo({
    ejecutar: (variables: {
      id: string;
      datos: EditarMotivoCancelacionInput;
    }) => editarMotivoCancelacion(variables.id, variables.datos),
    mensajeExito: MENSAJES_CONFIGURACION.motivoActualizado,
    alTerminar: alCerrar,
  });

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    const validacion = editarMotivoCancelacionSchema.safeParse({
      nombre,
      aplicableA,
    });
    if (!validacion.success) {
      setErroresLocales(erroresDeZod(validacion.error.issues, CAMPOS));
      return;
    }
    setErroresLocales({});
    operacion.mutate({ id: motivo.id, datos: validacion.data });
  }

  const errores = conErroresDeApi(erroresLocales, operacion.error, CAMPOS);

  return (
    <Dialogo
      abierto
      alCambiarApertura={(estaAbierto) => {
        if (!estaAbierto) alCerrar();
      }}
      alEnviar={enviar}
      error={errorGeneralDe(operacion.error)}
      pie={
        <PieDeFormulario
          alCancelar={alCerrar}
          enProceso={operacion.isPending}
          etiquetaConfirmar={TEXTOS_FORMULARIO.guardar}
        />
      }
      titulo={TEXTOS_MOTIVOS.dialogoEdicionTitulo}
    >
      <CampoDeTexto
        alCambiar={setNombre}
        autoFocus
        error={errores.nombre}
        etiqueta={TEXTOS_MOTIVOS.campoNombre}
        valor={nombre}
      />

      <SelectorDeAplicabilidad
        alCambiar={setAplicableA}
        error={errores.aplicableA}
        etiqueta={TEXTOS_MOTIVOS.campoAplicableA}
        valor={aplicableA}
      />
    </Dialogo>
  );
}
