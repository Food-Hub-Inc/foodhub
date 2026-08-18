import { Button, Spinner } from '@heroui/react';
import { TEXTOS_FORMULARIO } from '../../../lib/textos.js';

/**
 * Copia de `categorias/dialogos/PieDeFormulario.tsx` para el módulo de
 * términos y condiciones.
 */
export function PieDeFormulario({
  etiquetaConfirmar,
  etiquetaCancelar = TEXTOS_FORMULARIO.cancelar,
  enProceso,
  alCancelar,
  destructivo = false,
}: {
  etiquetaConfirmar: string;
  etiquetaCancelar?: string | undefined;
  enProceso: boolean;
  alCancelar: () => void;
  destructivo?: boolean;
}) {
  return (
    <>
      <Button
        isDisabled={enProceso}
        onPress={alCancelar}
        type="button"
        variant="tertiary"
      >
        {etiquetaCancelar}
      </Button>

      <Button
        isDisabled={enProceso}
        type="submit"
        variant={destructivo ? 'danger' : 'primary'}
      >
        {enProceso ? <Spinner className="size-4" /> : null}
        {enProceso ? TEXTOS_FORMULARIO.guardando : etiquetaConfirmar}
      </Button>
    </>
  );
}
