import { Button, Spinner } from '@heroui/react';
import { TEXTOS_FORMULARIO } from '../../../../lib/textos.js';

/**
 * Copia de `pages/usuarios/dialogos/PieDeFormulario.tsx` para el módulo de
 * categorías. Ver nota de duplicación en `Categorias.tsx`.
 */
export function PieDeFormulario({
  etiquetaConfirmar,
  enProceso,
  alCancelar,
  destructivo = false,
}: {
  etiquetaConfirmar: string;
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
        {TEXTOS_FORMULARIO.cancelar}
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
