import type { FormEvent } from 'react';
import { Button, Spinner } from '@heroui/react';
import { Dialogo } from '../../components/Dialogo.js';
import { TEXTOS_FORMULARIO, TEXTOS_MODERACION } from '../../lib/textos.js';

/**
 * Confirmación de las dos ramas de RF086.
 *
 * SE CONFIRMAN LAS DOS Y NO SOLO LA DESTRUCTIVA. Ocultar una reseña la saca de
 * dos promedios; dejarla visible cierra los reportes y la saca de la bandeja
 * para siempre. Ninguna de las dos se deshace desde el panel, así que pedir
 * confirmación solo en una invitaría a apurar la otra.
 */
export function DialogoDeResolucion({
  peticion,
  pendiente,
  error,
  alConfirmar,
  alCancelar,
}: {
  /** Qué se está por hacer y sobre cuál reseña. `null` cierra el diálogo. */
  peticion: { resenaId: string; aprobar: boolean } | null;
  pendiente: boolean;
  error: string | null;
  alConfirmar: () => void;
  alCancelar: () => void;
}) {
  if (peticion === null) return null;

  const oculta = peticion.aprobar;

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    alConfirmar();
  }

  return (
    <Dialogo
      abierto
      alCambiarApertura={(estaAbierto) => {
        if (!estaAbierto) alCancelar();
      }}
      alEnviar={enviar}
      error={error}
      pie={
        <>
          <Button
            isDisabled={pendiente}
            onPress={alCancelar}
            type="button"
            variant="tertiary"
          >
            {TEXTOS_MODERACION.cancelar}
          </Button>

          <Button
            isDisabled={pendiente}
            type="submit"
            variant={oculta ? 'danger' : 'primary'}
          >
            {pendiente ? <Spinner className="size-4" /> : null}
            {pendiente
              ? TEXTOS_FORMULARIO.guardando
              : TEXTOS_MODERACION.confirmar}
          </Button>
        </>
      }
      titulo={
        oculta
          ? TEXTOS_MODERACION.confirmarOcultarTitulo
          : TEXTOS_MODERACION.confirmarMantenerTitulo
      }
    >
      <p
        className={
          oculta
            ? 'rounded-sm bg-error/8 p-3 text-body text-text-secondary'
            : 'rounded-sm bg-background p-3 text-body text-text-secondary'
        }
      >
        {oculta
          ? TEXTOS_MODERACION.confirmarOcultar
          : TEXTOS_MODERACION.confirmarMantener}
      </p>
    </Dialogo>
  );
}
