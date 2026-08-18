import { Button } from '@heroui/react';
import { MENSAJES_CONFIGURACION } from '@foodhub/shared';
import { TEXTOS_FORMULARIO, TEXTOS_PARAMETROS } from '../../../lib/textos.js';
import { DialogoConfirmacionSimple } from './DialogoConfirmacionSimple.js';

/**
 * Pie de cada sección de PAN-ADM-04 (parámetros generales): "Restaurar
 * valores por defecto" a la izquierda, "Guardar cambios" a la derecha, cada
 * uno con su propia ventana de confirmación (US-CFG-03). Las cuatro
 * secciones comparten este comportamiento; lo que cambia son los campos,
 * que renderiza cada `Seccion*.tsx`.
 *
 * El diálogo abierto es estado del padre (`Seccion*.tsx`) y no de este
 * componente: la mutación que confirma "Guardar" o "Restaurar" necesita
 * poder cerrarlo al terminar, igual que `DialogosDeCategorias.tsx` cierra
 * sus diálogos desde `alTerminar`.
 */
export function BotonesDeSeccion({
  formularioValido,
  dialogoAbierto,
  alAbrirGuardar,
  alAbrirRestaurar,
  alCerrarDialogo,
  guardando,
  restaurando,
  errorGuardar,
  errorRestaurar,
  alConfirmarGuardar,
  alConfirmarRestaurar,
}: {
  formularioValido: boolean;
  dialogoAbierto: 'guardar' | 'restaurar' | null;
  alAbrirGuardar: () => void;
  alAbrirRestaurar: () => void;
  alCerrarDialogo: () => void;
  guardando: boolean;
  restaurando: boolean;
  errorGuardar: string | null;
  errorRestaurar: string | null;
  alConfirmarGuardar: () => void;
  alConfirmarRestaurar: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between border-t border-border pt-4">
        <Button onPress={alAbrirRestaurar} type="button" variant="tertiary">
          {TEXTOS_PARAMETROS.restaurar}
        </Button>

        <Button
          isDisabled={!formularioValido}
          onPress={alAbrirGuardar}
          type="button"
        >
          {TEXTOS_FORMULARIO.guardar}
        </Button>
      </div>

      {dialogoAbierto === 'guardar' ? (
        <DialogoConfirmacionSimple
          alCerrar={alCerrarDialogo}
          alConfirmar={alConfirmarGuardar}
          enProceso={guardando}
          error={errorGuardar}
          etiquetaCancelar={TEXTOS_FORMULARIO.noVolver}
          etiquetaConfirmar={TEXTOS_PARAMETROS.confirmarGuardarSi}
          mensaje={MENSAJES_CONFIGURACION.confirmarGuardarParametros}
          titulo={TEXTOS_PARAMETROS.dialogoGuardarTitulo}
        />
      ) : null}

      {dialogoAbierto === 'restaurar' ? (
        <DialogoConfirmacionSimple
          alCerrar={alCerrarDialogo}
          alConfirmar={alConfirmarRestaurar}
          enProceso={restaurando}
          error={errorRestaurar}
          etiquetaConfirmar={TEXTOS_PARAMETROS.confirmarRestaurarSi}
          mensaje={MENSAJES_CONFIGURACION.confirmarRestaurarParametros}
          titulo={TEXTOS_PARAMETROS.dialogoRestaurarTitulo}
        />
      ) : null}
    </>
  );
}
