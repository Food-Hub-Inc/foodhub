import { useState, type FormEvent } from 'react';
import {
  editarUsuarioPanelSchema,
  type EditarUsuarioPanelInput,
  type UsuarioListado,
} from '@foodhub/shared';
import { editarUsuario } from '../../../api/usuarios.js';
import { Dialogo } from '../../../components/Dialogo.js';
import {
  errorGeneralDe,
  useOperacionDeUsuario,
} from '../../../hooks/useOperacionDeUsuario.js';
import { TEXTOS_FORMULARIO, TEXTOS_USUARIOS } from '../../../lib/textos.js';
import { CamposDeNombre, CorreoNoEditable } from './CamposDeUsuario.js';
import {
  conErroresDeApi,
  erroresDeZod,
  type ErroresPorCampo,
} from './errores.js';
import { PieDeFormulario } from './PieDeFormulario.js';
import { SelectorDeRol } from './SelectorDeRol.js';
import type { RolDelPanel } from './roles.js';

/**
 * Edición de datos administrativos y rol — US-GURP-07.
 *
 * Si el cambio de rol dejaría al sistema sin administradores activos, la API
 * responde `409 ULTIMO_ADMINISTRADOR` y el mensaje aparece arriba del
 * formulario. Esa verificación NO se replica acá: depende del estado de la base
 * y solo el servidor puede hacerla dentro de la misma transacción que escribe.
 */
const CAMPOS = ['nombre', 'apellido', 'tipo'] as const;
type CampoDeEdicion = (typeof CAMPOS)[number];

export function DialogoDeEdicion({
  usuario,
  alCerrar,
}: {
  usuario: UsuarioListado;
  alCerrar: () => void;
}) {
  /**
   * El estado se inicializa desde la fila y no se sincroniza después.
   *
   * Quien monta este diálogo lo hace con `key={usuario.id}`: al elegir otra
   * fila React desmonta y vuelve a montar, y el formulario arranca con los
   * datos correctos sin un efecto que copie props a estado. Es el patrón que
   * recomienda React para "resetear estado cuando cambia una prop".
   */
  const [nombre, setNombre] = useState(usuario.nombre);
  const [apellido, setApellido] = useState(usuario.apellido);
  const [tipo, setTipo] = useState<RolDelPanel>(
    usuario.tipo === 'ADMINISTRADOR' ? 'ADMINISTRADOR' : 'CLIENTE',
  );
  const [erroresLocales, setErroresLocales] = useState<
    ErroresPorCampo<CampoDeEdicion>
  >({});

  const operacion = useOperacionDeUsuario({
    ejecutar: (variables: { id: string; datos: EditarUsuarioPanelInput }) =>
      editarUsuario(variables.id, variables.datos),
    mensajeExito: TEXTOS_USUARIOS.avisoUsuarioEditado,
    alTerminar: alCerrar,
  });

  /**
   * A un cocinero no se le puede cambiar el rol desde el panel:
   * `editarUsuarioPanelSchema` solo admite CLIENTE y ADMINISTRADOR, porque el
   * rol de cocinero exige una ubicación que solo el dispositivo puede dar.
   */
  const esCocinero = usuario.tipo === 'COCINERO';

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    /**
     * Sobre un cocinero se manda SOLO nombre y apellido. Incluir `tipo` lo
     * convertiría en cliente sin que nadie lo hubiera pedido: el selector no
     * está en pantalla, pero su estado inicial existe igual.
     */
    const cambios = esCocinero
      ? { nombre, apellido }
      : { nombre, apellido, tipo };

    const validacion = editarUsuarioPanelSchema.safeParse(cambios);
    if (!validacion.success) {
      setErroresLocales(erroresDeZod(validacion.error.issues, CAMPOS));
      return;
    }
    setErroresLocales({});
    operacion.mutate({ id: usuario.id, datos: validacion.data });
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
      titulo={TEXTOS_USUARIOS.dialogoEdicionTitulo}
    >
      <CamposDeNombre
        alCambiarApellido={setApellido}
        alCambiarNombre={setNombre}
        apellido={apellido}
        errores={errores}
        nombre={nombre}
      />

      <CorreoNoEditable correo={usuario.email} />

      {esCocinero ? null : (
        <SelectorDeRol
          alCambiar={setTipo}
          error={errores.tipo}
          etiqueta={TEXTOS_FORMULARIO.rol}
          valor={tipo}
        />
      )}
    </Dialogo>
  );
}
