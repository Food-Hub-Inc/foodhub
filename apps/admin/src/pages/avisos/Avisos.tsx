import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button, toast } from '@heroui/react';
import { avisoGeneralSchema, type AvisoGeneralInput } from '@foodhub/shared';
import { enviarAvisoGeneral } from '../../api/avisos.js';
import { EncabezadoPantalla } from '../../components/layout/EncabezadoPantalla.js';
import { errorGeneralDe } from '../../hooks/useOperacionDeUsuario.js';
import { TEXTOS_AVISOS as TEXTOS } from '../../lib/textos.js';
import { DialogoConfirmacionSimple } from '../configuracion/parametros/DialogoConfirmacionSimple.js';
import {
  conErroresDeApi,
  erroresDeZod,
  type ErroresPorCampo,
} from '../usuarios/dialogos/errores.js';
import { CamposDelAviso } from './CamposDelAviso.js';

/**
 * Avisos generales — US-NOT-04 / RF037.
 *
 * La historia fija el efecto ("el título y el cuerpo del mensaje definidos por
 * el administrador", a todos, solo clientes o solo cocineros) pero no hay
 * pantalla PAN que lo emita: este formulario sigue el estilo del resto del
 * panel (decisión del equipo del 13/10/2026).
 *
 * El envío se confirma antes de salir, como toda acción que no se puede
 * deshacer (guía de UX, principio 3): un push ya entregado no se retira.
 */

const CAMPOS = ['titulo', 'mensaje', 'destinatario'] as const;
type CampoDeAviso = (typeof CAMPOS)[number];

const AVISO_VACIO: AvisoGeneralInput = {
  titulo: '',
  mensaje: '',
  destinatario: 'TODOS',
};

export function Avisos() {
  const [aviso, setAviso] = useState<AvisoGeneralInput>(AVISO_VACIO);
  const [erroresLocales, setErroresLocales] = useState<
    ErroresPorCampo<CampoDeAviso>
  >({});
  const [aConfirmar, setAConfirmar] = useState<AvisoGeneralInput | null>(null);

  const operacion = useMutation({
    mutationFn: enviarAvisoGeneral,
    onSuccess: ({ destinatarios }) => {
      if (destinatarios === 0) toast.warning(TEXTOS.sinDestinatarios);
      else toast.success(TEXTOS.enviado(destinatarios));
      setAConfirmar(null);
      setAviso(AVISO_VACIO);
    },
  });

  function cambiar<C extends keyof AvisoGeneralInput>(
    campo: C,
    valor: AvisoGeneralInput[C],
  ) {
    setAviso((actual) => ({ ...actual, [campo]: valor }));
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    const validacion = avisoGeneralSchema.safeParse(aviso);
    if (!validacion.success) {
      setErroresLocales(erroresDeZod(validacion.error.issues, CAMPOS));
      return;
    }
    setErroresLocales({});
    operacion.reset();
    setAConfirmar(validacion.data);
  }

  return (
    <>
      <EncabezadoPantalla subtitulo={TEXTOS.subtitulo} titulo={TEXTOS.titulo} />

      <div className="p-8">
        <form
          className="aparece max-w-2xl space-y-5 rounded-lg border border-border bg-surface p-6"
          noValidate
          onSubmit={enviar}
        >
          <CamposDelAviso
            alCambiar={cambiar}
            aviso={aviso}
            errores={conErroresDeApi(erroresLocales, operacion.error, CAMPOS)}
          />

          <p className="rounded-sm bg-background p-3 text-caption text-text-secondary">
            {TEXTOS.ayuda}
          </p>

          <div className="flex justify-end">
            <Button type="submit" variant="primary">
              {TEXTOS.enviar}
            </Button>
          </div>
        </form>
      </div>

      {aConfirmar ? (
        <DialogoConfirmacionSimple
          alCerrar={() => {
            setAConfirmar(null);
          }}
          alConfirmar={() => {
            operacion.mutate(aConfirmar);
          }}
          enProceso={operacion.isPending}
          error={errorGeneralDe(operacion.error)}
          etiquetaCancelar={TEXTOS.volver}
          etiquetaConfirmar={TEXTOS.confirmar}
          mensaje={TEXTOS.confirmarMensaje(
            TEXTOS.destinatarios[aConfirmar.destinatario],
          )}
          titulo={TEXTOS.confirmarTitulo}
        />
      ) : null}
    </>
  );
}
