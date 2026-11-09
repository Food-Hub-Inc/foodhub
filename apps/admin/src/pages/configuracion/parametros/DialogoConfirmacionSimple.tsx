import type { FormEvent } from 'react';
import { Dialogo } from '../../../components/Dialogo.js';
import { PieDeFormulario } from './PieDeFormulario.js';

/**
 * Confirmación de una operación sin una entidad concreta que nombrar: las
 * dos acciones de una sección de parámetros generales, "Guardar cambios" y
 * "Restaurar valores por defecto" (US-CFG-03). A diferencia de
 * `DialogoDeConfirmacion` de categorías o motivos, no recibe una fila.
 */
export function DialogoConfirmacionSimple({
  titulo,
  mensaje,
  etiquetaConfirmar,
  etiquetaCancelar,
  enProceso,
  error,
  alConfirmar,
  alCerrar,
}: {
  titulo: string;
  mensaje: string;
  etiquetaConfirmar: string;
  etiquetaCancelar?: string | undefined;
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
          etiquetaCancelar={etiquetaCancelar}
          etiquetaConfirmar={etiquetaConfirmar}
        />
      }
      titulo={titulo}
    >
      <p className="rounded-sm bg-background p-3 text-body text-text-secondary">
        {mensaje}
      </p>
    </Dialogo>
  );
}
