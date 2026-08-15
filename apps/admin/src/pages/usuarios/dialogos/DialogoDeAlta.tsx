import { useState, type FormEvent } from 'react';
import { crearUsuarioPanelSchema } from '@foodhub/shared';
import { crearUsuario } from '../../../api/usuarios.js';
import { Dialogo } from '../../../components/Dialogo.js';
import { IconoInformacion } from '../../../components/iconos/index.js';
import {
  errorGeneralDe,
  useOperacionDeUsuario,
} from '../../../hooks/useOperacionDeUsuario.js';
import { TEXTOS_FORMULARIO, TEXTOS_USUARIOS } from '../../../lib/textos.js';
import { CampoDeTexto } from './CampoDeTexto.js';
import { CamposDeNombre } from './CamposDeUsuario.js';
import {
  conErroresDeApi,
  erroresDeZod,
  type ErroresPorCampo,
} from './errores.js';
import { PieDeFormulario } from './PieDeFormulario.js';
import { SelectorDeRol } from './SelectorDeRol.js';
import type { RolDelPanel } from './roles.js';

/**
 * Alta de usuario desde el panel — US-GURP-06.
 *
 * NO HAY CAMPO DE CONTRASEÑA, y no es un descuido: la API crea la cuenta con
 * `inviteUserByEmail` y la persona define su propia credencial desde el enlace
 * que recibe por correo. El administrador nunca conoce una contraseña ajena.
 */
const CAMPOS = ['nombre', 'apellido', 'email', 'tipo'] as const;
type CampoDeAlta = (typeof CAMPOS)[number];

const FORMULARIO_VACIO = {
  nombre: '',
  apellido: '',
  email: '',
  tipo: 'CLIENTE' as RolDelPanel,
};

export function DialogoDeAlta({ alCerrar }: { alCerrar: () => void }) {
  const [datos, setDatos] = useState(FORMULARIO_VACIO);
  const [erroresLocales, setErroresLocales] = useState<
    ErroresPorCampo<CampoDeAlta>
  >({});

  const operacion = useOperacionDeUsuario({
    ejecutar: crearUsuario,
    mensajeExito: TEXTOS_USUARIOS.avisoUsuarioCreado,
    alTerminar: alCerrar,
  });

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    // El mismo schema que aplica la API. Validar antes evita una ida y vuelta
    // por la red para decir que falta un apellido.
    const validacion = crearUsuarioPanelSchema.safeParse(datos);
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
          etiquetaConfirmar={TEXTOS_FORMULARIO.crear}
        />
      }
      titulo={TEXTOS_USUARIOS.dialogoAltaTitulo}
    >
      <CamposDeNombre
        alCambiarApellido={(apellido) => {
          setDatos((previo) => ({ ...previo, apellido }));
        }}
        alCambiarNombre={(nombre) => {
          setDatos((previo) => ({ ...previo, nombre }));
        }}
        apellido={datos.apellido}
        errores={errores}
        nombre={datos.nombre}
      />

      <CampoDeTexto
        alCambiar={(email) => {
          setDatos((previo) => ({ ...previo, email }));
        }}
        error={errores.email}
        etiqueta={TEXTOS_FORMULARIO.correo}
        tipo="email"
        valor={datos.email}
      />

      <SelectorDeRol
        alCambiar={(tipo) => {
          setDatos((previo) => ({ ...previo, tipo }));
        }}
        error={errores.tipo}
        etiqueta={TEXTOS_FORMULARIO.rol}
        valor={datos.tipo}
      />

      <p className="flex gap-2 rounded-sm bg-background p-3 text-caption text-text-secondary">
        <IconoInformacion className="size-4 shrink-0 text-text-disabled" />
        <span>{TEXTOS_USUARIOS.dialogoAltaAyuda}</span>
      </p>
    </Dialogo>
  );
}
