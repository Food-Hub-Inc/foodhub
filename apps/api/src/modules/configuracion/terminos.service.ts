import { and, desc, eq, inArray, max, sql } from 'drizzle-orm';
import { usuario, versionTerminos } from '@foodhub/db';
import sanitizeHtml from 'sanitize-html';
import type {
  BorradorTerminos,
  EstadoTerminos,
  HistorialTerminos,
  TipoVersionTerminos,
  VersionCompleta,
  VersionHistorial,
  VersionVigenteTerminos,
} from '@foodhub/shared';
import { db } from '../../lib/db.js';
import { noEncontrado } from '../../middleware/error.middleware.js';
import { registrarOperacion } from '../auditoria/auditoria.service.js';

/**
 * Modulo de Configuracion y parametros — términos y condiciones / política
 * de privacidad (US-CFG-04, RF058, PAN-ADM-04).
 *
 * Tres estados de `version_terminos.estado_version_terminos` y lo que
 * significa cada uno para este servicio:
 *
 *   BORRADOR   a lo sumo una fila por (tipo, admin_autor_id). `numero_version`
 *              vale 0: todavia no es una version real, es un numero
 *              provisorio que nadie lee.
 *   VIGENTE    a lo sumo una fila por tipo. Es la que ve el usuario final.
 *   ARCHIVADA  historial de solo lectura.
 *
 * Publicar consume el borrador propio si existe (lo convierte en la version
 * vigente nueva) en lugar de insertar una fila aparte: asi el contenido que
 * el administrador estaba editando es exactamente el que se publica, sin una
 * copia intermedia que pueda desincronizarse.
 */

/**
 * Numero provisorio de los borradores. No es una version real — se
 * reemplaza por el numero correlativo verdadero recien al publicar.
 */
const NUMERO_VERSION_BORRADOR = 0;

const OPCIONES_SANITIZACION: sanitizeHtml.IOptions = {
  allowedTags: [
    'p',
    'br',
    'strong',
    'em',
    'u',
    'ul',
    'ol',
    'li',
    'h1',
    'h2',
    'h3',
    'a',
  ],
  allowedAttributes: { a: ['href', 'target', 'rel'] },
  // Cualquier enlace que cargue el administrador se abre en pestaña nueva y
  // sin referrer: el contenido lo va a ver toda la base de usuarios.
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', {
      rel: 'noopener noreferrer',
      target: '_blank',
    }),
  },
};

/** RF058 no exige sanitizar, pero el contenido lo redacta un administrador y lo ve toda la plataforma: no se confía ciegamente en el HTML del editor. */
function sanitizar(html: string): string {
  return sanitizeHtml(html, OPCIONES_SANITIZACION);
}

interface FilaConAutor {
  autorId: string | null;
  autorNombre: string | null;
  autorApellido: string | null;
}

function aAutor(fila: FilaConAutor): VersionVigenteTerminos['adminAutor'] {
  return fila.autorId
    ? {
        id: fila.autorId,
        nombre: fila.autorNombre ?? '',
        apellido: fila.autorApellido ?? '',
      }
    : null;
}

function aVersionVigente(
  fila: FilaConAutor & {
    id: string;
    numeroVersion: number;
    contenidoHtml: string;
    fechaPublicacion: Date;
  },
): VersionVigenteTerminos {
  return {
    id: fila.id,
    numeroVersion: fila.numeroVersion,
    contenidoHtml: fila.contenidoHtml,
    fechaPublicacion: fila.fechaPublicacion.toISOString(),
    adminAutor: aAutor(fila),
  };
}

function aVersionHistorial(
  fila: FilaConAutor & {
    id: string;
    numeroVersion: number;
    fechaPublicacion: Date;
  },
): VersionHistorial {
  return {
    id: fila.id,
    numeroVersion: fila.numeroVersion,
    fechaPublicacion: fila.fechaPublicacion.toISOString(),
    adminAutor: aAutor(fila),
  };
}

