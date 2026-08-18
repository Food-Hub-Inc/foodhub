import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@heroui/react';
import { ErrorApi, mensajeDeError } from '../lib/api.js';

/**
 * Cualquiera de las operaciones de PAN-ADM-04 sobre una categoría — mismo
 * patrón que `useOperacionDeUsuario` en el módulo de usuarios (US-CFG-01).
 */
export function useOperacionDeCategoria<TVariables>({
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
      void clienteDeConsultas.invalidateQueries({ queryKey: ['categorias'] });
      toast.success(mensajeExito);
      alTerminar();
    },
  });
}

/** Igual que en `useOperacionDeUsuario`: null cuando el fallo es de campo. */
export function errorGeneralDe(error: unknown): string | null {
  if (error == null) return null;
  if (error instanceof ErrorApi && error.campos.length > 0) return null;
  return mensajeDeError(error);
}
