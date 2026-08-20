import { and, asc, eq, inArray } from 'drizzle-orm';
import {
  categoria,
  configuracionSistema,
  motivoCancelacion,
  tipoUsuarioCancelacion,
} from '@foodhub/db';
import {
  CLAVE_PARAMETRO,
  informacionDeContactoSchema,
  type CategoriaResumen,
  type DocumentoLegalVigente,
  type InformacionDeContacto,
  type MotivoCancelacionRapido,
  type TerminosVigentesParaAceptar,
  type TipoUsuarioCancelacion,
  type TipoVersionTerminos,
  type VersionVigenteTerminos,
} from '@foodhub/shared';
import { db } from '../../lib/db.js';
import { armarPdfDeDocumentoLegal } from '../../lib/pdf.js';
import { noEncontrado } from '../../middleware/error.middleware.js';
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

/**
 * US-AYU-04 - Convierte la fila vigente de un documento legal al shape que
 * consume PAN-AYU-04.
 *
 * Omite el `id` del adminAutor porque es dato interno (la pantalla solo
 * muestra nombre y apellido). Si no hay version vigente lanza 404 con
 * `noEncontrado` para que la app pueda mostrar "Aun no hay una version
 * vigente" en lugar de un error 500.
 */
function aDocumentoLegalVigente(
  vigente: VersionVigenteTerminos,
): DocumentoLegalVigente {
  return {
    id: vigente.id,
    numeroVersion: vigente.numeroVersion,
    contenidoHtml: vigente.contenidoHtml,
    fechaPublicacion: vigente.fechaPublicacion,
    adminAutor: vigente.adminAutor
      ? {
          nombre: vigente.adminAutor.nombre,
          apellido: vigente.adminAutor.apellido,
        }
      : null,
  };
}

/**
 * US-AYU-04 - Documento legal (terminos o politica de privacidad) vigente
 * listo para PAN-AYU-04: trae `fechaPublicacion` para la leyenda del
 * encabezado y `adminAutor` (sin `id`, ver `aDocumentoLegalVigente`).
 *
 * Reusa `obtenerVersionVigente` del modulo de Configuracion, que es quien
 * mantiene la logica del join con `usuario` y el filtro por estado VIGENTE.
 */
export async function obtenerDocumentoLegalVigente(
  tipo: TipoVersionTerminos,
): Promise<DocumentoLegalVigente> {
  const vigente = await obtenerVersionVigente(tipo);
  if (!vigente) {
    throw noEncontrado(
      tipo === 'TERMINOS'
        ? 'una version vigente de los terminos y condiciones'
        : 'una version vigente de la politica de privacidad',
    );
  }
  return aDocumentoLegalVigente(vigente);
}

/**
 * US-AYU-04 - Datos de contacto de la plataforma para PAN-AYU-04
 * ("Contacto del soporte"): correo electronico y horario de atencion que el
 * administrador configura desde PAN-ADM-04.
 *
 * Lee unicamente las dos claves que necesita, sin pasar por
 * `obtenerParametrosSistema`: ese servicio devuelve los once parametros y
 * requiere estar autenticado; aca queremos solo lectura publica con la menor
 * cantidad de datos.
 */
export async function obtenerInformacionDeContacto(): Promise<InformacionDeContacto> {
  const filas = await db
    .select({
      clave: configuracionSistema.clave,
      valor: configuracionSistema.valor,
    })
    .from(configuracionSistema)
    .where(
      inArray(configuracionSistema.clave, [
        CLAVE_PARAMETRO.plataformaCorreoSoporte,
        CLAVE_PARAMETRO.plataformaHorarioAtencionSoporte,
      ]),
    );

  const mapa = new Map(filas.map((fila) => [fila.clave, fila.valor]));
  const correo = mapa.get(CLAVE_PARAMETRO.plataformaCorreoSoporte);
  const horario = mapa.get(CLAVE_PARAMETRO.plataformaHorarioAtencionSoporte);

  if (!correo || !horario) {
    throw new Error(
      `Falta sembrar configuracion_sistema."${
        correo
          ? CLAVE_PARAMETRO.plataformaHorarioAtencionSoporte
          : CLAVE_PARAMETRO.plataformaCorreoSoporte
      }". Corré pnpm db:migrate.`,
    );
  }

  return informacionDeContactoSchema.parse({
    correo,
    horarioAtencion: horario,
  });
}

/**
 * US-AYU-04, CA5 - Genera el PDF en memoria de un documento legal vigente
 * para el boton "Descargar PDF" de PAN-AYU-04.
 *
 * Reusa `obtenerVersionVigente` por la misma razon que
 * `obtenerDocumentoLegalVigente`: la lectura del documento es la misma, lo
 * unico que cambia es como se serializa (JSON vs PDF).
 *
 * Devuelve ademas el `Content-Disposition` sugerido y el titulo legible para
 * que el router pueda armar la respuesta sin repetir logica de filenames.
 */
export async function generarPdfDeDocumentoLegal(
  tipo: TipoVersionTerminos,
): Promise<{
  buffer: Buffer;
  nombreArchivo: string;
  titulo: string;
}> {
  const vigente = await obtenerVersionVigente(tipo);
  if (!vigente) {
    throw noEncontrado(
      tipo === 'TERMINOS'
        ? 'una version vigente de los terminos y condiciones'
        : 'una version vigente de la politica de privacidad',
    );
  }

  const titulo =
    tipo === 'TERMINOS'
      ? 'Términos y condiciones de FoodHub'
      : 'Política de privacidad de FoodHub';

  const buffer = await armarPdfDeDocumentoLegal({
    titulo,
    fechaPublicacion: new Date(vigente.fechaPublicacion),
    contenidoHtml: vigente.contenidoHtml,
  });

  const version = vigente.numeroVersion;
  const baseNombre =
    tipo === 'TERMINOS' ? 'terminos-foodhub' : 'privacidad-foodhub';
  const nombreArchivo = `${baseNombre}-v${String(version)}.pdf`;

  return { buffer, nombreArchivo, titulo };
}
