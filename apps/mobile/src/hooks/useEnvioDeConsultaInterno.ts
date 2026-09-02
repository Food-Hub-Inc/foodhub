import { useCallback } from 'react';
import {
  enviarConsultaSchema,
  type EnviarConsultaInput,
} from '@foodhub/shared';
import { useFormulario, type Formulario } from './useFormulario';
import { useEnviarConsulta, useSubirAdjuntos } from './useSoporte';
import type { useSelectorDeAdjuntos } from './useSelectorDeAdjuntos';

/**
 * Valores de los campos del formulario "Contactar al soporte".
 *
 * Lleva una index signature a proposito: `useFormulario` tipa sus valores
 * con el constraint `Record<string, unknown>`, y una interface sin index
 * signature no lo satisface. Sin esto, el generic explicito `<ValoresConsulta, ...>`
 * falla en compilacion.
 */
export interface ValoresConsulta {
  tipoConsultaId: string;
  asunto: string;
  descripcion: string;
  adjuntos: unknown[];
  [clave: string]: unknown;
}

/**
 * Logica de envio del formulario "Contactar al soporte" (US-AYU-03).
 *
 * EL `useFormulario` ES LA UNICA FUENTE DE VERDAD. La UI NO mantiene
 * state propio de los campos: lee `valores` y modifica via `fijar*`.
 * Asi el formulario que valida es el mismo que se edita y nunca se
 * desincroniza (antes la UI editaba un `useState` del padre y validaba
 * un `useFormulario` interno separado, por eso un form lleno fallaba
 * con "Este campo es obligatorio").
 *
 * Los `fijar*` y `reiniciar` son ESTABLES (`useCallback` sobre
 * `formulario.fijar`/`formulario.reiniciar`, que a su vez lo son),
 * de modo que se pueden usar como dependencia de un `useEffect` sin
 * provocar bucles.
 */
export function useEnvioDeConsultaInterno({
  selector,
  alConfirmar,
  alExito,
  alError,
}: {
  selector: ReturnType<typeof useSelectorDeAdjuntos>;
  alConfirmar: () => void;
  alExito: () => void;
  alError: () => void;
}): {
  valores: ValoresConsulta;
  formulario: Formulario<ValoresConsulta, EnviarConsultaInput>;
  fijarTipoConsultaId: (v: string) => void;
  fijarAsunto: (v: string) => void;
  fijarDescripcion: (v: string) => void;
  reiniciar: () => void;
  intentarEnviar: () => void;
  enviarConsulta: () => void;
  errorSubidaAdjuntos: Error | null;
  errorEnvio: Error | null;
  enviando: boolean;
} {
  const formulario = useFormulario<ValoresConsulta, EnviarConsultaInput>(
    enviarConsultaSchema,
    { tipoConsultaId: '', asunto: '', descripcion: '', adjuntos: [] },
  );

  const fijadores = useFijarFormulario(formulario);

  const subir = useSubirAdjuntos();
  const enviar = useEnviarConsulta();

  const enviarConsulta = () => {
    const datos = formulario.datos;
    if (!datos) return;

    if (selector.estado.archivos.length === 0) {
      enviar.mutate(datos, {
        onSuccess: alExito,
        onError: alError,
      });
      return;
    }

    subir.mutate(selector.estado.archivos, {
      onSuccess: (subidos) => {
        enviar.mutate(
          { ...datos, adjuntos: subidos },
          { onSuccess: alExito, onError: alError },
        );
      },
      onError: alError,
    });
  };

  const intentarEnviar = () => {
    formulario.revelarErrores();
    if (!formulario.esValido) return;
    alConfirmar();
  };

  return {
    valores: formulario.valores,
    formulario,
    ...fijadores,
    intentarEnviar,
    enviarConsulta,
    errorSubidaAdjuntos: subir.error,
    errorEnvio: enviar.error,
    enviando: subir.isPending || enviar.isPending,
  };
}

/**
 * Setters estables por campo. Se extraen a un helper para que
 * `useEnvioDeConsultaInterno` quede por debajo del limite de lineas y
 * porque los cuatro repiten el mismo patron: envolver `formulario.fijar`
 * en un `useCallback` que no se recrea entre renders.
 */
function useFijarFormulario(
  formulario: Formulario<ValoresConsulta, EnviarConsultaInput>,
): {
  fijarTipoConsultaId: (v: string) => void;
  fijarAsunto: (v: string) => void;
  fijarDescripcion: (v: string) => void;
  reiniciar: () => void;
} {
  // `fijar` y `reiniciar` son funciones flecha estables (la interfaz las
  // declara como propiedades, no como metodos). Se desestructuran para que
  // `exhaustive-deps` vea una referencia estable en lugar del objeto
  // `formulario`, que se recrea en cada render y haria los `useCallback`
  // inestables (y a la larga un bucle en `useBorradorConFormulario`).
  const { fijar, reiniciar } = formulario;

  const fijarTipoConsultaId = useCallback(
    (v: string) => fijar('tipoConsultaId', v),
    [fijar],
  );
  const fijarAsunto = useCallback((v: string) => fijar('asunto', v), [fijar]);
  const fijarDescripcion = useCallback(
    (v: string) => fijar('descripcion', v),
    [fijar],
  );
  const reiniciarFormulario = useCallback(() => reiniciar(), [reiniciar]);

  return {
    fijarTipoConsultaId,
    fijarAsunto,
    fijarDescripcion,
    reiniciar: reiniciarFormulario,
  };
}
