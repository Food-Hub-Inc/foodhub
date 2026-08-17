import { useState } from 'react';
import {
  parametrosBusquedaSchema,
  type ParametrosBusqueda,
} from '@foodhub/shared';
import {
  actualizarParametrosBusqueda,
  restaurarParametrosBusqueda,
} from '../../../api/parametrosSistema.js';
import { errorGeneralDe } from '../../../hooks/useOperacionDeParametros.js';
import { TEXTOS_PARAMETROS } from '../../../lib/textos.js';
import { BotonesDeSeccion } from './BotonesDeSeccion.js';
import { CampoNumerico } from './CampoNumerico.js';
import { erroresDeSeccion } from './erroresDeSeccion.js';
import { useFormularioDeSeccion } from './useFormularioDeSeccion.js';

type Campo = keyof ParametrosBusqueda;

function aTexto(datos: ParametrosBusqueda): Record<Campo, string> {
  return {
    radioBusquedaDefectoKm: String(datos.radioBusquedaDefectoKm),
    distanciaMaximaFiltroKm: String(datos.distanciaMaximaFiltroKm),
    feedPublicacionesPorPagina: String(datos.feedPublicacionesPorPagina),
  };
}

/** Subsección "Parámetros de búsqueda" de PAN-ADM-04 — US-CFG-03. */
export function SeccionBusqueda({
  valorInicial,
}: {
  valorInicial: ParametrosBusqueda;
}) {
  const [valores, setValores] = useState(aTexto(valorInicial));

  const validacion = parametrosBusquedaSchema.safeParse({
    radioBusquedaDefectoKm: Number(valores.radioBusquedaDefectoKm),
    distanciaMaximaFiltroKm: Number(valores.distanciaMaximaFiltroKm),
    feedPublicacionesPorPagina: Number(valores.feedPublicacionesPorPagina),
  });
  const errores = validacion.success
    ? {}
    : erroresDeSeccion<Campo>(validacion.error.issues);

  const formulario = useFormularioDeSeccion({
    actualizar: actualizarParametrosBusqueda,
    restaurarValores: restaurarParametrosBusqueda,
    alExito: (resultado) => {
      setValores(aTexto(resultado));
    },
  });

  return (
    <div className="space-y-5">
      <CampoNumerico
        alCambiar={(radioBusquedaDefectoKm) => {
          setValores((previo) => ({ ...previo, radioBusquedaDefectoKm }));
        }}
        ayuda={TEXTOS_PARAMETROS.ayudaRadioBusqueda}
        error={errores.radioBusquedaDefectoKm}
        etiqueta={TEXTOS_PARAMETROS.campoRadioBusqueda}
        valor={valores.radioBusquedaDefectoKm}
      />

      <CampoNumerico
        alCambiar={(distanciaMaximaFiltroKm) => {
          setValores((previo) => ({ ...previo, distanciaMaximaFiltroKm }));
        }}
        ayuda={TEXTOS_PARAMETROS.ayudaDistanciaMaxima}
        error={errores.distanciaMaximaFiltroKm}
        etiqueta={TEXTOS_PARAMETROS.campoDistanciaMaxima}
        valor={valores.distanciaMaximaFiltroKm}
      />

      <CampoNumerico
        alCambiar={(feedPublicacionesPorPagina) => {
          setValores((previo) => ({ ...previo, feedPublicacionesPorPagina }));
        }}
        ayuda={TEXTOS_PARAMETROS.ayudaPublicacionesPorPagina}
        error={errores.feedPublicacionesPorPagina}
        etiqueta={TEXTOS_PARAMETROS.campoPublicacionesPorPagina}
        valor={valores.feedPublicacionesPorPagina}
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