/** Version vigente de un tipo, con el nombre de quien la publicó, o `null` si nunca se publicó nada. */
export async function obtenerVersionVigente(
  tipo: TipoVersionTerminos,
): Promise<VersionVigenteTerminos | null> {
  const [fila] = await db
    .select({
      id: versionTerminos.id,
      numeroVersion: versionTerminos.numeroVersion,
      contenidoHtml: versionTerminos.contenidoHtml,
      fechaPublicacion: versionTerminos.fechaPublicacion,
      autorId: usuario.id,
      autorNombre: usuario.nombre,
      autorApellido: usuario.apellido,
    })
    .from(versionTerminos)
    .leftJoin(usuario, eq(usuario.id, versionTerminos.adminAutorId))
    .where(
      and(
        eq(versionTerminos.tipo, tipo),
        eq(versionTerminos.estadoVersionTerminos, 'VIGENTE'),
      ),
    )
    .limit(1);

  return fila ? aVersionVigente(fila) : null;
}

/** US-CFG-04 - Estado de una pestaña: la versión vigente y el borrador propio del administrador que consulta, si tiene uno. */
export async function obtenerEstado(entrada: {
  tipo: TipoVersionTerminos;
  administradorId: string;
}): Promise<EstadoTerminos> {
  const [vigente, [borradorFila]] = await Promise.all([
    obtenerVersionVigente(entrada.tipo),
    db
      .select({
        id: versionTerminos.id,
        contenidoHtml: versionTerminos.contenidoHtml,
      })
      .from(versionTerminos)
      .where(
        and(
          eq(versionTerminos.tipo, entrada.tipo),
          eq(versionTerminos.estadoVersionTerminos, 'BORRADOR'),
          eq(versionTerminos.adminAutorId, entrada.administradorId),
        ),
      )
      .limit(1),
  ]);

  return {
    vigente,
    borrador: borradorFila
      ? { id: borradorFila.id, contenidoHtml: borradorFila.contenidoHtml }
      : null,
  };
}

/** US-CFG-04 - "Ver historial": versiones publicadas alguna vez (vigente + archivadas), sin su contenido. */
export async function listarHistorial(
  tipo: TipoVersionTerminos,
): Promise<HistorialTerminos> {
  const filas = await db
    .select({
      id: versionTerminos.id,
      numeroVersion: versionTerminos.numeroVersion,
      fechaPublicacion: versionTerminos.fechaPublicacion,
      autorId: usuario.id,
      autorNombre: usuario.nombre,
      autorApellido: usuario.apellido,
    })
    .from(versionTerminos)
    .leftJoin(usuario, eq(usuario.id, versionTerminos.adminAutorId))
    .where(
      and(
        eq(versionTerminos.tipo, tipo),
        inArray(versionTerminos.estadoVersionTerminos, [
          'VIGENTE',
          'ARCHIVADA',
        ]),
      ),
    )
    .orderBy(desc(versionTerminos.numeroVersion));

  return filas.map(aVersionHistorial);
}

/** US-CFG-04 - "Ver contenido" de una versión puntual del historial. Solo lectura: nunca se modifica. */
export async function obtenerVersionCompleta(entrada: {
  tipo: TipoVersionTerminos;
  versionId: string;
}): Promise<VersionCompleta> {
  const [fila] = await db
    .select({
      id: versionTerminos.id,
      numeroVersion: versionTerminos.numeroVersion,
      contenidoHtml: versionTerminos.contenidoHtml,
      fechaPublicacion: versionTerminos.fechaPublicacion,
      autorId: usuario.id,
      autorNombre: usuario.nombre,
      autorApellido: usuario.apellido,
    })
    .from(versionTerminos)
    .leftJoin(usuario, eq(usuario.id, versionTerminos.adminAutorId))
    .where(
      and(
        eq(versionTerminos.id, entrada.versionId),
        eq(versionTerminos.tipo, entrada.tipo),
        inArray(versionTerminos.estadoVersionTerminos, [
          'VIGENTE',
          'ARCHIVADA',
        ]),
      ),
    )
    .limit(1);

  if (!fila) throw noEncontrado('la versión');
  return aVersionVigente(fila);
}

/** US-CFG-04 - "Guardar borrador": upsert del borrador propio del administrador para ese tipo. */
export async function guardarBorrador(entrada: {
  tipo: TipoVersionTerminos;
  contenidoHtml: string;
  administradorId: string;
  ipOrigen: string | null;
}): Promise<BorradorTerminos> {
  const contenido = sanitizar(entrada.contenidoHtml);

  const [existente] = await db
    .select({ id: versionTerminos.id })
    .from(versionTerminos)
    .where(
      and(
        eq(versionTerminos.tipo, entrada.tipo),
        eq(versionTerminos.estadoVersionTerminos, 'BORRADOR'),
        eq(versionTerminos.adminAutorId, entrada.administradorId),
      ),
    )
    .limit(1);

  const id = existente
    ? await actualizarBorrador(existente.id, contenido)
    : await crearBorrador(entrada.tipo, contenido, entrada.administradorId);

  void registrarOperacion({
    usuarioId: entrada.administradorId,
    operacion: 'MODIFICACION',
    tipoObjeto: 'version_terminos',
    objetoAfectadoId: id,
    ipOrigen: entrada.ipOrigen,
    datosAdicionales: { tipo: entrada.tipo, accion: 'guardar_borrador' },
  });

  return { id, contenidoHtml: contenido };
}

