import type { Faq, VotoFaqInput } from '@foodhub/shared';
import { api } from '../lib/api';

/** US-AYU-02 · FAQs activas del rol autenticado. */
export function listarFaqs(): Promise<Faq[]> {
  return api.obtener<Faq[]>('/soporte/faqs');
}

/** US-AYU-02 · Registra la valoración de una respuesta. */
export function votarFaq(id: string, datos: VotoFaqInput): Promise<void> {
  return api.enviar<void>(`/soporte/faqs/${id}/voto`, datos);
}
