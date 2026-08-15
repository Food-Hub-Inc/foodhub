import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@heroui/react';
import { ErrorApi, mensajeDeError } from '../lib/api.js';

/**
 * Cualquiera de las operaciones de PAN-ADM-01 sobre una cuenta.
 *
 * Las cinco (alta, edición, suspensión, rehabilitación y baja) comparten
 * exactamente el mismo cierre: si sale bien, se refresca el listado, se
 * confirma con un aviso y se cierra el diálogo; si sale mal, el error queda a
 * la vista dentro del diálogo y nada se cierra, para que el administrador
 * pueda corregir sin volver a cargar todo.
 *
 * Tenerlo en un solo lugar evita cinco copias de la misma secuencia que se
 * desincronizan a la primera corrección.
 */
export function useOperacionDeUsuario<TVariables>({
  ejecutar,
  mensajeExito,
  alTerminar,
}: {
  ejecutar: (variables: TVariables) => Promise<unknown>;
  /** Literal de `MENSAJES_USUARIO` que confirma la operación. */
  mensajeExito: string;
  alTerminar: () => void;
}) {
  const clienteDeConsultas = useQueryClient();

  return useMutation({
    mutationFn: ejecutar,
    onSuccess: () => {
      /**
       * Se invalida el prefijo entero y no una clave puntual: el listado está
       * cacheado por combinación de filtros y página, y una suspensión puede
       * sacar a la persona de la vista actual y meterla en otra.
       */
      void clienteDeConsultas.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success(mensajeExito);
      alTerminar();
    },
  });
}

/**
 * Mensaje general de una operación fallida, o `null` si el fallo fue de
 * validación de campos: en ese caso el detalle se muestra debajo de cada input
 * y repetirlo arriba es ruido.
 */
export function errorGeneralDe(error: unknown): string | null {
  if (error == null) return null;
  if (error instanceof ErrorApi && error.campos.length > 0) return null;
  return mensajeDeError(error);
}
