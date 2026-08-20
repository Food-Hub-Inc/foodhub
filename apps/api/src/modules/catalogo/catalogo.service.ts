import { and, asc, eq, inArray } from 'drizzle-orm';
import {
  categoria,
  motivoCancelacion,
  tipoUsuarioCancelacion,
} from '@foodhub/db';
import type {
  CategoriaResumen,
  MotivoCancelacionRapido,
  TerminosVigentesParaAceptar,
  TipoUsuarioCancelacion,
} from '@foodhub/shared';
import { db } from '../../lib/db.js';
import { obtenerVersionVigente } from '../configuracion/terminos.service.js';

/**
 * Lectura de tablas de referencia que otros modulos consumen.
 * Ver `catalogo.router.ts` para el porque vive separado de Configuracion y
 * de Publicaciones.
 */

/**
 * US-PUB-01 - Categorias activas, para el desplegable del formulario.
 *
 * Sin paginacion: es una tabla de referencia chica (el administrador la
 * gestiona a mano desde el panel), no un listado de negocio que crezca sin
 * límite como `publicacion` o `pedido`.
 */
export async function listarCategoriasActivas(): Promise<CategoriaResumen[]> {
  return db
    .select({
      id: categoria.id,
      nombre: categoria.nombre,
      imagenPredeterminadaUrl: categoria.imagenPredeterminadaUrl,
    })
    .from(categoria)
    .where(eq(categoria.activo, true))
    .orderBy(asc(categoria.nombre));
}

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
 * US-CFG-02, RF056 (consumo) - El motivo elegido existe, esta habilitado y
 * aplica al rol de quien lo eligio.
 *
 * Lo usa el modulo de Pedidos antes de rechazar (US-PED-04) o cancelar
 * (US-PED-09). Sin esta verificacion, un cliente podria cancelar con el motivo
 * "No tengo ingredientes" -pensado para el cocinero- mandando su id a mano, y el
 * historial del pedido quedaria diciendo algo que nunca paso.
 *
 * Reusa `listarMotivosCancelacionRapidos` en lugar de repetir el join con
 * `tipo_usuario_cancelacion`: la lista es corta -son datos de referencia que el
 * administrador carga a mano- y asi la regla de aplicabilidad queda escrita una
 * sola vez.
 */
export async function motivoCancelacionAplicable(
  rol: Extract<TipoUsuarioCancelacion, 'COCINERO' | 'CLIENTE'>,
  motivoId: string,
): Promise<boolean> {
  const aplicables = await listarMotivosCancelacionRapidos(rol);
  return aplicables.some((motivo) => motivo.id === motivoId);
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
