import { useState, type FormEvent, type ReactNode } from 'react';
import {
  MENSAJES_AYUDA,
  categoriasFaqDeRol,
  crearFaqAdminSchema,
  editarFaqAdminSchema,
  type CrearFaqAdminInput,
  type FaqAdminListado,
  type RolDestinoAyuda,
} from '@foodhub/shared';
import { crearFaq, editarFaq } from '../../../api/ayuda.js';
import { Dialogo } from '../../../components/Dialogo.js';
import {
  errorGeneralDe,
  useOperacionDeAyuda,
} from '../../../hooks/useOperacionDeAyuda.js';
import {
  TEXTOS_FORMULARIO,
  TEXTOS_GESTION_AYUDA,
} from '../../../lib/textos.js';
import {
  CampoDeArea,
  PieDeFormulario,
  SelectorDeCategoriaFaq,
  SelectorDeRolDestino,
} from './Controles.js';
import {
  conErroresDeApi,
  erroresDeZod,
  type ErroresPorCampo,
} from './errores.js';

const CAMPOS = ['categoria', 'pregunta', 'respuesta', 'rolDestino'] as const;
type CampoDeFaq = (typeof CAMPOS)[number];

interface VariablesDeFaq {
  id: string | null;
  datos: CrearFaqAdminInput;
}

function validarFaq(entrada: {
  categoria: string | null;
  pregunta: string;
  respuesta: string;
  rolDestino: RolDestinoAyuda | null;
  esEdicion: boolean;
}):
  | { valido: true; datos: CrearFaqAdminInput }
  | {
      valido: false;
      problemas: readonly { path: PropertyKey[]; message: string }[];
    } {
  const candidato = {
    categoria: entrada.categoria ?? '',
    pregunta: entrada.pregunta,
    respuesta: entrada.respuesta,
    rolDestino: entrada.rolDestino ?? '',
  };

  const validacion = entrada.esEdicion
    ? editarFaqAdminSchema.safeParse(candidato)
    : crearFaqAdminSchema.safeParse(candidato);
  if (!validacion.success) {
    return { valido: false, problemas: validacion.error.issues };
  }
  return {
    valido: true,
    datos: {
      ...candidato,
      categoria: entrada.categoria!,
      rolDestino: entrada.rolDestino!,
    },
  };
}

/** Alta y edición de una pregunta frecuente — US-AYU-05. */
export function DialogoDeFaq({
  faq,
  alCerrar,
}: {
  faq?: FaqAdminListado;
  alCerrar: () => void;
}) {
  const esEdicion = Boolean(faq);
  const [rolDestino, setRolDestino] = useState<RolDestinoAyuda | null>(
    faq?.rolDestino ?? null,
  );
  const [categoria, setCategoria] = useState<string | null>(
    faq?.categoria ?? null,
  );
  const [pregunta, setPregunta] = useState(faq?.pregunta ?? '');
  const [respuesta, setRespuesta] = useState(faq?.respuesta ?? '');
  const [erroresLocales, setErroresLocales] = useState<
    ErroresPorCampo<CampoDeFaq>
  >({});

  const operacion = useOperacionDeAyuda<VariablesDeFaq>({
    ejecutar: ({ id, datos }) => (id ? editarFaq(id, datos) : crearFaq(datos)),
    mensajeExito: esEdicion
      ? MENSAJES_AYUDA.admin.faqActualizada
      : MENSAJES_AYUDA.admin.faqCreada,
    alTerminar: alCerrar,
  });

  function cambiarRol(nuevoRol: RolDestinoAyuda) {
    setRolDestino(nuevoRol);
    if (categoria && !categoriasFaqDeRol(nuevoRol).includes(categoria)) {
      setCategoria(null);
    }
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    const resultado = validarFaq({
      categoria,
      pregunta,
      respuesta,
      rolDestino,
      esEdicion,
    });
    if (!resultado.valido) {
      setErroresLocales(erroresDeZod(resultado.problemas, CAMPOS));
      return;
    }
    setErroresLocales({});
    operacion.mutate({ id: faq?.id ?? null, datos: resultado.datos });
  }

  const errores = conErroresDeApi(erroresLocales, operacion.error, CAMPOS);

  return (
    <FormularioDeFaq
      alCerrar={alCerrar}
      alEnviar={enviar}
      enProceso={operacion.isPending}
      errorGeneral={errorGeneralDe(operacion.error)}
      esEdicion={esEdicion}
    >
      <CamposDeFaq
        alCambiarCategoria={setCategoria}
        alCambiarPregunta={setPregunta}
        alCambiarRespuesta={setRespuesta}
        alCambiarRol={cambiarRol}
        categoria={categoria}
        errores={errores}
        pregunta={pregunta}
        respuesta={respuesta}
        rolDestino={rolDestino}
      />
    </FormularioDeFaq>
  );
}

