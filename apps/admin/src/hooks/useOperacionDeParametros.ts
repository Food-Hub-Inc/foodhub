import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@heroui/react';
import { CLAVE_PARAMETROS_SISTEMA } from '../api/parametrosSistema.js';
import { ErrorApi, mensajeDeError } from '../lib/api.js';

/**
 * Cualquiera de las operaciones de PAN-ADM-04 sobre una sección de
 * parámetros generales — mismo patrón que `useOperacionDeCategoria`
 * (US-CFG-03).
 */
export function useOperacionDeParametros<TDatos, TResultado>({
  ejecutar,
  mensajeExito,
  alTerminar,
}: {
  ejecutar: (datos: TDatos) => Promise<TResultado>;
  mensajeExito: string;
  alTerminar: (resultado: TResultado) => void;
}) {
  const clienteDeConsultas = useQueryClient();

  return useMutation({
    mutationFn: ejecutar,
    onSuccess: (resultado) => {
      void clienteDeConsultas.invalidateQueries({
        queryKey: CLAVE_PARAMETROS_SISTEMA,
      });
      toast.success(mensajeExito);
      alTerminar(resultado);
    },
  });
}

export function errorGeneralDe(error: unknown): string | null {
  if (error == null) return null;
  if (error instanceof ErrorApi && error.campos.length > 0) return null;
  return mensajeDeError(error);
}
