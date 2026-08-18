import type { Faq } from '@foodhub/shared';
import { useEffect } from 'react';
import { create } from 'zustand';
import {
  useMutation,
  useQuery,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { listarFaqs, votarFaq } from '../api/soporte';
import { useSesion } from './useSesion';

export const CLAVE_FAQS = ['soporte', 'faqs'] as const;

/** FAQs consultadas para la sesión actual. */
export function useFaqs(): UseQueryResult<Faq[], Error> {
  const sesion = useSesion((estado) => estado.sesion);
  const usuarioId = sesion?.user.id;

  useEffect(() => {
    if (usuarioId !== undefined) {
      useFaqsVotadas.getState().prepararPara(usuarioId);
    }
  }, [usuarioId]);

  return useQuery({
    queryKey: [...CLAVE_FAQS, usuarioId],
    queryFn: listarFaqs,
    enabled: sesion !== null,
    staleTime: 5 * 60_000,
  });
}

interface EstadoFaqsVotadas {
  readonly usuarioId: string | null;
  readonly ids: ReadonlySet<string>;
  readonly prepararPara: (usuarioId: string) => void;
  readonly marcar: (id: string) => void;
}

/**
 * El modelo V5 conserva contadores y no una fila por usuario. Este store evita
 * el doble voto mientras dura la sesión sin agregar una dependencia nativa ni
 * alterar el diagrama de datos.
 */
export const useFaqsVotadas = create<EstadoFaqsVotadas>((set) => ({
  usuarioId: null,
  ids: new Set<string>(),
  prepararPara: (usuarioId) => {
    set((estado) =>
      estado.usuarioId === usuarioId
        ? estado
        : { usuarioId, ids: new Set<string>() },
    );
  },
  marcar: (id) => {
    set((estado) => {
      const ids = new Set(estado.ids);
      ids.add(id);
      return { ids };
    });
  },
}));

/** US-AYU-02 · Mutación de voto y confirmación local de la acción. */
export function useVotarFaq(): UseMutationResult<
  void,
  Error,
  { id: string; util: boolean }
> {
  return useMutation({
    mutationFn: ({ id, util }) => votarFaq(id, { util }),
    onSuccess: (_respuesta, variables) => {
      useFaqsVotadas.getState().marcar(variables.id);
    },
  });
}
