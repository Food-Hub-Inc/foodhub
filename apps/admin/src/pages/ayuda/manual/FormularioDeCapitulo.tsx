import { useState, type FormEvent } from 'react';
import { Alert, Button } from '@heroui/react';
import {
  MENSAJES_AYUDA,
  crearCapituloAyudaSchema,
  editarCapituloAyudaSchema,
  type CapituloAyudaListado,
  type CrearCapituloAyudaInput,
  type RolDestinoAyuda,
  type SeccionAyudaInput,
} from '@foodhub/shared';
import { crearCapitulo, editarCapitulo } from '../../../api/ayuda.js';
import { IconoAlerta } from '../../../components/iconos/index.js';
import {
  errorGeneralDe,
  useOperacionDeAyuda,
} from '../../../hooks/useOperacionDeAyuda.js';
import { subirImagenAyuda } from '../../../lib/subirImagenAyuda.js';
import {
  TEXTOS_FORMULARIO,
  TEXTOS_GESTION_AYUDA,
} from '../../../lib/textos.js';
import { EditorDeContenidoAyuda } from '../EditorDeContenidoAyuda.js';
import {
  CampoDeTexto,
  PieDeFormulario,
  SelectorDeRolDestino,
} from '../dialogos/Controles.js';
import {
  conErroresDeApi,
  erroresDeZod,
  type ErroresPorCampo,
} from '../dialogos/errores.js';

const CAMPOS = ['titulo', 'rolDestino', 'secciones'] as const;
type CampoDelCapitulo = (typeof CAMPOS)[number];

interface SeccionEnFormulario {
  id?: string;
  titulo: string;
  contenidoHtml: string;
}

interface VariablesDeCapitulo {
  id: string | null;
  datos: CrearCapituloAyudaInput;
}

function seccionesIniciales(
  capitulo: CapituloAyudaListado | undefined,
): SeccionEnFormulario[] {
  if (capitulo && capitulo.secciones.length > 0) {
    return capitulo.secciones.map((seccion) => ({
      id: seccion.id,
      titulo: seccion.titulo,
      contenidoHtml: seccion.contenidoHtml,
    }));
  }
  return [{ titulo: '', contenidoHtml: '' }];
}

function validarCapitulo(entrada: {
  titulo: string;
  rolDestino: RolDestinoAyuda | null;
  secciones: SeccionEnFormulario[];
  esEdicion: boolean;
}):
  | { valido: true; datos: CrearCapituloAyudaInput }
  | {
      valido: false;
      problemas: readonly { path: PropertyKey[]; message: string }[];
    } {
  const candidato = {
    titulo: entrada.titulo,
    rolDestino: entrada.rolDestino ?? '',
    secciones: entrada.secciones.map((seccion): SeccionAyudaInput => ({
      ...(seccion.id ? { id: seccion.id } : {}),
      titulo: seccion.titulo,
      contenidoHtml: seccion.contenidoHtml,
    })),
  };

  const validacion = entrada.esEdicion
    ? editarCapituloAyudaSchema.safeParse(candidato)
    : crearCapituloAyudaSchema.safeParse(candidato);
  if (!validacion.success) {
    return { valido: false, problemas: validacion.error.issues };
  }
  return {
    valido: true,
    datos: { ...candidato, rolDestino: entrada.rolDestino! },
  };
}

