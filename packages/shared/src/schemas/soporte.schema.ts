import { z } from 'zod';
import {
  ETIQUETAS_TIPO_CONSULTA,
  MAXIMO_ADJUNTOS_POR_CONSULTA,
  MAXIMO_ADJUNTO_TICKET_BYTES,
} from '../constants/soporte.js';

/**
 * Contratos del modulo de Ayuda y soporte (US-AYU-03).
 *
 * Tres schemas conviven aca y se usan en los dos extremos del POST
 * `/soporte/tickets`:
 *
 *   - `solicitarUrlCargaAdjuntoTicketSchema`  lo manda el cliente antes de
 *     subir el archivo a Storage. La API lo verifica de nuevo del lado del
 *     servidor (un cliente deshonesto puede saltarse el limite del cliente):
 *     un rechazo aca ahorra una subida innecesaria.
 *
 *   - `adjuntoTicketInputSchema`  viaja DENTRO del body del POST, una vez
 *     que el archivo ya esta en el bucket. Trae la URL publica y los
 *     metadatos que se persisten en `adjunto_ticket`.
 *
 *   - `enviarConsultaSchema`  es el body del POST. El mensaje de error es
 *     el MISMO que muestra la UI: el server no lo redefine.
 *
 * Las longitudes maximas (100, 1500) y la cantidad de adjuntos (3) salen
 * del criterio de aceptacion de US-AYU-03 y viven en
 * `constants/soporte.ts` para que la API y la UI las lean del mismo lugar.
 *
 * El mensaje de "campo obligatorio" se reusa de `MENSAJES_VALIDACION` via
 * `z.string().min(1, ...)`. No se importa el objeto entero para no crear
 * una dependencia circular con `constants/mensajes.js` (que importa de
 * aca): se mantiene como literal duplicado y la lista de mensajes
 * documenta la unica fuente de verdad.
 */
const MENSAJE_CAMPO_OBLIGATORIO = 'Este campo es obligatorio.';

/** Formatos admitidos por el criterio de aceptacion de US-AYU-03. */
export const FORMATOS_ADJUNTO_TICKET = [
  'image/jpeg',
  'image/png',
  'application/pdf',
] as const;
export type FormatoAdjuntoTicket = (typeof FORMATOS_ADJUNTO_TICKET)[number];

/**
 * Mensaje de error para un adjunto fuera de formato o de tamano.
 * Se declara aca y no en `mensajes.ts` porque US-AYU-03 lo precisa para
 * `zod` en el server (donde todavia no se importan los MENSAJES_AYUDA),
 * y duplicarlo garantiza que el server y el cliente muestren el MISMO
 * texto. El valor es el literal del criterio.
 */
const MENSAJE_ADJUNTO_INVALIDO =
  'El archivo debe ser JPG, PNG o PDF de hasta 5 MB.';

/**
 * Permiso de carga para un adjunto de un ticket.
 *
 * No reutiliza `solicitarUrlCargaSchema`/`urlDeCargaSchema` porque aquel
 * acota los MIME types a imagenes, y US-AYU-03 incluye PDF. Es un criterio
 * propio y por eso schema propio.
 */
export const solicitarUrlCargaAdjuntoTicketSchema = z.object({
  mimeType: z.enum(FORMATOS_ADJUNTO_TICKET, {
    message: MENSAJE_ADJUNTO_INVALIDO,
  }),
  tamano: z
    .number()
    .int()
    .positive(MENSAJE_ADJUNTO_INVALIDO)
    .max(MAXIMO_ADJUNTO_TICKET_BYTES, MENSAJE_ADJUNTO_INVALIDO),
});

export type SolicitarUrlCargaAdjuntoTicketInput = z.infer<
  typeof solicitarUrlCargaAdjuntoTicketSchema
>;

/**
 * Un adjunto ya subido, listo para referenciar en `adjunto_ticket`.
 *
 * `url` y `urlPublica` se completan en el cliente a partir de la respuesta
 * de `POST /almacenamiento/adjunto-ticket`; la API no las reconstruye.
 */
export const adjuntoTicketInputSchema = z.object({
  url: z.url(),
  urlPublica: z.url(),
  nombreArchivo: z.string().min(1).max(255),
  tipoMime: z.enum(FORMATOS_ADJUNTO_TICKET),
  tamanoBytes: z
    .number()
    .int()
    .positive()
    .max(MAXIMO_ADJUNTO_TICKET_BYTES, MENSAJE_ADJUNTO_INVALIDO),
});

export type AdjuntoTicketInput = z.infer<typeof adjuntoTicketInputSchema>;

/**
 * Body del POST `/soporte/tickets`.
 *
 * Los tres campos de texto son obligatorios y el cliente los valida con el
 * MISMO schema, asi que si llega un campo vacio o mas largo de lo permitido
 * el server responde 400 con `campos[].mensaje` apuntando al campo
 * correspondiente.
 *
 * `adjuntos` admite hasta 3 elementos. La longitud la controla `max`, pero
 * los duplicados y el orden los decide el cliente: la API no los reordena.
 */
export const enviarConsultaSchema = z.object({
  tipoConsultaId: z.uuid({
    message: MENSAJE_CAMPO_OBLIGATORIO,
  }),
  asunto: z
    .string()
    .min(1, MENSAJE_CAMPO_OBLIGATORIO)
    .max(100, 'El asunto no puede tener más de 100 caracteres.'),
  descripcion: z
    .string()
    .min(1, MENSAJE_CAMPO_OBLIGATORIO)
    .max(1500, 'La descripción no puede tener más de 1500 caracteres.'),
  adjuntos: z
    .array(adjuntoTicketInputSchema)
    .max(
      MAXIMO_ADJUNTOS_POR_CONSULTA,
      'Podés adjuntar hasta 3 archivos por consulta.',
    )
    .default([]),
});

export type EnviarConsultaInput = z.infer<typeof enviarConsultaSchema>;

/**
 * Tipo de consulta que el cliente envia en la respuesta del GET.
 *
 * Devuelve `id` (para el POST) y `etiqueta` (la cadena literal del
 * criterio, para el label del desplegable).
 */
export const tipoConsultaSchema = z.object({
  id: z.uuid(),
  nombre: z.string(),
});

export type TipoConsultaCatalogo = z.infer<typeof tipoConsultaSchema>;

/**
 * Re-export de la lista de etiquetas para que la UI pueda importar el
 * shape completo del modulo desde un solo lugar.
 */
export { ETIQUETAS_TIPO_CONSULTA };
