import { and, eq, inArray } from 'drizzle-orm';
import { motivoCancelacion, tipoUsuarioCancelacion } from '@foodhub/db';
import type {
  MotivoCancelacionRapido,
  TerminosVigentesParaAceptar,
  TipoUsuarioCancelacion,
} from '@foodhub/shared';
import { db } from '../../lib/db.js';
import { obtenerVersionVigente } from '../configuracion/terminos.service.js';

/**
 * Rutas de solo lectura de tablas de referencia que otros modulos consumen.
 * Ver `catalogo.router.ts` para el porque vive separado de Configuracion.
 */

/**
 * US-CFG-02, RF056 (consumo) - Motivos habilitados que aplican al rol que
 * cancela: los propios de ese rol y los de aplicabilidad "AMBOS".
 */
export async function listarMotivosCancelacionRapidos(
  rol: Extract<TipoUsuarioCancelacion, 'COCINERO' | 'CLIENTE'>,
): Promise<MotivoCancelacionRapido[]> {
  const tiposAplicables = await db
    .select({ id: tipoUsuarioCancelacion.id })
    .from(tipoUsuarioCancelacion)
    .where(
      inArray(tipoUsuarioCancelacion.nombreTipoUsuarioCancelacion, [
        rol,
        'AMBOS',
      ]),
    );
  const idsTipo = tiposAplicables.map((fila) => fila.id);

  return db
    .select({ id: motivoCancelacion.id, nombre: motivoCancelacion.nombre })
    .from(motivoCancelacion)
    .where(
      and(
        inArray(motivoCancelacion.tipoUsuarioCancelacionId, idsTipo),
        eq(motivoCancelacion.activo, true),
      ),
    )
    .orderBy(motivoCancelacion.nombre);
}

/**
 * RF058 (consumo) - Los dos documentos vigentes juntos, para la pantalla de
 * re-aceptación obligatoria de la app móvil (US-CFG-04). Reusa la lectura
 * del módulo de Configuración en lugar de repetirla.
 */
export async function obtenerTerminosVigentesParaAceptar(): Promise<TerminosVigentesParaAceptar> {
  const [terminos, privacidad] = await Promise.all([
    obtenerVersionVigente('TERMINOS'),
    obtenerVersionVigente('PRIVACIDAD'),
  ]);

  if (!terminos || !privacidad) {
    throw new Error(
      'Todavía no hay una versión vigente de términos y/o de política de privacidad.',
    );
  }

  return {
    terminos: {
      contenidoHtml: terminos.contenidoHtml,
      numeroVersion: terminos.numeroVersion,
    },
    privacidad: {
      contenidoHtml: privacidad.contenidoHtml,
      numeroVersion: privacidad.numeroVersion,
    },
  };
}
