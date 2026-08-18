import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@heroui/react';
import {
  MENSAJES_CONFIGURACION,
  type TipoVersionTerminos,
} from '@foodhub/shared';
import {
  claveEstadoTerminos,
  guardarBorradorTerminos,
  publicarVersionTerminos,
} from '../../../api/terminos.js';

/** Las dos mutaciones de una sección de PAN-ADM-04 (US-CFG-04): guardar borrador y publicar. */
export function useOperacionesTerminos(tipo: TipoVersionTerminos) {
  const clienteDeConsultas = useQueryClient();

  function invalidarEstado() {
    void clienteDeConsultas.invalidateQueries({
      queryKey: claveEstadoTerminos(tipo),
    });
  }

  const guardarBorrador = useMutation({
    mutationFn: (html: string) => guardarBorradorTerminos(tipo, html),
    onSuccess: () => {
      invalidarEstado();
      toast.success(MENSAJES_CONFIGURACION.borradorGuardado);
    },
  });

  const publicar = useMutation({
    mutationFn: (html: string) => publicarVersionTerminos(tipo, html),
    onSuccess: () => {
      invalidarEstado();
      toast.success(MENSAJES_CONFIGURACION.versionPublicada);
    },
  });

  return { guardarBorrador, publicar };
}
