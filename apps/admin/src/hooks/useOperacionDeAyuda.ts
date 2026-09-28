import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@heroui/react';
import { ErrorApi, mensajeDeError } from '../lib/api.js';

/**
 * Cualquiera de las operaciones de US-AYU-05 sobre el contenido de ayuda.
 * Mismo patrón que `useOperacionDeMotivo`.
 *
 * Invalida las dos listas del módulo: una edicion de capitulo no cambia las
 * FAQ, pero el costo de refrescar ambas es despreciable y evita que una accion
 * futura se olvide de declarar la suya.
 */
export function useOperacionDeAyuda<TVariables>({
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
        queryKey: ['ayuda-capitulos'],
      });
      void clienteDeConsultas.invalidateQueries({
        queryKey: ['ayuda-capitulo'],
      });
      void clienteDeConsultas.invalidateQueries({ queryKey: ['ayuda-faqs'] });
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
