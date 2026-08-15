import { Button } from '@heroui/react';
import { mensajeDeError } from '../../lib/api.js';
import { TEXTOS_ESTADO } from '../../lib/textos.js';
import { IconoAlerta, IconoReintentar } from '../iconos/index.js';

/**
 * Estado de ERROR de una pantalla con datos.
 *
 * Muestra el mensaje que redactó el servidor —nunca un stack trace ni un
 * código HTTP pelado— y ofrece reintentar. `mensajeDeError` se encarga de que
 * una excepción inesperada caiga en el texto genérico de `MENSAJES_ERROR`, de
 * modo que el usuario jamás vea detalle técnico (requisito del módulo de
 * seguridad, alcance 2.2.2.2.1).
 *
 * `role="alert"` hace que el lector de pantalla lo anuncie apenas aparece: si
 * la tabla queda vacía por un fallo, quien no ve la pantalla se entera igual.
 */
export function EstadoError({
  error,
  alReintentar,
}: {
  error: unknown;
  alReintentar: () => void;
}) {
  return (
    <div
      className="aparece flex flex-col items-center justify-center gap-4 px-6 py-16 text-center"
      role="alert"
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-error/10 text-error">
        <IconoAlerta className="size-7" />
      </span>

      <div className="space-y-1">
        <h2 className="text-h3 font-bold text-text-primary">
          {TEXTOS_ESTADO.errorTitulo}
        </h2>
        <p className="max-w-md text-body text-text-secondary">
          {mensajeDeError(error)}
        </p>
      </div>

      <Button onPress={alReintentar} size="sm" variant="secondary">
        <IconoReintentar className="size-4" />
        {TEXTOS_ESTADO.reintentar}
      </Button>
    </div>
  );
}
