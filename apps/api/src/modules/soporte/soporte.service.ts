import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { faq, rolDestino } from '@foodhub/db';
import type { Faq, TipoUsuario } from '@foodhub/shared';
import { db } from '../../lib/db.js';
import {
  noAutorizado,
  noEncontrado,
} from '../../middleware/error.middleware.js';

type RolFaq = Exclude<TipoUsuario, 'ADMINISTRADOR'>;

/** US-AYU-02 · Preguntas activas correspondientes al rol autenticado. */
export async function listarFaqPorRol(rol: RolFaq): Promise<Faq[]> {
  return db
    .select({
      id: faq.id,
      pregunta: faq.pregunta,
      respuesta: faq.respuesta,
      categoria: faq.categoria,
      votosUtil: faq.votosUtil,
      votosNoUtil: faq.votosNoUtil,
    })
    .from(faq)
    .innerJoin(rolDestino, eq(faq.rolDestinoId, rolDestino.id))
    .where(and(eq(rolDestino.nombre, rol), eq(faq.activo, true)))
    .orderBy(asc(faq.categoria), desc(faq.votosUtil), asc(faq.pregunta));
}

/**
 * US-AYU-02 · Registra un voto de utilidad de forma atómica.
 *
 * El modelo V5 conserva contadores en FAQ y no una fila por usuario: la app
 * evita el doble voto durante la sesión, mientras la base incrementa el
 * contador sin perder votos concurrentes.
 */
export async function registrarVotoFaq(
  id: string,
  util: boolean,
  rol: RolFaq,
): Promise<void> {
  const faqVisible = await db
    .select({ id: faq.id })
    .from(faq)
    .innerJoin(rolDestino, eq(faq.rolDestinoId, rolDestino.id))
    .where(
      and(eq(faq.id, id), eq(faq.activo, true), eq(rolDestino.nombre, rol)),
    )
    .limit(1);

  if (faqVisible.length === 0) throw noEncontrado('la pregunta frecuente');

  const resultado = await db
    .update(faq)
    .set(
      util
        ? { votosUtil: sql<number>`${faq.votosUtil} + 1` }
        : { votosNoUtil: sql<number>`${faq.votosNoUtil} + 1` },
    )
    .where(and(eq(faq.id, id), eq(faq.activo, true)))
    .returning({ id: faq.id });

  if (resultado.length === 0) throw noEncontrado('la pregunta frecuente');
}

/** Evita que una llamada futura al servicio omita la guarda de rol. */
export function validarRolFaq(rol: TipoUsuario): asserts rol is RolFaq {
  if (rol === 'ADMINISTRADOR') throw noAutorizado();
}
