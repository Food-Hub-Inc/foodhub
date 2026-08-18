import { useState, type FormEvent } from 'react';
import { crearCategoriaSchema, MENSAJES_CONFIGURACION } from '@foodhub/shared';
import { crearCategoria } from '../../../../api/categorias.js';
import { Dialogo } from '../../../../components/Dialogo.js';
import {
  errorGeneralDe,
  useOperacionDeCategoria,
} from '../../../../hooks/useOperacionDeCategoria.js';
import { TEXTOS_CATEGORIAS } from '../../../../lib/textos.js';
import { CampoDeTexto } from './CampoDeTexto.js';
import { CampoDeTextoLargo } from './CampoDeTextoLargo.js';
import {
  conErroresDeApi,
  erroresDeZod,
  type ErroresPorCampo,
} from './errores.js';
import { PieDeFormulario } from './PieDeFormulario.js';
import { SelectorDeImagen } from './SelectorDeImagen.js';

/** Alta de categoría — US-CFG-01, RF054. */
const CAMPOS = ['nombre', 'descripcion', 'imagenPredeterminadaUrl'] as const;
type CampoDeAlta = (typeof CAMPOS)[number];

const FORMULARIO_VACIO = {
  nombre: '',
  descripcion: '',
  imagenPredeterminadaUrl: null as string | null,
};

export function DialogoDeAlta({ alCerrar }: { alCerrar: () => void }) {
  const [datos, setDatos] = useState(FORMULARIO_VACIO);
  const [erroresLocales, setErroresLocales] = useState<
    ErroresPorCampo<CampoDeAlta>
  >({});

  const operacion = useOperacionDeCategoria({
    ejecutar: crearCategoria,
    mensajeExito: MENSAJES_CONFIGURACION.categoriaCreada,
    alTerminar: alCerrar,
  });

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    const validacion = crearCategoriaSchema.safeParse({
      nombre: datos.nombre,
      descripcion: datos.descripcion || undefined,
      imagenPredeterminadaUrl: datos.imagenPredeterminadaUrl,
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
          etiquetaConfirmar={TEXTOS_CATEGORIAS.guardarAlta}
        />
      }
      titulo={TEXTOS_CATEGORIAS.dialogoAltaTitulo}
    >
      <CampoDeTexto
        alCambiar={(nombre) => {
          setDatos((previo) => ({ ...previo, nombre }));
        }}
        autoFocus
        error={errores.nombre}
        etiqueta={TEXTOS_CATEGORIAS.campoNombre}
        valor={datos.nombre}
      />

      <CampoDeTextoLargo
        alCambiar={(descripcion) => {
          setDatos((previo) => ({ ...previo, descripcion }));
        }}
        error={errores.descripcion}
        etiqueta={TEXTOS_CATEGORIAS.campoDescripcion}
        valor={datos.descripcion}
      />

      <SelectorDeImagen
        alCambiar={(imagenPredeterminadaUrl) => {
          setDatos((previo) => ({ ...previo, imagenPredeterminadaUrl }));
        }}
        categoriaId={null}
        error={errores.imagenPredeterminadaUrl}
        valor={datos.imagenPredeterminadaUrl}
      />
    </Dialogo>
  );
}
