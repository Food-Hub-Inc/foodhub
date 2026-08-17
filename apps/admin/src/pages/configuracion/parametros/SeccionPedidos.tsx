import { useState } from 'react';
import {
  parametrosPedidosSchema,
  type ParametrosPedidos,
} from '@foodhub/shared';
import {
  actualizarParametrosPedidos,
  restaurarParametrosPedidos,
} from '../../../api/parametrosSistema.js';
import { errorGeneralDe } from '../../../hooks/useOperacionDeParametros.js';
import { TEXTOS_PARAMETROS } from '../../../lib/textos.js';
import { BotonesDeSeccion } from './BotonesDeSeccion.js';
import { CampoNumerico } from './CampoNumerico.js';
import { erroresDeSeccion } from './erroresDeSeccion.js';
import { useFormularioDeSeccion } from './useFormularioDeSeccion.js';

type Campo = keyof ParametrosPedidos;

function aTexto(datos: ParametrosPedidos): Record<Campo, string> {
  return {
    tiempoCancelacionClienteMinutos: String(
      datos.tiempoCancelacionClienteMinutos,
    ),
    tiempoExpiracionCocineroMinutos: String(
      datos.tiempoExpiracionCocineroMinutos,
    ),
  };
}

/** Subsección "Parámetros de pedidos" de PAN-ADM-04 — US-CFG-03. */
export function SeccionPedidos({
  valorInicial,
}: {
  valorInicial: ParametrosPedidos;
}) {
  const [valores, setValores] = useState(aTexto(valorInicial));

  const validacion = parametrosPedidosSchema.safeParse({
    tiempoCancelacionClienteMinutos: Number(
      valores.tiempoCancelacionClienteMinutos,
    ),
    tiempoExpiracionCocineroMinutos: Number(
      valores.tiempoExpiracionCocineroMinutos,
    ),
  });
  const errores = validacion.success
    ? {}
    : erroresDeSeccion<Campo>(validacion.error.issues);

  const formulario = useFormularioDeSeccion({
    actualizar: actualizarParametrosPedidos,
    restaurarValores: restaurarParametrosPedidos,
    alExito: (resultado) => {
      setValores(aTexto(resultado));
    },
  });

  return (
    <div className="space-y-5">
      <CampoNumerico
        alCambiar={(tiempoCancelacionClienteMinutos) => {
          setValores((previo) => ({
            ...previo,
            tiempoCancelacionClienteMinutos,
          }));
        }}
        ayuda={TEXTOS_PARAMETROS.ayudaTiempoCancelacion}
        error={errores.tiempoCancelacionClienteMinutos}
        etiqueta={TEXTOS_PARAMETROS.campoTiempoCancelacion}
        valor={valores.tiempoCancelacionClienteMinutos}
      />

      <CampoNumerico
        alCambiar={(tiempoExpiracionCocineroMinutos) => {
          setValores((previo) => ({
            ...previo,
            tiempoExpiracionCocineroMinutos,
          }));
        }}
        ayuda={TEXTOS_PARAMETROS.ayudaTiempoExpiracion}
        error={errores.tiempoExpiracionCocineroMinutos}
        etiqueta={TEXTOS_PARAMETROS.campoTiempoExpiracion}
        valor={valores.tiempoExpiracionCocineroMinutos}
      />

      <BotonesDeSeccion
        alAbrirGuardar={formulario.abrirGuardar}
        alAbrirRestaurar={formulario.abrirRestaurar}
        alCerrarDialogo={formulario.cerrarDialogo}
        alConfirmarGuardar={() => {
          if (validacion.success) formulario.guardar.mutate(validacion.data);
        }}
        alConfirmarRestaurar={() => {
          formulario.restaurar.mutate(undefined);
        }}
        dialogoAbierto={formulario.dialogoAbierto}
        errorGuardar={errorGeneralDe(formulario.guardar.error)}
        errorRestaurar={errorGeneralDe(formulario.restaurar.error)}
        formularioValido={validacion.success}
        guardando={formulario.guardar.isPending}
        restaurando={formulario.restaurar.isPending}
      />
    </div>
  );
}
