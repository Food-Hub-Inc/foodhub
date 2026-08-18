import type { FormEvent } from 'react';
import type { CategoriaListado } from '@foodhub/shared';
import { Dialogo } from '../../../../components/Dialogo.js';
import { PieDeFormulario } from './PieDeFormulario.js';

/**
 * Confirmación de una operación sin datos que cargar sobre una categoría:
 * deshabilitar (US-CFG-01) y eliminar físicamente. Copia tipada de
 * `pages/usuarios/dialogos/DialogoDeConfirmacion.tsx`.
 */
export function DialogoDeConfirmacion({
  categoria,
  titulo,
  advertencia,
  etiquetaConfirmar,
  etiquetaCancelar,
  destructivo = false,
  enProceso,
  error,
  alConfirmar,
  alCerrar,
}: {
  categoria: CategoriaListado;
  titulo: string;
  advertencia: string;
  etiquetaConfirmar: string;
  etiquetaCancelar?: string | undefined;
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
          etiquetaCancelar={etiquetaCancelar}
          etiquetaConfirmar={etiquetaConfirmar}
        />
      }
      titulo={titulo}
    >
      <p className="text-body text-text-secondary">
        <span className="font-semibold text-text-primary">
          {categoria.nombre}
        </span>
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
