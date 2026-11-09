import { useState } from 'react';
import {
  parametrosResenasSchema,
  type ParametrosResenas,
} from '@foodhub/shared';
import {
  actualizarParametrosResenas,
  restaurarParametrosResenas,
} from '../../../api/parametrosSistema.js';
import { errorGeneralDe } from '../../../hooks/useOperacionDeParametros.js';
import { TEXTOS_PARAMETROS } from '../../../lib/textos.js';
import { BotonesDeSeccion } from './BotonesDeSeccion.js';
import { CampoDeLista } from './CampoDeLista.js';
import { CampoNumerico } from './CampoNumerico.js';
import { erroresDeSeccion } from './erroresDeSeccion.js';
import { useFormularioDeSeccion } from './useFormularioDeSeccion.js';

type Campo = keyof ParametrosResenas;

function aTexto(datos: ParametrosResenas): Record<Campo, string> {
  return {
    minimoResenasParaPromedio: String(datos.minimoResenasParaPromedio),
    limiteDiasParaResenar: String(datos.limiteDiasParaResenar),
    // La lista viaja como texto mientras se edita, un término por renglón, y
    // recién se parte al validar. Ver `CampoDeLista`.
    terminosModeracion: datos.terminosModeracion.join('\n'),
  };
}

/** Un término por renglón, descartando líneas en blanco y espacios sobrantes. */
function aListaDeTerminos(valor: string): string[] {
  return valor
    .split('\n')
    .map((termino) => termino.trim())
    .filter(Boolean);
}

/** Subsección "Parámetros de reseñas" de PAN-ADM-04 — US-CFG-03. */
export function SeccionResenas({
  valorInicial,
}: {
  valorInicial: ParametrosResenas;
}) {
  const [valores, setValores] = useState(aTexto(valorInicial));

  const terminos = aListaDeTerminos(valores.terminosModeracion);

  const validacion = parametrosResenasSchema.safeParse({
    minimoResenasParaPromedio: Number(valores.minimoResenasParaPromedio),
    limiteDiasParaResenar: Number(valores.limiteDiasParaResenar),
    terminosModeracion: terminos,
  });
  const errores = validacion.success
    ? {}
    : erroresDeSeccion<Campo>(validacion.error.issues);

  const formulario = useFormularioDeSeccion({
    actualizar: actualizarParametrosResenas,
    restaurarValores: restaurarParametrosResenas,
    alExito: (resultado) => {
      setValores(aTexto(resultado));
    },
  });

  return (
    <div className="space-y-5">
      <CampoNumerico
        alCambiar={(minimoResenasParaPromedio) => {
          setValores((previo) => ({ ...previo, minimoResenasParaPromedio }));
        }}
        ayuda={TEXTOS_PARAMETROS.ayudaMinimoResenas}
        error={errores.minimoResenasParaPromedio}
        etiqueta={TEXTOS_PARAMETROS.campoMinimoResenas}
        valor={valores.minimoResenasParaPromedio}
      />

      <CampoNumerico
        alCambiar={(limiteDiasParaResenar) => {
          setValores((previo) => ({ ...previo, limiteDiasParaResenar }));
        }}
        ayuda={TEXTOS_PARAMETROS.ayudaLimiteDiasResena}
        error={errores.limiteDiasParaResenar}
        etiqueta={TEXTOS_PARAMETROS.campoLimiteDiasResena}
        valor={valores.limiteDiasParaResenar}
      />

      <CampoDeLista
        alCambiar={(terminosModeracion) => {
          setValores((previo) => ({ ...previo, terminosModeracion }));
        }}
        ayuda={TEXTOS_PARAMETROS.ayudaTerminosModeracion}
        cantidad={terminos.length}
        error={errores.terminosModeracion}
        etiqueta={TEXTOS_PARAMETROS.campoTerminosModeracion}
        leyendaCantidad={TEXTOS_PARAMETROS.leyendaTerminosModeracion}
        valor={valores.terminosModeracion}
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
