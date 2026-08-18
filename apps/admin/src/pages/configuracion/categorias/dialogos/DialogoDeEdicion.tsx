import { useState, type FormEvent } from 'react';
import {
  editarCategoriaSchema,
  MENSAJES_CONFIGURACION,
  type CategoriaListado,
  type EditarCategoriaInput,
} from '@foodhub/shared';
import { editarCategoria } from '../../../../api/categorias.js';
import { Dialogo } from '../../../../components/Dialogo.js';
import {
  errorGeneralDe,
  useOperacionDeCategoria,
} from '../../../../hooks/useOperacionDeCategoria.js';
import {
  TEXTOS_CATEGORIAS,
  TEXTOS_FORMULARIO,
} from '../../../../lib/textos.js';
import { CampoDeTexto } from './CampoDeTexto.js';
import { CampoDeTextoLargo } from './CampoDeTextoLargo.js';
import {
  conErroresDeApi,
  erroresDeZod,
  type ErroresPorCampo,
} from './errores.js';
import { PieDeFormulario } from './PieDeFormulario.js';
import { SelectorDeImagen } from './SelectorDeImagen.js';

/** Edición de categoría — US-CFG-01, RF054. */
const CAMPOS = ['nombre', 'descripcion', 'imagenPredeterminadaUrl'] as const;
type CampoDeEdicion = (typeof CAMPOS)[number];

export function DialogoDeEdicion({
  categoria,
  alCerrar,
}: {
  categoria: CategoriaListado;
  alCerrar: () => void;
}) {
  /**
   * El estado se inicializa desde la fila y no se sincroniza después: quien
   * monta este diálogo lo hace con `key={categoria.id}`, así que React lo
   * desmonta y lo vuelve a montar al elegir otra fila.
   */
  const [nombre, setNombre] = useState(categoria.nombre);
  const [descripcion, setDescripcion] = useState(categoria.descripcion ?? '');
  const [imagenPredeterminadaUrl, setImagenPredeterminadaUrl] = useState(
    categoria.imagenPredeterminadaUrl,
  );
  const [erroresLocales, setErroresLocales] = useState<
    ErroresPorCampo<CampoDeEdicion>
  >({});

  const operacion = useOperacionDeCategoria({
    ejecutar: (variables: { id: string; datos: EditarCategoriaInput }) =>
      editarCategoria(variables.id, variables.datos),
    mensajeExito: MENSAJES_CONFIGURACION.categoriaActualizada,
    alTerminar: alCerrar,
  });

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    const validacion = editarCategoriaSchema.safeParse({
      nombre,
      descripcion: descripcion || null,
      imagenPredeterminadaUrl,
    });
    if (!validacion.success) {
      setErroresLocales(erroresDeZod(validacion.error.issues, CAMPOS));
      return;
    }
    setErroresLocales({});
    operacion.mutate({ id: categoria.id, datos: validacion.data });
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
      titulo={TEXTOS_CATEGORIAS.dialogoEdicionTitulo}
    >
      <CampoDeTexto
        alCambiar={setNombre}
        autoFocus
        error={errores.nombre}
        etiqueta={TEXTOS_CATEGORIAS.campoNombre}
        valor={nombre}
      />

      <CampoDeTextoLargo
        alCambiar={setDescripcion}
        error={errores.descripcion}
        etiqueta={TEXTOS_CATEGORIAS.campoDescripcion}
        valor={descripcion}
      />

      <SelectorDeImagen
        alCambiar={setImagenPredeterminadaUrl}
        categoriaId={categoria.id}
        error={errores.imagenPredeterminadaUrl}
        valor={imagenPredeterminadaUrl}
      />
    </Dialogo>
  );
}
