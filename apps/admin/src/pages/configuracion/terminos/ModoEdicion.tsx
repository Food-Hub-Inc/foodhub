import { useState } from 'react';
import type { UseMutationResult } from '@tanstack/react-query';
import { mensajeDeError } from '../../../lib/api.js';
import { DialogoConfirmarPublicar } from './DialogoConfirmarPublicar.js';
import { VistaEdicion } from './VistaEdicion.js';

/**
 * Bloque "editar" de una sección de PAN-ADM-04 (US-CFG-04): el editor más el
 * diálogo de confirmación de "Publicar nueva versión". Se extrae de
 * `SeccionTerminos.tsx` únicamente para no superar el límite de líneas por
 * función; el estado (`contenido`, `confirmarPublicarAbierto`) es propio de
 * este modo y no necesita vivir más arriba.
 */
export function ModoEdicion({
  contenidoInicial,
  esBorradorPropio,
  guardarBorrador,
  publicar,
  alTerminar,
  alCancelar,
}: {
  contenidoInicial: string;
  esBorradorPropio: boolean;
  guardarBorrador: UseMutationResult<unknown, unknown, string>;
  publicar: UseMutationResult<unknown, unknown, string>;
  alTerminar: () => void;
  alCancelar: () => void;
}) {
  const [contenido, setContenido] = useState(contenidoInicial);
  const [confirmarPublicarAbierto, setConfirmarPublicarAbierto] =
    useState(false);

  return (
    <>
      <VistaEdicion
        alCambiar={setContenido}
        alCancelar={alCancelar}
        alGuardarBorrador={() => {
          guardarBorrador.mutate(contenido);
        }}
        alPublicar={() => {
          setConfirmarPublicarAbierto(true);
        }}
        contenidoActual={contenido}
        contenidoInicial={contenidoInicial}
        esBorradorPropio={esBorradorPropio}
        guardandoBorrador={guardarBorrador.isPending}
      />

      {confirmarPublicarAbierto ? (
        <DialogoConfirmarPublicar
          alCerrar={() => {
            setConfirmarPublicarAbierto(false);
          }}
          alConfirmar={() => {
            publicar.mutate(contenido, { onSuccess: alTerminar });
          }}
          enProceso={publicar.isPending}
          error={publicar.error ? mensajeDeError(publicar.error) : null}
        />
      ) : null}
    </>
  );
}
