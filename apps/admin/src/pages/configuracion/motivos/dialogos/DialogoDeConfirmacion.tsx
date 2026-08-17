import type { FormEvent } from 'react';
import type { MotivoCancelacionListado } from '@foodhub/shared';
import { Dialogo } from '../../../../components/Dialogo.js';
import { PieDeFormulario } from './PieDeFormulario.js';

/**
 * Confirmación de deshabilitar un motivo (US-CFG-02). Copia tipada de
 * `categorias/dialogos/DialogoDeConfirmacion.tsx`.
 */
export function DialogoDeConfirmacion({
  motivo,
  titulo,
  advertencia,
  etiquetaConfirmar,
  enProceso,
  error,
  alConfirmar,
  alCerrar,
}: {
  motivo: MotivoCancelacionListado;
  titulo: string;
  advertencia: string;
  etiquetaConfirmar: string;
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
          destructivo
          enProceso={enProceso}
          etiquetaConfirmar={etiquetaConfirmar}
        />
      }
      titulo={titulo}
    >
      <p className="text-body text-text-secondary">
        <span className="font-semibold text-text-primary">{motivo.nombre}</span>
      </p>

      <p className="rounded-sm bg-error/8 p-3 text-body text-text-secondary">
        {advertencia}
      </p>
    </Dialogo>
  );
}
