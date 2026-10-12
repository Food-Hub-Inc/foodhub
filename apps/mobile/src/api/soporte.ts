import type {
  EnviarConsultaInput,
  Faq,
  ManualPublico,
  SolicitarUrlCargaAdjuntoTicketInput,
  UrlDeCarga,
  VotoFaqInput,
} from '@foodhub/shared';
import { api } from '../lib/api';

/** US-AYU-01 · Manual de usuario según el rol autenticado. */
export function listarManual(): Promise<ManualPublico> {
  return api.obtener<ManualPublico>('/soporte/manual');
}

/** US-AYU-02 · FAQs activas del rol autenticado. */
export function listarFaqs(): Promise<Faq[]> {
  return api.obtener<Faq[]>('/soporte/faqs');
}

/** US-AYU-02 · Registra la valoración de una respuesta. */
export function votarFaq(id: string, datos: VotoFaqInput): Promise<void> {
  return api.enviar<void>(`/soporte/faqs/${id}/voto`, datos);
}

/**
 * US-AYU-03 · URL firmada para subir un archivo adjunto a un ticket.
 *
 * Se llama una vez por archivo ANTES de subirlo. La ruta del archivo en
 * Storage la decide el servidor a partir de `req.usuario.id` y la fecha, asi
 * que el cliente no puede manipular donde escribe.
 */
export function solicitarUrlDeCargaDeAdjunto(
  datos: SolicitarUrlCargaAdjuntoTicketInput,
): Promise<UrlDeCarga> {
  return api.enviar<UrlDeCarga>('/almacenamiento/adjunto-ticket', datos);
}

/**
 * US-AYU-03 · Envia una consulta al soporte.
 *
 * `adjuntos` lleva los `AdjuntoTicketInput` ya subidos al bucket: la API
 * recibe la URL publica que devolvio `solicitarUrlDeCargaDeAdjunto` y la
 * persiste en `adjunto_ticket` dentro de la misma transaccion que crea el
 * ticket.
 */
export function enviarConsulta(
  datos: EnviarConsultaInput,
): Promise<{ id: string; mensaje: string }> {
  return api.enviar<{ id: string; mensaje: string }>('/soporte/tickets', datos);
}
