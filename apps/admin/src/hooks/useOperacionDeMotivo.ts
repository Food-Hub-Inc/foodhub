import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@heroui/react';
import { ErrorApi, mensajeDeError } from '../lib/api.js';

/**
 * Cualquiera de las operaciones de PAN-ADM-04 sobre un motivo de
 * cancelación — mismo patrón que `useOperacionDeCategoria` (US-CFG-02).
 */
export function useOperacionDeMotivo<TVariables>({
  ejecutar,
  mensajeExito,
  alTerminar,
}: {
  ejecutar: (variables: TVariables) => Promise<unknown>;
  mensajeExito: string;
  alTerminar: () => void;
}) {
  const clienteDeConsultas = useQueryClient();

  return useMutation({
    mutationFn: ejecutar,
    onSuccess: () => {
      void clienteDeConsultas.invalidateQueries({
        queryKey: ['motivos-cancelacion'],
      });
      toast.success(mensajeExito);
      alTerminar();
    },
  });
}

export function errorGeneralDe(error: unknown): string | null {
  if (error == null) return null;
  if (error instanceof ErrorApi && error.campos.length > 0) return null;
  return mensajeDeError(error);
}
