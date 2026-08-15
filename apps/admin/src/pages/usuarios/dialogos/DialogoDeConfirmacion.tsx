import type { FormEvent } from 'react';
import type { UsuarioListado } from '@foodhub/shared';
import { Dialogo } from '../../../components/Dialogo.js';
import { nombreCompleto } from '../../../lib/formato.js';
import { PieDeFormulario } from './PieDeFormulario.js';

/**
 * Confirmación de una operación sin datos que cargar: la baja de una cuenta
 * (US-GURP-09) y el levantamiento de una suspensión (US-GURP-08).
 *
 * Las dos comparten forma —una advertencia y dos botones— y solo cambian el
 * texto y el tono, así que comparten componente. Lo que NO comparten con el
 * resto del panel es la obligación de nombrar a quién afectan: una acción
 * destructiva que no dice sobre qué opera es una trampa.
 */
export function DialogoDeConfirmacion({
  usuario,
  titulo,
  advertencia,
  etiquetaConfirmar,
  destructivo = false,
  enProceso,
  error,
  alConfirmar,
  alCerrar,
}: {
  usuario: UsuarioListado;
  titulo: string;
  advertencia: string;
  etiquetaConfirmar: string;
  destructivo?: boolean;
  enProceso: boolean;
  error: string | null;
  alConfirmar: () => void;
  alCerrar: () => void;
}) {
  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    alConfirmar();
  }

  return (
    <Dialogo
      abierto
      alCambiarApertura={(estaAbierto) => {
        if (!estaAbierto) alCerrar();
      }}
      alEnviar={enviar}
      error={error}
      pie={
        <PieDeFormulario
          alCancelar={alCerrar}
          destructivo={destructivo}
          enProceso={enProceso}
          etiquetaConfirmar={etiquetaConfirmar}
        />
      }
      titulo={titulo}
    >
      <p className="text-body text-text-secondary">
        <span className="font-semibold text-text-primary">
          {nombreCompleto(usuario.nombre, usuario.apellido)}
        </span>{' '}
        ({usuario.email})
      </p>

      <p
        className={
          destructivo
            ? 'rounded-sm bg-error/8 p-3 text-body text-text-secondary'
            : 'rounded-sm bg-background p-3 text-body text-text-secondary'
        }
      >
        {advertencia}
      </p>
    </Dialogo>
  );
}