async function actualizarBorrador(
  id: string,
  contenido: string,
): Promise<string> {
  await db
    .update(versionTerminos)
    .set({ contenidoHtml: contenido })
    .where(eq(versionTerminos.id, id));
  return id;
}

async function crearBorrador(
  tipo: TipoVersionTerminos,
  contenido: string,
  administradorId: string,
): Promise<string> {
  const [insertado] = await db
    .insert(versionTerminos)
    .values({
      tipo,
      contenidoHtml: contenido,
      numeroVersion: NUMERO_VERSION_BORRADOR,
      estadoVersionTerminos: 'BORRADOR',
      adminAutorId: administradorId,
    })
    .returning({ id: versionTerminos.id });
  if (!insertado) throw new Error('el alta del borrador no devolvió fila.');
  return insertado.id;
}

/**
 * US-CFG-04 - "Publicar nueva versión": archiva la vigente actual, calcula
 * el próximo número correlativo y promueve el borrador propio a vigente (o
 * inserta una fila nueva si el administrador nunca guardó un borrador).
 */
export async function publicarVersion(entrada: {
  tipo: TipoVersionTerminos;
  contenidoHtml: string;
  administradorId: string;
  ipOrigen: string | null;
}): Promise<VersionVigenteTerminos> {
  const contenido = sanitizar(entrada.contenidoHtml);

  const idPublicada = await db.transaction(async (tx) => {
    await tx
      .update(versionTerminos)
      .set({ estadoVersionTerminos: 'ARCHIVADA' })
      .where(
        and(
          eq(versionTerminos.tipo, entrada.tipo),
          eq(versionTerminos.estadoVersionTerminos, 'VIGENTE'),
        ),
      );

    const filasMaximo = await tx
      .select({ maximo: max(versionTerminos.numeroVersion) })
      .from(versionTerminos)
      .where(eq(versionTerminos.tipo, entrada.tipo));
    const siguienteNumero = (filasMaximo[0]?.maximo ?? 0) + 1;

    const [borradorPropio] = await tx
      .select({ id: versionTerminos.id })
      .from(versionTerminos)
      .where(
        and(
          eq(versionTerminos.tipo, entrada.tipo),
          eq(versionTerminos.estadoVersionTerminos, 'BORRADOR'),
          eq(versionTerminos.adminAutorId, entrada.administradorId),
        ),
      )
      .limit(1);

    if (borradorPropio) {
      await tx
        .update(versionTerminos)
        .set({
          contenidoHtml: contenido,
          numeroVersion: siguienteNumero,
          estadoVersionTerminos: 'VIGENTE',
          fechaPublicacion: sql`now()`,
          adminAutorId: entrada.administradorId,
        })
        .where(eq(versionTerminos.id, borradorPropio.id));
      return borradorPropio.id;
    }

    const [insertada] = await tx
      .insert(versionTerminos)
      .values({
        tipo: entrada.tipo,
        contenidoHtml: contenido,
        numeroVersion: siguienteNumero,
        estadoVersionTerminos: 'VIGENTE',
        adminAutorId: entrada.administradorId,
      })
      .returning({ id: versionTerminos.id });
    if (!insertada) throw new Error('la publicación no devolvió fila.');
    return insertada.id;
  });

  void registrarOperacion({
    usuarioId: entrada.administradorId,
    operacion: 'ALTA',
    tipoObjeto: 'version_terminos',
    objetoAfectadoId: idPublicada,
    ipOrigen: entrada.ipOrigen,
    datosAdicionales: { tipo: entrada.tipo, accion: 'publicar' },
  });

  const vigente = await obtenerVersionVigente(entrada.tipo);
  if (!vigente)
    throw new Error('la version recien publicada no aparece como vigente.');
  return vigente;
}
