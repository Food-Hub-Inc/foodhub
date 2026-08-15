import { useState, type FormEvent } from 'react';
import { FieldError, Label, TextArea, TextField } from '@heroui/react';
import {
  MENSAJES_USUARIO,
  suspenderUsuarioSchema,
  type UsuarioListado,
} from '@foodhub/shared';
import { suspenderUsuario } from '../../../api/usuarios.js';
import { Dialogo } from '../../../components/Dialogo.js';
import {
  errorGeneralDe,
  useOperacionDeUsuario,
} from '../../../hooks/useOperacionDeUsuario.js';
import { nombreCompleto } from '../../../lib/formato.js';
import { TEXTOS_USUARIOS } from '../../../lib/textos.js';
import {
  conErroresDeApi,
  erroresDeZod,
  type ErroresPorCampo,
} from './errores.js';
import { PieDeFormulario } from './PieDeFormulario.js';

/**
 * Suspensión de una cuenta — US-GURP-08.
 *
 * El motivo es obligatorio por criterio de aceptación ("solicite confirmación y
 * un motivo obligatorio de suspensión") y queda guardado en
 * `usuario.motivo_suspension`: sin él, el soporte no puede explicarle a la
 * persona por qué perdió el acceso.
 */

const CAMPOS = ['motivo'] as const;
type CampoDeSuspension = (typeof CAMPOS)[number];

export function DialogoDeSuspension({
  usuario,
  alCerrar,
}: {
  usuario: UsuarioListado;
  alCerrar: () => void;
}) {
  /**
   * Quien monta este diálogo lo hace con `key={usuario.id}`: elegir otra fila
   * lo desmonta y lo vuelve a montar, así que el motivo arranca vacío sin
   * necesidad de un efecto que lo limpie.
   */
  const [motivo, setMotivo] = useState('');
  const [erroresLocales, setErroresLocales] = useState<
    ErroresPorCampo<CampoDeSuspension>
  >({});

  const operacion = useOperacionDeUsuario({
    ejecutar: (variables: { id: string; motivo: string }) =>
      suspenderUsuario(variables.id, { motivo: variables.motivo }),
    mensajeExito: MENSAJES_USUARIO.usuarioSuspendido,
    alTerminar: alCerrar,
  });

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    const validacion = suspenderUsuarioSchema.safeParse({ motivo });
    if (!validacion.success) {
      setErroresLocales(erroresDeZod(validacion.error.issues, CAMPOS));
      return;
    }
    setErroresLocales({});
    operacion.mutate({ id: usuario.id, motivo: validacion.data.motivo });
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
          etiquetaConfirmar={TEXTOS_USUARIOS.accionSuspender}
        />
      }
      titulo={TEXTOS_USUARIOS.dialogoSuspensionTitulo}
    >
      {/* La acción destructiva nombra a quién afecta: es lo que separa
          "suspender una cuenta" de "suspender ESTA cuenta". */}
      <p className="text-body text-text-secondary">
        <span className="font-semibold text-text-primary">
          {nombreCompleto(usuario.nombre, usuario.apellido)}
        </span>{' '}
        ({usuario.email})
      </p>

      <TextField
        isInvalid={Boolean(errores.motivo)}
        isRequired
        onChange={setMotivo}
        value={motivo}
      >
        <Label>{TEXTOS_USUARIOS.motivo}</Label>
        <TextArea
          autoFocus
          className="w-full"
          placeholder={TEXTOS_USUARIOS.motivoPlaceholder}
          rows={4}
        />
        <FieldError>{errores.motivo}</FieldError>
      </TextField>
    </Dialogo>
  );
}