/** Estado, validación y guardado del formulario de un capítulo (US-AYU-05). */
function useFormularioDeCapitulo(
  capitulo: CapituloAyudaListado | undefined,
  alGuardar: () => void,
) {
  const esEdicion = Boolean(capitulo);
  const [titulo, setTitulo] = useState(capitulo?.titulo ?? '');
  const [rolDestino, setRolDestino] = useState<RolDestinoAyuda | null>(
    capitulo?.rolDestino ?? null,
  );
  const [secciones, setSecciones] = useState<SeccionEnFormulario[]>(() =>
    seccionesIniciales(capitulo),
  );
  const [erroresLocales, setErroresLocales] = useState<
    ErroresPorCampo<CampoDelCapitulo>
  >({});

  const operacion = useOperacionDeAyuda<VariablesDeCapitulo>({
    ejecutar: ({ id, datos }) =>
      id ? editarCapitulo(id, datos) : crearCapitulo(datos),
    mensajeExito: esEdicion
      ? MENSAJES_AYUDA.admin.capituloActualizado
      : MENSAJES_AYUDA.admin.capituloCreado,
    alTerminar: alGuardar,
  });

  function alCambiarSeccion(
    indice: number,
    cambio: Partial<SeccionEnFormulario>,
  ) {
    setSecciones((previas) =>
      previas.map((seccion, posicion) =>
        posicion === indice ? { ...seccion, ...cambio } : seccion,
      ),
    );
  }

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    const resultado = validarCapitulo({
      titulo,
      rolDestino,
      secciones,
      esEdicion,
    });
    if (!resultado.valido) {
      setErroresLocales(erroresDeZod(resultado.problemas, CAMPOS));
      return;
    }
    setErroresLocales({});
    operacion.mutate({ id: capitulo?.id ?? null, datos: resultado.datos });
  }

  return {
    esEdicion,
    titulo,
    setTitulo,
    rolDestino,
    setRolDestino,
    secciones,
    setSecciones,
    alCambiarSeccion,
    alEnviar,
    errores: conErroresDeApi(erroresLocales, operacion.error, CAMPOS),
    errorGeneral: errorGeneralDe(operacion.error),
    enProceso: operacion.isPending,
  };
}

/**
 * Formulario de alta y edición de un capítulo del manual (US-AYU-05).
 *
 * Vive fuera de un modal a propósito: en la página de edición el contenido es
 * largo y conviene verlo completo. El contenedor decide qué hacer al guardar
 * (`alGuardar`) y al cancelar (`alCancelar`).
 */
export function FormularioDeCapitulo({
  capitulo,
  alGuardar,
  alCancelar,
}: {
  capitulo?: CapituloAyudaListado;
  alGuardar: () => void;
  alCancelar: () => void;
}) {
  const {
    esEdicion,
    titulo,
    setTitulo,
    rolDestino,
    setRolDestino,
    secciones,
    setSecciones,
    alCambiarSeccion,
    alEnviar,
    errores,
    errorGeneral,
    enProceso,
  } = useFormularioDeCapitulo(capitulo, alGuardar);

  return (
    <form className="space-y-6 p-6" noValidate onSubmit={alEnviar}>
      <AlertaDeError mensaje={errorGeneral} />

      <CamposDeCapitulo
        alCambiarRol={setRolDestino}
        alCambiarSeccion={alCambiarSeccion}
        alCambiarSecciones={setSecciones}
        alCambiarTitulo={setTitulo}
        errorRol={errores.rolDestino}
        errorSecciones={errores.secciones}
        errorTitulo={errores.titulo}
        rolDestino={rolDestino}
        secciones={secciones}
        titulo={titulo}
      />

      <PieDePagina
        alCancelar={alCancelar}
        enProceso={enProceso}
        etiquetaConfirmar={
          esEdicion
            ? TEXTOS_FORMULARIO.guardar
            : TEXTOS_GESTION_AYUDA.guardarAlta
        }
      />
    </form>
  );
}

function AlertaDeError({ mensaje }: { mensaje: string | null }) {
  if (!mensaje) return null;
  return (
    <Alert status="danger">
      <Alert.Indicator>
        <IconoAlerta className="size-5" />
      </Alert.Indicator>
      <Alert.Content>
        <Alert.Description>{mensaje}</Alert.Description>
      </Alert.Content>
    </Alert>
  );
}

function PieDePagina({
  alCancelar,
  enProceso,
  etiquetaConfirmar,
}: {
  alCancelar: () => void;
  enProceso: boolean;
  etiquetaConfirmar: string;
}) {
  return (
    <div className="flex justify-end gap-2 border-t border-border pt-4">
      <PieDeFormulario
        alCancelar={alCancelar}
        enProceso={enProceso}
        etiquetaConfirmar={etiquetaConfirmar}
      />
    </div>
  );
}

