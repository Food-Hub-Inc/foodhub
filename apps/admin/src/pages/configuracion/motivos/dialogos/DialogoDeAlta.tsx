import { useState, type FormEvent } from 'react';
import {
  crearMotivoCancelacionSchema,
  MENSAJES_CONFIGURACION,
  type TipoUsuarioCancelacion,
} from '@foodhub/shared';
import { crearMotivoCancelacion } from '../../../../api/motivosCancelacion.js';
import { Dialogo } from '../../../../components/Dialogo.js';
import {
  errorGeneralDe,
  useOperacionDeMotivo,
} from '../../../../hooks/useOperacionDeMotivo.js';
import { TEXTOS_MOTIVOS } from '../../../../lib/textos.js';
import { CampoDeTexto } from './CampoDeTexto.js';
import {
  conErroresDeApi,
  erroresDeZod,
  type ErroresPorCampo,
} from './errores.js';
import { PieDeFormulario } from './PieDeFormulario.js';
import { SelectorDeAplicabilidad } from './SelectorDeAplicabilidad.js';

/** Alta de motivo de cancelación — US-CFG-02, RF056. */
const CAMPOS = ['nombre', 'aplicableA'] as const;
type CampoDeAlta = (typeof CAMPOS)[number];

export function DialogoDeAlta({ alCerrar }: { alCerrar: () => void }) {
  const [nombre, setNombre] = useState('');
  const [aplicableA, setAplicableA] = useState<TipoUsuarioCancelacion | null>(
    null,
  );
  const [erroresLocales, setErroresLocales] = useState<
    ErroresPorCampo<CampoDeAlta>
  >({});

  const operacion = useOperacionDeMotivo({
    ejecutar: crearMotivoCancelacion,
    mensajeExito: MENSAJES_CONFIGURACION.motivoCreado,
    alTerminar: alCerrar,
  });

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    const validacion = crearMotivoCancelacionSchema.safeParse({
      nombre,
      aplicableA,
    });
    if (!validacion.success) {
      setErroresLocales(erroresDeZod(validacion.error.issues, CAMPOS));
      return;
    }
    setErroresLocales({});
    operacion.mutate(validacion.data);
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
          etiquetaConfirmar={TEXTOS_MOTIVOS.guardarAlta}
        />
      }
      titulo={TEXTOS_MOTIVOS.dialogoAltaTitulo}
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
