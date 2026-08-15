import { Button, Spinner } from '@heroui/react';
import { TEXTOS_FORMULARIO } from '../../../lib/textos.js';

/**
 * Pie común de los diálogos de PAN-ADM-01: cancelar a la izquierda, confirmar
 * a la derecha.
 *
 * La posición es siempre la misma en todo el panel (principio de consistencia
 * de la guía de UX): quien ya suspendió una cuenta sabe dónde está el botón
 * antes de leerlo.
 *
 * Mientras la operación está en curso los dos botones quedan deshabilitados:
 * un doble clic en "Dar de baja" mandaría dos bajas, y la segunda fallaría con
 * un error que no explica nada.
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
