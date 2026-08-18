import { z } from 'zod';

/** Pregunta frecuente activa que consume la app móvil. */
export const faqSchema = z.object({
  id: z.uuid(),
  pregunta: z.string(),
  respuesta: z.string(),
  categoria: z.string().nullable(),
  votosUtil: z.number().int().nonnegative(),
  votosNoUtil: z.number().int().nonnegative(),
});

export type Faq = z.infer<typeof faqSchema>;

/** Voto de utilidad de una respuesta frecuente. */
export const votoFaqInputSchema = z.object({
  util: z.boolean(),
});

export type VotoFaqInput = z.infer<typeof votoFaqInputSchema>;