function FormularioDeFaq({
  esEdicion,
  alCerrar,
  alEnviar,
  errorGeneral,
  enProceso,
  children,
}: {
  esEdicion: boolean;
  alCerrar: () => void;
  alEnviar: (evento: FormEvent<HTMLFormElement>) => void;
  errorGeneral: string | null;
  enProceso: boolean;
  children: ReactNode;
}) {
  return (
    <Dialogo
      abierto
      alCambiarApertura={(estaAbierto) => {
        if (!estaAbierto) alCerrar();
      }}
      alEnviar={alEnviar}
      error={errorGeneral}
      pie={
        <PieDeFormulario
          alCancelar={alCerrar}
          enProceso={enProceso}
          etiquetaConfirmar={
            esEdicion
              ? TEXTOS_FORMULARIO.guardar
              : TEXTOS_GESTION_AYUDA.guardarAlta
          }
        />
      }
      tamano="lg"
      titulo={
        esEdicion
          ? TEXTOS_GESTION_AYUDA.dialogoEdicionFaqTitulo
          : MENSAJES_AYUDA.admin.nuevaPregunta
      }
    >
      {children}
    </Dialogo>
  );
}

function CamposDeFaq({
  rolDestino,
  alCambiarRol,
  categoria,
  alCambiarCategoria,
  pregunta,
  alCambiarPregunta,
  respuesta,
  alCambiarRespuesta,
  errores,
}: {
  rolDestino: RolDestinoAyuda | null;
  alCambiarRol: (valor: RolDestinoAyuda) => void;
  categoria: string | null;
  alCambiarCategoria: (valor: string) => void;
  pregunta: string;
  alCambiarPregunta: (valor: string) => void;
  respuesta: string;
  alCambiarRespuesta: (valor: string) => void;
  errores: ErroresPorCampo<CampoDeFaq>;
}) {
  return (
    <>
      <SelectorDeRolDestino
        alCambiar={alCambiarRol}
        error={errores.rolDestino}
        valor={rolDestino}
      />

      <SelectorDeCategoriaFaq
        alCambiar={alCambiarCategoria}
        error={errores.categoria}
        rol={rolDestino}
        valor={categoria}
      />

      <CampoDeArea
        alCambiar={alCambiarPregunta}
        error={errores.pregunta}
        etiqueta={MENSAJES_AYUDA.admin.preguntaCampo}
        filas={2}
        maxLength={200}
        placeholder={TEXTOS_GESTION_AYUDA.placeholderPregunta}
        valor={pregunta}
      />

      <CampoDeArea
        alCambiar={alCambiarRespuesta}
        error={errores.respuesta}
        etiqueta={MENSAJES_AYUDA.admin.respuestaCampo}
        filas={8}
        maxLength={1500}
        placeholder={TEXTOS_GESTION_AYUDA.placeholderRespuesta}
        valor={respuesta}
      />
    </>
  );
}