function CamposDeCapitulo({
  titulo,
  alCambiarTitulo,
  errorTitulo,
  rolDestino,
  alCambiarRol,
  errorRol,
  secciones,
  alCambiarSecciones,
  alCambiarSeccion,
  errorSecciones,
}: {
  titulo: string;
  alCambiarTitulo: (valor: string) => void;
  errorTitulo: string | undefined;
  rolDestino: RolDestinoAyuda | null;
  alCambiarRol: (valor: RolDestinoAyuda) => void;
  errorRol: string | undefined;
  secciones: SeccionEnFormulario[];
  alCambiarSecciones: (secciones: SeccionEnFormulario[]) => void;
  alCambiarSeccion: (
    indice: number,
    cambio: Partial<SeccionEnFormulario>,
  ) => void;
  errorSecciones: string | undefined;
}) {
  return (
    <>
      <CampoDeTexto
        alCambiar={alCambiarTitulo}
        autoFocus
        error={errorTitulo}
        etiqueta={MENSAJES_AYUDA.admin.tituloCampo}
        valor={titulo}
      />

      <SelectorDeRolDestino
        alCambiar={alCambiarRol}
        error={errorRol}
        valor={rolDestino}
      />

      <ListaDeSecciones
        alCambiarSeccion={alCambiarSeccion}
        alCambiarSecciones={alCambiarSecciones}
        error={errorSecciones}
        secciones={secciones}
      />
    </>
  );
}

function ListaDeSecciones({
  secciones,
  alCambiarSecciones,
  alCambiarSeccion,
  error,
}: {
  secciones: SeccionEnFormulario[];
  alCambiarSecciones: (secciones: SeccionEnFormulario[]) => void;
  alCambiarSeccion: (
    indice: number,
    cambio: Partial<SeccionEnFormulario>,
  ) => void;
  error: string | undefined;
}) {
  return (
    <div className="space-y-3">
      <p className="text-label font-semibold text-text-primary">
        {MENSAJES_AYUDA.admin.seccionesCampo}
      </p>

      {secciones.map((seccion, indice) => (
        <SeccionDeCapitulo
          alCambiar={(cambio) => {
            alCambiarSeccion(indice, cambio);
          }}
          alQuitar={() => {
            alCambiarSecciones(
              secciones.filter((_, posicion) => posicion !== indice),
            );
          }}
          indice={indice}
          key={indice}
          puedeQuitarse={secciones.length > 1}
          seccion={seccion}
        />
      ))}

      {error ? (
        <p className="text-caption text-error" role="alert">
          {error}
        </p>
      ) : null}

      <Button
        onPress={() => {
          alCambiarSecciones([...secciones, { titulo: '', contenidoHtml: '' }]);
        }}
        size="sm"
        type="button"
        variant="secondary"
      >
        {MENSAJES_AYUDA.admin.agregarSeccion}
      </Button>
    </div>
  );
}

function SeccionDeCapitulo({
  seccion,
  indice,
  puedeQuitarse,
  alCambiar,
  alQuitar,
}: {
  seccion: SeccionEnFormulario;
  indice: number;
  puedeQuitarse: boolean;
  alCambiar: (cambio: Partial<SeccionEnFormulario>) => void;
  alQuitar: () => void;
}) {
  return (
    <div className="space-y-3 rounded-sm border border-border p-3">
      <div className="flex items-center justify-between">
        <p className="text-caption text-text-secondary">
          {`Sección ${String(indice + 1)}`}
        </p>
        {puedeQuitarse ? (
          <Button onPress={alQuitar} size="sm" type="button" variant="ghost">
            {MENSAJES_AYUDA.admin.quitarSeccion}
          </Button>
        ) : null}
      </div>

      <CampoDeTexto
        alCambiar={(valor) => {
          alCambiar({ titulo: valor });
        }}
        etiqueta={TEXTOS_GESTION_AYUDA.etiquetaTituloSeccion}
        valor={seccion.titulo}
      />

      <div className="space-y-1.5">
        <p className="text-label font-semibold text-text-primary">
          {MENSAJES_AYUDA.admin.contenidoCampo}
        </p>
        <EditorDeContenidoAyuda
          alCambiar={(html) => {
            alCambiar({ contenidoHtml: html });
          }}
          alSubirImagen={subirImagenAyuda}
          contenidoInicial={seccion.contenidoHtml}
        />
      </div>
    </div>
  );
}
