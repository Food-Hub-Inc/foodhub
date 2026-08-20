import { useState } from 'react';
import {
  parametrosInstitucionalesSchema,
  type ParametrosInstitucionales,
} from '@foodhub/shared';
import {
  actualizarParametrosInstitucionales,
  restaurarParametrosInstitucionales,
} from '../../../api/parametrosSistema.js';
import { errorGeneralDe } from '../../../hooks/useOperacionDeParametros.js';
import { TEXTOS_PARAMETROS } from '../../../lib/textos.js';
import { BotonesDeSeccion } from './BotonesDeSeccion.js';
import { CampoDeTexto } from './CampoDeTexto.js';
import { erroresDeSeccion } from './erroresDeSeccion.js';
import { SelectorDeLogo } from './SelectorDeLogo.js';
import { useFormularioDeSeccion } from './useFormularioDeSeccion.js';

type Campo = keyof ParametrosInstitucionales;

/** Subsección "Información institucional" de PAN-ADM-04 — US-CFG-03. */
export function SeccionInstitucional({
  valorInicial,
}: {
  valorInicial: ParametrosInstitucionales;
}) {
  const [valores, setValores] = useState(valorInicial);

  const validacion = parametrosInstitucionalesSchema.safeParse(valores);
  const errores = validacion.success
    ? {}
    : erroresDeSeccion<Campo>(validacion.error.issues);

  const formulario = useFormularioDeSeccion({
    actualizar: actualizarParametrosInstitucionales,
    restaurarValores: restaurarParametrosInstitucionales,
    alExito: setValores,
  });

  return (
    <div className="space-y-5">
      <CampoDeTexto
        alCambiar={(nombrePlataforma) => {
          setValores((previo) => ({ ...previo, nombrePlataforma }));
        }}
        error={errores.nombrePlataforma}
        etiqueta={TEXTOS_PARAMETROS.campoNombrePlataforma}
        valor={valores.nombrePlataforma}
      />

      <SelectorDeLogo
        alCambiar={(logoPlataformaUrl) => {
          setValores((previo) => ({ ...previo, logoPlataformaUrl }));
        }}
        error={errores.logoPlataformaUrl}
        valor={valores.logoPlataformaUrl}
      />

      <CampoDeTexto
        alCambiar={(correoSoporte) => {
          setValores((previo) => ({ ...previo, correoSoporte }));
        }}
        error={errores.correoSoporte}
        etiqueta={TEXTOS_PARAMETROS.campoCorreoSoporte}
        valor={valores.correoSoporte}
      />

      <CampoDeTexto
        alCambiar={(horarioAtencionSoporte) => {
          setValores((previo) => ({ ...previo, horarioAtencionSoporte }));
        }}
        error={errores.horarioAtencionSoporte}
        etiqueta={TEXTOS_PARAMETROS.campoHorarioAtencionSoporte}
        valor={valores.horarioAtencionSoporte}
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
