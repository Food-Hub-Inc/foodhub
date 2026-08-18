import type { FormEvent } from 'react';
import { MENSAJES_CONFIGURACION } from '@foodhub/shared';
import { Dialogo } from '../../../components/Dialogo.js';
import { TEXTOS_FORMULARIO, TEXTOS_TERMINOS } from '../../../lib/textos.js';
import { PieDeFormulario } from './PieDeFormulario.js';

/**
 * Confirmación de "Publicar nueva versión" (US-CFG-04, RF058): el literal
 * completo va en el cuerpo, los botones "Sí, publicar" / "No, volver" son
 * también literales del criterio de aceptación.
 */
export function DialogoConfirmarPublicar({
  enProceso,
  error,
  alConfirmar,
  alCerrar,
}: {
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
          enProceso={enProceso}
          etiquetaCancelar={TEXTOS_FORMULARIO.noVolver}
          etiquetaConfirmar={MENSAJES_CONFIGURACION.confirmarPublicarSi}
        />
      }
      titulo={TEXTOS_TERMINOS.dialogoPublicarTitulo}
    >
      <p className="rounded-sm bg-background p-3 text-body text-text-secondary">
        {MENSAJES_CONFIGURACION.confirmarPublicarTerminos}
      </p>
    </Dialogo>
  );
}
